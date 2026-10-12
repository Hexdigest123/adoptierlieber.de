import { createUserRepo } from "../repositories/user.repo";
import {
  createUserSchema,
  authenticateSchema,
  deleteUserSchema,
  resetUserSchema as resetPasswordUserSchema,
  updateUserSchema,
  changePasswordSchema,
} from "../lib/zod";
import { getDb, type Env } from "../config/env";
import type { AuthResult, PublicUser, User } from "../types";
import { toPublicUser } from "../lib/public-user";
import { createWebauthnRepo } from "../repositories/webauthn.repo";
import { effectiveSessionKind, isMfaRequired, putLoginChallenge, totpEnabled } from "../lib/mfa";
import {
  assertRegistrationAllowed,
  grantSuperAdminIfAllowlisted,
  insertRegisteredUser,
  superAdminAllowlist,
} from "../lib/create-account";
import {
  GeocodeUnavailableError,
  geocodeAddress,
  labelFromCoords,
  resolveHomePlace,
} from "../lib/geocode";
import { createShelterMemberRepo } from "../repositories/shelter-member.repo";
import { createShelterRepo } from "../repositories/shelter.repo";
import { createThreadRepo } from "../repositories/thread.repo";
import {
  isBreakGlassEmail,
  isPlatformAdmin,
  isSuperAdmin,
  passwordSetAfterVerification,
  PLATFORM_ROLE,
  SHELTER_ROLE,
} from "../lib/roles";
import { banFingerprint } from "../lib/ban";
import { createBanRepo } from "../repositories/ban.repo";
import { takeMailSlot } from "../lib/mail-throttle";
import {
  deleteAvatar,
  deleteShelterLogo,
  getAvatarObject,
  parseAvatarFile,
  putAvatar,
} from "../lib/avatar";
import {
  generateToken,
  hashPassword,
  verifyPassword,
  hashToken,
  verifyDummyPassword,
  tokensEqual,
  passwordNeedsRehash,
} from "../lib/hashing";
import { HTTPException } from "hono/http-exception";
import { createSessionService } from "./session.service";
import { recordLogin } from "./stats.service";
import { sendMail } from "../lib/mail";
import {
  accountDeletionTemplate,
  passwordChangedTemplate,
  passwordResetTemplate,
} from "../lib/email-templates";
import { verifyEmailSchema } from "../lib/zod";

/** Hands mail to waitUntil so responses do not wait on (or reveal) SMTP. */
type Defer = (task: Promise<unknown>) => void;

const RESET_TTL_MS = 60 * 60 * 1000;
// A reset link younger than this is kept, so repeat requests cannot kill it.
const RESET_REUSE_MS = 15 * 60 * 1000;
const UNVERIFIED_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type HomePatch = {
  home_query?: string | null;
  home_lat?: number | null;
  home_lng?: number | null;
  location_precision?: "place" | "gps" | null;
};

type HomeValues = {
  homeQuery?: string | null;
  homeLabel?: string | null;
  homeCountry?: string | null;
  homeLat?: number | null;
  homeLng?: number | null;
  locationPrecision?: "place" | "gps" | null;
};

