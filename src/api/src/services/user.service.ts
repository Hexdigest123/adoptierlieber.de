import { createUserRepo } from "../repositories/user.repo";
import {
  createUserSchema,
  authenticateSchema,
  deleteUserSchema,
  resetUserSchema as resetPasswordUserSchema,
  updateUserSchema,
  changePasswordSchema,
} from "../lib/zod";
import type { Env } from "../config/env";
import type { AuthResult, PublicUser, User } from "../types";
import { toPublicUser } from "../lib/public-user";
import { createWebauthnRepo } from "../repositories/webauthn.repo";
import {
  effectiveSessionKind,
  hasMfa,
  isMfaRequired,
  putLoginChallenge,
  totpEnabled,
} from "../lib/mfa";
import {
  assertRegistrationAllowed,
  grantSuperAdminIfAllowlisted,
  insertRegisteredUser,
  superAdminAllowlist,
} from "../lib/create-account";
import { geocodeAddress, labelFromCoords, resolveHomePlace } from "../lib/geocode";
import { createShelterMemberRepo } from "../repositories/shelter-member.repo";
import { createShelterRepo } from "../repositories/shelter.repo";
import { createShelterInviteRepo } from "../repositories/shelter-invite.repo";
import { createThreadRepo } from "../repositories/thread.repo";
import { isPlatformAdmin, isSuperAdmin, SHELTER_ROLE } from "../lib/roles";
import {
  deleteAvatar,
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
import { sendMail } from "../lib/mail";
import {
  accountDeletionTemplate,
  passwordChangedTemplate,
  passwordResetTemplate,
} from "../lib/email-templates";
import { verifyEmailSchema } from "../lib/zod";

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

async function resolveHomeUpdate(data: HomePatch): Promise<HomeValues> {
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
    const hit = await resolveHomePlace(query, lat ?? undefined, lng ?? undefined);
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

  const named = await labelFromCoords(lat, lng);
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
  const inviteRepo = createShelterInviteRepo(env);
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

  async function attachPendingInvites(userId: string, email: string) {
    const pending = await inviteRepo.listPendingByEmail(email.toLowerCase());
    for (const invite of pending) {
      if (invite.expiresAt.getTime() < Date.now()) continue;
      const already = await memberRepo.findMembership(userId, invite.shelterId);
      if (!already) {
        await memberRepo.create({
          userId,
          shelterId: invite.shelterId,
          role: invite.role,
        });
      }
      await inviteRepo.consume(invite.id);
    }
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

  return {
    async create(
      input: unknown,
      avatarFile: File | null = null,
    ): Promise<{ verificationToken: string; userId: string } | null> {
      const data = createUserSchema.parse(input);
      const parsedAvatar = avatarFile ? await parseAvatarFile(avatarFile) : null;

      await assertRegistrationAllowed(env, {
        name: data.name,
        street: data.street,
        zip: data.zip,
        city: data.city,
      });

      data.password = await hashPassword(data.password);

      const { token, hashedToken } = await generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      let lat = data.lat;
      let lng = data.lng;
      if (lat == null || lng == null) {
        const geo = await geocodeAddress(data.street, data.zip, data.city);
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
        if (await repo.findByEmail(data.email)) {
          throw new HTTPException(409, { message: "email already registered" });
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
      if (!user) {
        return false;
      }
      if (user.emailVerifiedAt) {
        await grantSuperAdminIfAllowlisted(env, user);
        return true;
      }
      if (
        !user.emailVerificationToken ||
        !user.emailVerificationTokenExpiresAt ||
        user.emailVerificationTokenExpiresAt.getTime() < Date.now()
      ) {
        return false;
      }
      if (!tokensEqual(await hashToken(data.token), user.emailVerificationToken)) {
        return false;
      }
      await repo.verifyEmail(user.id);
      const verified = await repo.findById(user.id);
      if (verified) {
        await grantSuperAdminIfAllowlisted(env, verified);
      }
      await attachPendingInvites(user.id, user.email);
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

    async reset(input: unknown): Promise<boolean> {
      const data = resetPasswordUserSchema.parse(input);
      if (!data.email) {
        throw new HTTPException(422, { message: "missing values in the body" });
      }
      const user = await repo.findByEmail(data.email);
      if (!user) {
        await verifyDummyPassword();
        return true;
      }

      if (data.resetToken && data.newPassword) {
        if (await this.comparePasswordResetToken(data.resetToken, user.id)) {
          await repo.unsetPasswordReset(user.id);
          await createSessionService(env).deleteAllWithUserId(user.id);
          const newHashedPassword = await hashPassword(data.newPassword);
          if (!(await repo.updatePassword(user.id, newHashedPassword))) {
            throw new HTTPException(500, { message: "failed to update password" });
          }
          try {
            await sendMail(passwordChangedTemplate({ to: user.email }));
          } catch (e: unknown) {
            console.error(e);
          }
          return true;
        }
      } else {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
        const { token, hashedToken } = await generateToken();

        try {
          await sendMail(passwordResetTemplate({ to: user.email, token }));
        } catch (e: unknown) {
          console.error(e);
          throw new HTTPException(500, { message: "failed to send reset email" });
        }

        if (!(await repo.updateResetToken(user.id, hashedToken, expiresAt))) {
          return false;
        }
      }

      return true;
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
      let preferences = data.preferences;
      if (preferences !== undefined && preferences !== null) {
        const current = await repo.findById(userId);
        preferences = { ...(current?.preferences ?? {}), ...preferences };
      }
      const home = await resolveHomeUpdate(data);
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

    async comparePasswordResetToken(passwordResetToken: string, userId: string) {
      const row = await repo.findById(userId);
      if (!row) {
        throw new HTTPException(404, { message: "user not found" });
      }
      if (
        !row.passwordResetToken ||
        !row.passwordResetTokenExpiresAt ||
        row.passwordResetTokenExpiresAt.getTime() < Date.now()
      ) {
        throw new HTTPException(400, { message: "reset token expired" });
      }

      if (!tokensEqual(await hashToken(passwordResetToken), row.passwordResetToken)) {
        throw new HTTPException(401, { message: "invalid reset token" });
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
        await repo.updatePassword(user.id, await hashPassword(data.password));
      }

      if (totpEnabled(granted)) {
        const mfa_token = await putLoginChallenge(env, granted.id);
        return { mfa_required: true, mfa_token };
      }

      const passkeyCount = (await createWebauthnRepo(env).countByUserId(granted.id))?.n ?? 0;
      const kind = hasMfa(granted, passkeyCount) || !isMfaRequired(granted, env) ? "full" : "setup";
      return createSessionService(env).create({ userId: granted.id, kind }, userAgent);
    },

    async logout(sessionToken: string): Promise<void> {
      await createSessionService(env).deleteWithSessionToken(sessionToken);
    },
    async logoutAll(userId: string): Promise<void> {
      await createSessionService(env).deleteAllWithUserId(userId);
    },
  };
}