/** userId puts the lookup under the per-user geocoding allowance (see lib/geocode.ts). */
async function resolveHomeUpdate(env: Env, userId: string, data: HomePatch): Promise<HomeValues> {
  const touching =
    data.home_query !== undefined ||
    data.home_lat !== undefined ||
    data.home_lng !== undefined ||
    data.location_precision !== undefined;
  if (!touching) return {};

  const query = data.home_query ?? null;
  const lat = data.home_lat ?? null;
  const lng = data.home_lng ?? null;

  if (!query && lat == null && lng == null) {
    return {
      homeQuery: null,
      homeLabel: null,
      homeCountry: null,
      homeLat: null,
      homeLng: null,
      locationPrecision: null,
    };
  }

  if (query) {
    let hit: Awaited<ReturnType<typeof resolveHomePlace>>;
    try {
      hit = await resolveHomePlace(env, query, lat ?? undefined, lng ?? undefined, userId);
    } catch (err) {
      if (!(err instanceof GeocodeUnavailableError)) throw err;
      // Geocoder down, out of budget or this user's allowance spent: keep the typed place
      // without coordinates rather than block the user; the daily backfill resolves it.
      return {
        homeQuery: query,
        homeLabel: query,
        homeCountry: null,
        homeLat: null,
        homeLng: null,
        locationPrecision: "place",
      };
    }
    if (!hit) {
      throw new HTTPException(400, { message: "unknown place" });
    }
    return {
      homeQuery: query,
      homeLabel: hit.label,
      homeCountry: hit.country,
      homeLat: hit.lat,
      homeLng: hit.lng,
      locationPrecision: "place",
    };
  }

  if (lat == null || lng == null) {
    throw new HTTPException(400, { message: "unknown place" });
  }

  const named = await labelFromCoords(env, lat, lng, userId);
  return {
    homeQuery: null,
    homeLabel: named?.label ?? null,
    homeCountry: named?.country ?? null,
    homeLat: lat,
    homeLng: lng,
    locationPrecision: "gps",
  };
}

export function createUserService(env: Env) {
  const repo = createUserRepo(env);
  const memberRepo = createShelterMemberRepo(env);
  const shelterRepo = createShelterRepo(env);
  const threadRepo = createThreadRepo(env);

  async function canViewAvatar(viewerId: string, targetId: string): Promise<boolean> {
    if (viewerId === targetId) return true;
    const viewer = await repo.findById(viewerId);
    if (!viewer) return false;
    if (isPlatformAdmin(viewer, superAdminAllowlist(env))) return true;

    const [viewerMemberships, targetMemberships] = await Promise.all([
      memberRepo.listByUser(viewerId),
      memberRepo.listByUser(targetId),
    ]);
    const viewerShelters = new Set(viewerMemberships.map((row) => row.shelterId));
    if (targetMemberships.some((row) => viewerShelters.has(row.shelterId))) {
      return true;
    }

    for (const membership of viewerMemberships) {
      const rows = await threadRepo.listByShelterAdopter(membership.shelterId, targetId);
      if (rows.length) return true;
    }

    const adopterThreads = await threadRepo.listByAdopter(viewerId);
    for (const thread of adopterThreads) {
      const staff = await memberRepo.findMembership(targetId, thread.shelterId);
      if (staff) return true;
    }
    return false;
  }

  async function membershipsFor(userId: string) {
    const rows = await memberRepo.listByUser(userId);
    const out = [];
    for (const row of rows) {
      const shelter = await shelterRepo.findById(row.shelterId);
      if (!shelter) continue;
      out.push({
        shelter_id: shelter.id,
        org_name: shelter.orgName,
        role: row.role,
        verification_status: shelter.verificationStatus,
      });
    }
    return out;
  }

  async function assertNotLastOwner(userId: string) {
    const memberships = await memberRepo.listByUser(userId);
    for (const membership of memberships) {
      if (membership.role !== SHELTER_ROLE.OWNER) continue;
      const peers = await memberRepo.listByShelter(membership.shelterId);
      const owners = peers.filter((peer) => peer.role === SHELTER_ROLE.OWNER);
      if (owners.length <= 1) {
        throw new HTTPException(409, { message: "transfer ownership first" });
      }
    }
  }

  /** Allowlisted but not yet break-glass: only a reset link may set its password. */
  function breakGlassPending(user: User): boolean {
    return (
      user.platformRole !== PLATFORM_ROLE.SUPER_ADMIN &&
      isBreakGlassEmail(user.email, superAdminAllowlist(env)) &&
      !passwordSetAfterVerification(user)
    );
  }

  async function dropAllFactors(userId: string) {
    await repo.clearTotp(userId);
    const webauthn = createWebauthnRepo(env);
    for (const row of await webauthn.listByUserId(userId)) {
      await webauthn.delete(row.id);
    }
  }

  async function requestReset(email: string, defer: Defer): Promise<void> {
    // Throttle every address, known or not, so both paths cost the same.
    const slot = await takeMailSlot(env, "reset", email, { limit: 3, windowSeconds: 60 * 60 });
    const user = await repo.findByEmail(email);
    if (!user || !slot) return;
    const expiresAt = user.passwordResetTokenExpiresAt?.getTime() ?? 0;
    if (user.passwordResetToken && expiresAt - Date.now() > RESET_TTL_MS - RESET_REUSE_MS) return;
    const { token, hashedToken } = await generateToken();
    if (!(await repo.updateResetToken(user.id, hashedToken, new Date(Date.now() + RESET_TTL_MS)))) {
      return;
    }
    defer(sendMail(passwordResetTemplate({ to: user.email, token })).catch(console.error));
  }

  async function completeReset(
    email: string,
    resetToken: string,
    newPassword: string,
    defer: Defer,
  ): Promise<void> {
    const user = await repo.findByEmail(email);
    const hashed = await hashToken(resetToken);
    if (
      !user?.passwordResetToken ||
      !user.passwordResetTokenExpiresAt ||
      user.passwordResetTokenExpiresAt.getTime() < Date.now() ||
      !tokensEqual(hashed, user.passwordResetToken)
    ) {
      throw new HTTPException(400, { message: "invalid reset token" });
    }
    // Factors added before the inbox owner took over a break-glass address may
    // belong to whoever registered it first.
    const squatted = breakGlassPending(user);
    await repo.unsetPasswordReset(user.id);
    await createSessionService(env).deleteAllWithUserId(user.id);
    if (!(await repo.updatePassword(user.id, await hashPassword(newPassword)))) {
      throw new HTTPException(500, { message: "failed to update password" });
    }
    if (squatted) await dropAllFactors(user.id);
    defer(sendMail(passwordChangedTemplate({ to: user.email })).catch(console.error));
  }

  /** Renaming or moving onto a banned name/address fingerprint is refused. */
  async function assertProfileNotBanned(
    current: User,
    data: { name?: string; street?: string; zip?: string; city?: string },
  ) {
    if ([data.name, data.street, data.zip, data.city].every((value) => value === undefined)) return;
    const name = data.name ?? current.name;
    const street = data.street ?? current.street;
    const zip = data.zip ?? current.zip;
    const city = data.city ?? current.city;
    if (!street || !zip || !city) return;
    if (await createBanRepo(env).findByHash(await banFingerprint({ name, street, zip, city }))) {
      throw new HTTPException(409, { message: "update not allowed" });
    }
  }

  return {
    async create(
      input: unknown,
      avatarFile: File | null = null,
    ): Promise<{ verificationToken: string; userId: string } | { existingAccount: true } | null> {
      const data = createUserSchema.parse(input);
      const parsedAvatar = avatarFile ? await parseAvatarFile(avatarFile) : null;

      await assertRegistrationAllowed(env, {
        name: data.name,
        street: data.street,
        zip: data.zip,
        city: data.city,
        email: data.email,
      });

      data.password = await hashPassword(data.password);

      const { token, hashedToken } = await generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      let lat = data.lat;
      let lng = data.lng;
      if (lat == null || lng == null) {
        const geo = await geocodeAddress(env, data.street, data.zip, data.city);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
        }
      }

      let row: User;
      try {
        row = await insertRegisteredUser(env, {
          name: data.name,
          displayName: data.displayName,
          email: data.email,
          password: data.password,
          street: data.street,
          zip: data.zip,
          city: data.city,
          lat,
          lng,
          emailVerificationToken: hashedToken,
          emailVerificationTokenExpiresAt: expiresAt,
        });
      } catch (e: unknown) {
        if (e instanceof HTTPException) throw e;
        // Same 201 as a fresh signup; the route mails the owner instead.
        if (await repo.findByEmail(data.email)) {
          return { existingAccount: true };
        }
        throw e;
      }

      if (!row) {
        return null;
      }

      if (parsedAvatar) {
        try {
          const avatarKey = await putAvatar(env, row.id, parsedAvatar);
          await repo.updateAvatarKey(row.id, avatarKey);
        } catch (e: unknown) {
          console.error(e);
        }
      }

      return { verificationToken: token, userId: row.id };
    },

    async verifyEmail(input: unknown): Promise<boolean> {
      const data = verifyEmailSchema.parse(input);
      const user = await repo.findByEmail(data.email);
      const hashed = await hashToken(data.token);
      // Token first, also for verified accounts: else any token confirms an account.
      if (
        !user?.emailVerificationToken ||
        !user.emailVerificationTokenExpiresAt ||
        user.emailVerificationTokenExpiresAt.getTime() < Date.now() ||
        !tokensEqual(hashed, user.emailVerificationToken)
      ) {
        return false;
      }
      if (user.emailVerifiedAt) {
        return true;
      }
      await repo.verifyEmail(user.id);
      const verified = await repo.findById(user.id);
      if (verified) {
        await grantSuperAdminIfAllowlisted(env, verified);
      }
      // Shelter invites are never joined automatically here: the user accepts
      // them explicitly via the emailed link (POST /shelters/invites/accept).
      return true;
    },

    async delete(input: unknown, sessionToken: string): Promise<boolean> {
      const data = deleteUserSchema.parse(input);
      const session = await createSessionService(env).findByToken(sessionToken);
      const user = await repo.findById(session.userId);
      if (!session || !user) {
        throw new HTTPException(404, { message: "session or user not found" });
      }
      if (isSuperAdmin(user, superAdminAllowlist(env))) {
        throw new HTTPException(409, { message: "cannot delete super-admin" });
      }

      if (data.deletionToken) {
        if (await this.compareDeletionToken(data.deletionToken, session.userId)) {
          await assertNotLastOwner(session.userId);
          await repo.unsetAccountDeletion(session.userId);
          await createSessionService(env).deleteAllWithUserId(session.userId);
          if (user.avatarKey) {
            await deleteAvatar(env, session.userId);
          }
          await repo.delete(session.userId);
        }
      } else {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        const { token, hashedToken } = await generateToken();

        try {
          await sendMail(accountDeletionTemplate({ to: user.email, token }));
        } catch (e: unknown) {
          console.error(e);
          throw new HTTPException(500, { message: "failed to send deletion email" });
        }

        if (!(await repo.updateDeletionToken(session.userId, hashedToken, expiresAt))) {
          return false;
        }
      }

      return true;
    },

    /**
     * One answer whether or not the address has an account; mail goes out via
     * `defer` so SMTP timing and failures stay invisible too.
     */
    async reset(input: unknown, defer: Defer): Promise<void> {
      const data = resetPasswordUserSchema.parse(input);
      if (!data.email) {
        throw new HTTPException(422, { message: "missing values in the body" });
      }
      if (data.resetToken && data.newPassword) {
        await completeReset(data.email, data.resetToken, data.newPassword, defer);
      } else {
        await requestReset(data.email, defer);
      }
    },

    async getById(userId: string, sessionKind: "full" | "setup" = "full"): Promise<PublicUser> {
      const found = await repo.findById(userId);
      if (!found) {
        throw new HTTPException(404, { message: "user not found" });
      }
      const row = await grantSuperAdminIfAllowlisted(env, found);
      const passkeyCount = (await createWebauthnRepo(env).countByUserId(userId))?.n ?? 0;
      return toPublicUser(row, await membershipsFor(userId), superAdminAllowlist(env), {
        totp_enabled: totpEnabled(row),
        passkey_count: passkeyCount,
        mfa_required: isMfaRequired(row, env),
        session_kind: effectiveSessionKind(sessionKind, row, passkeyCount, env),
      });
    },

    async changePassword(userId: string, sessionToken: string, input: unknown): Promise<void> {
      const data = changePasswordSchema.parse(input);
      const user = await repo.findById(userId);
      if (!user) {
        throw new HTTPException(404, { message: "user not found" });
      }

      const valid = await verifyPassword(data.current_password, user.password);
      if (!valid) {
        throw new HTTPException(401, { message: "invalid password" });
      }
      if (breakGlassPending(user)) {
        // A change here would turn a password from before verification into break-glass.
        throw new HTTPException(403, { message: "password reset required" });
      }

      if (!(await repo.updatePassword(user.id, await hashPassword(data.new_password)))) {
        throw new HTTPException(500, { message: "failed to update password" });
      }

      await createSessionService(env).deleteOtherSessions(user.id, sessionToken);

      try {
        await sendMail(passwordChangedTemplate({ to: user.email }));
      } catch (e: unknown) {
        console.error(e);
      }
    },

    async updateProfile(userId: string, input: unknown): Promise<PublicUser> {
      const data = updateUserSchema.parse(input);
      const current = await repo.findById(userId);
      if (!current) {
        throw new HTTPException(404, { message: "user not found" });
      }
      await assertProfileNotBanned(current, data);
      let preferences = data.preferences;
      if (preferences !== undefined && preferences !== null) {
        preferences = { ...(current.preferences ?? {}), ...preferences };
      }
      const home = await resolveHomeUpdate(env, userId, data);
      const values = {
        ...(data.name !== undefined ? { name: data.name } : {}),
        ...(data.displayName !== undefined
          ? { displayName: data.displayName === "" ? null : data.displayName }
          : {}),
        ...(data.street !== undefined ? { street: data.street } : {}),
        ...(data.zip !== undefined ? { zip: data.zip } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.lat !== undefined ? { lat: data.lat } : {}),
        ...(data.lng !== undefined ? { lng: data.lng } : {}),
        ...home,
        ...(data.max_range_km !== undefined ? { maxRangeKm: data.max_range_km } : {}),
        ...(preferences !== undefined ? { preferences } : {}),
        ...(data.taste_weights !== undefined ? { tasteWeights: data.taste_weights } : {}),
      };
      const row = await repo.updateProfile(userId, values);
      if (!row) {
        throw new HTTPException(404, { message: "user not found" });
      }
      return this.getById(userId);
    },

    async putAvatar(userId: string, file: File): Promise<void> {
      const parsed = await parseAvatarFile(file);
      const avatarKey = await putAvatar(env, userId, parsed);
      await repo.updateAvatarKey(userId, avatarKey);
    },

    async deleteAvatar(userId: string): Promise<void> {
      const user = await repo.findById(userId);
      if (!user) {
        throw new HTTPException(404, { message: "user not found" });
      }
      if (!user.avatarKey) {
        throw new HTTPException(404, { message: "avatar not found" });
      }
      await deleteAvatar(env, userId);
      await repo.updateAvatarKey(userId, null);
    },

    async getAvatar(userId: string) {
      const user = await repo.findById(userId);
      if (!user?.avatarKey) {
        return null;
      }
      return getAvatarObject(env, userId);
    },

    async getAvatarForViewer(viewerId: string, targetId: string) {
      if (!(await canViewAvatar(viewerId, targetId))) {
        throw new HTTPException(404, { message: "avatar not found" });
      }
      const user = await repo.findById(targetId);
      if (!user?.avatarKey) {
        return null;
      }
      return getAvatarObject(env, targetId);
    },

    async compareDeletionToken(deletionToken: string, userId: string) {
      const row = await repo.findById(userId);
      if (!row) {
        throw new HTTPException(404, { message: "user not found" });
      }
      if (
        !row.accountDeletionToken ||
        !row.accountDeletionTokenExpiresAt ||
        row.accountDeletionTokenExpiresAt.getTime() < Date.now()
      ) {
        throw new HTTPException(400, { message: "deletion token expired" });
      }

      if (!tokensEqual(await hashToken(deletionToken), row.accountDeletionToken)) {
        throw new HTTPException(401, { message: "invalid deletion token" });
      }

      return true;
    },

    async authenticate(input: unknown, userAgent: string | null): Promise<AuthResult> {
      const data = authenticateSchema.parse(input);
      const user = await repo.findByEmail(data.email);
      if (!user) {
        await verifyDummyPassword(data.password);
        throw new HTTPException(401, { message: "invalid email or password" });
      }

      const valid = await verifyPassword(data.password, user.password);
      if (!valid) {
        throw new HTTPException(401, { message: "invalid email or password" });
      }

      if (!user.emailVerifiedAt || user.suspendedAt) {
        throw new HTTPException(401, { message: "invalid email or password" });
      }
      const granted = await grantSuperAdminIfAllowlisted(env, user);

      if (passwordNeedsRehash(user.password)) {
        await repo.rehashPassword(user.id, await hashPassword(data.password));
      }

      if (totpEnabled(granted)) {
        const mfa_token = await putLoginChallenge(env, granted.id);
        return { mfa_required: true, mfa_token };
      }

      const mfaRequired = isMfaRequired(granted, env);
      const passkeyCount = (await createWebauthnRepo(env).countByUserId(granted.id))?.n ?? 0;
      if (mfaRequired && passkeyCount > 0) {
        // The password is one factor; this account's second one is its passkey,
        // which signs in on its own (POST /api/passkeys/assertions).
        throw new HTTPException(403, { message: "passkey required" });
      }
      const kind = mfaRequired ? "setup" : "full";
      const session = await createSessionService(env).create(
        { userId: granted.id, kind },
        userAgent,
      );
      // a setup session only enrolls MFA, that is no login yet
      if (kind === "full") await recordLogin(env);
      return session;
    },

    /**
     * Cron: delete accounts still unverified after 7 days, with their avatar.
     * A shelter registrant's pending shelter goes too, but only while they are
     * its sole member and it has no animals or threads; anything else (other
     * members, threads, reviews, a role) keeps the account for a human.
     */
    async purgeUnverified(): Promise<number> {
      const cutoff = Math.floor((Date.now() - UNVERIFIED_TTL_MS) / 1000);
      const { results } = await getDb(env)
        .prepare(
          `SELECT id FROM users u
           WHERE u.email_verified_at IS NULL AND u.created_at < ? AND u.platform_role = ?
             AND NOT EXISTS (SELECT 1 FROM threads t WHERE t.adopter_user_id = u.id)
             AND NOT EXISTS (SELECT 1 FROM reviews r WHERE r.user_id = u.id)
           LIMIT 200`,
        )
        .bind(cutoff, PLATFORM_ROLE.USER)
        .all<{ id: string }>();

      let purged = 0;
      for (const { id } of results) {
        const shelters: { id: string; logoKey: string | null }[] = [];
        let keep = false;
        for (const membership of await memberRepo.listByUser(id)) {
          const shelter = await shelterRepo.findById(membership.shelterId);
          const peers = await memberRepo.listByShelter(membership.shelterId);
          const busy = await getDb(env)
            .prepare(
              `SELECT (SELECT count(*) FROM animals WHERE shelter_id = ?1)
                    + (SELECT count(*) FROM threads WHERE shelter_id = ?1) AS n`,
            )
            .bind(membership.shelterId)
            .first<{ n: number }>();
          if (
            !shelter ||
            shelter.verificationStatus !== "pending" ||
            membership.role !== SHELTER_ROLE.OWNER ||
            peers.length !== 1 ||
            Number(busy?.n ?? 0) > 0
          ) {
            keep = true;
            break;
          }
          shelters.push({ id: shelter.id, logoKey: shelter.logoKey });
        }
        if (keep) continue;

        const user = await repo.findById(id);
        if (!user || user.emailVerifiedAt) continue;
        for (const shelter of shelters) {
          if (shelter.logoKey) await deleteShelterLogo(env, shelter.id);
          await shelterRepo.delete(shelter.id);
        }
        if (user.avatarKey) await deleteAvatar(env, user.id);
        await repo.delete(user.id);
        purged += 1;
      }
      return purged;
    },

    async logout(sessionToken: string): Promise<void> {
      await createSessionService(env).deleteWithSessionToken(sessionToken);
    },
    async logoutAll(userId: string): Promise<void> {
      await createSessionService(env).deleteAllWithUserId(userId);
    },
  };
}
