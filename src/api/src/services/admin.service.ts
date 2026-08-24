import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import { banFingerprint } from "../lib/ban";
import {
  assertRegistrationAllowed,
  grantSuperAdminIfAllowlisted,
  insertRegisteredUser,
  superAdminAllowlist,
} from "../lib/create-account";
import { deleteAvatar } from "../lib/avatar";
import {
  adminInviteTemplate,
  shelterApprovedTemplate,
  shelterRejectedTemplate,
} from "../lib/email-templates";
import { generateToken, hashPassword, hashToken } from "../lib/hashing";
import { sendMail } from "../lib/mail";
import { listEnvelope, parseListQuery, type ListEnvelope } from "../lib/pagination";
import {
  effectivePlatformRole,
  isSuperAdmin,
  PLATFORM_ROLE,
  SHELTER_ROLE,
} from "../lib/roles";
import {
  adminBanSchema,
  adminInviteSchema,
  adminNoteSchema,
  adminOrphanTransferSchema,
  adminRejectionSchema,
  banLookupSchema,
  inviteAcceptanceSchema,
  type AuditAction,
} from "../lib/zod";
import { createAdminRepo } from "../repositories/admin.repo";
import { createBanRepo } from "../repositories/ban.repo";
import { createShelterMemberRepo } from "../repositories/shelter-member.repo";
import { createShelterRepo } from "../repositories/shelter.repo";
import { createSessionRepo } from "../repositories/session.repo";
import { createAnimalRepo } from "../repositories/animal.repo";
import { createUserRepo } from "../repositories/user.repo";
import type { User } from "../types";
import { createSessionService } from "./session.service";

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function adminPhotoUrls(animalId: string, photos: string[] | null | undefined): string[] {
  const count = photos?.length ?? 0;
  return Array.from({ length: count }, (_, i) => `/api/admin/animals/${animalId}/photos/${i}`);
}

function adminAnimalCard(row: {
  id: string;
  name: string;
  species: string;
  status: string;
  createdAt?: Date;
  photos: string[] | null;
  ageMonths: number | null;
  ageUnknown: boolean;
  tagline: string | null;
  traits: string[] | null;
  shelterId?: string;
  shelterName?: string;
  city?: string;
}) {
  return {
    id: row.id,
    name: row.name,
    species: row.species,
    status: row.status,
    photos: adminPhotoUrls(row.id, row.photos),
    age_months: row.ageMonths,
    age_unknown: row.ageUnknown,
    tagline: row.tagline,
    traits: row.traits ?? [],
    ...(row.createdAt ? { created_at: row.createdAt.toISOString() } : {}),
    ...(row.shelterId ? { shelter_id: row.shelterId } : {}),
    ...(row.shelterName ? { shelter_name: row.shelterName } : {}),
    ...(row.city ? { city: row.city } : {}),
  };
}

function actorSnapshot(user: User) {
  return { actorId: user.id, actorName: user.name, actorEmail: user.email };
}

function assertCanActOn(actor: User, target: User, allowlist: readonly string[]): void {
  if (isSuperAdmin(target, allowlist)) {
    throw new HTTPException(403, { message: "cannot alter super-admin" });
  }
  if (target.platformRole === PLATFORM_ROLE.ADMIN && !isSuperAdmin(actor, allowlist)) {
    throw new HTTPException(403, { message: "insufficient privilege" });
  }
}

export function createAdminService(env: Env) {
  const adminRepo = createAdminRepo(env);
  const userRepo = createUserRepo(env);
  const shelterRepo = createShelterRepo(env);
  const animalRepo = createAnimalRepo(env);
  const memberRepo = createShelterMemberRepo(env);
  const banRepo = createBanRepo(env);
  const sessionRepo = createSessionRepo(env);

  async function requireActor(actorId: string): Promise<User> {
    const actor = await userRepo.findById(actorId);
    if (!actor) {
      throw new HTTPException(401, { message: "invalid session" });
    }
    return actor;
  }

  async function requireUser(id: string): Promise<User> {
    const user = await userRepo.findById(id);
    if (!user) {
      throw new HTTPException(404, { message: "not found" });
    }
    return user;
  }

  async function audit(
    actor: User,
    action: AuditAction,
    target: { type: string; id: string | null; label: string; reason?: string | null },
  ): Promise<void> {
    await adminRepo.insertAudit({
      action,
      ...actorSnapshot(actor),
      targetType: target.type,
      targetId: target.id,
      targetLabel: target.label,
      reason: target.reason ?? null,
    });
  }

  function listParams(search: URLSearchParams) {
    const page = parseListQuery(search);
    return {
      ...page,
      q: search.get("q")?.trim() || undefined,
      city: search.get("city")?.trim() || undefined,
      status: search.get("status")?.trim() || undefined,
      verified: search.get("verified")?.trim() || undefined,
      verificationStatus: search.get("verification_status")?.trim() || undefined,
      species: search.get("species")?.trim() || undefined,
      action: search.get("action")?.trim() || undefined,
      actorId: search.get("actor_id")?.trim() || undefined,
      from: parseOptionalDate(search.get("from")),
      to: parseOptionalDate(search.get("to")),
      offset: page.offset,
      limit: page.per_page,
    };
  }

  function parseOptionalDate(value: string | null): Date | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }

  return {
    async overview() {
      const [counts, recent] = await Promise.all([
        adminRepo.overview(),
        adminRepo.recentAudit(),
      ]);
      return {
        ...counts,
        recent_audit: recent.map((row) => ({
          id: row.id,
          created_at: row.createdAt.toISOString(),
          action: row.action,
          actor_name: row.actorName,
          target_label: row.targetLabel,
          reason: row.reason,
        })),
      };
    },

    async pendingCount(): Promise<number> {
      const row = await adminRepo.pendingApplicationCount();
      return Number(row?.n ?? 0);
    },

    async listUsers(search: URLSearchParams): Promise<ListEnvelope<Record<string, unknown>>> {
      const query = parseListQuery(search);
      const { items, total } = await adminRepo.listUsers(listParams(search));
      const allowlist = superAdminAllowlist(env);
      return listEnvelope(
        items.map((row) => ({
          id: row.id,
          name: row.name,
          display_name: row.displayName,
          email: row.email,
          has_avatar: Boolean(row.avatarKey),
          city: row.city,
          platform_role: effectivePlatformRole(row, allowlist),
          suspended_at: iso(row.suspendedAt),
          email_verified_at: iso(row.emailVerifiedAt),
          created_at: row.createdAt.toISOString(),
        })),
        total,
        query,
      );
    },

    async getUser(id: string) {
      const user = await requireUser(id);
      const allowlist = superAdminAllowlist(env);
      const [memberships, lastSession] = await Promise.all([
        memberRepo.listByUser(id),
        sessionRepo.latestLastUsed(id),
      ]);
      const shelterIds = memberships.map((m) => m.shelterId);
      const shelters = await Promise.all(shelterIds.map((sid) => shelterRepo.findById(sid)));
      return {
        id: user.id,
        name: user.name,
        display_name: user.displayName,
        email: user.email,
        has_avatar: Boolean(user.avatarKey),
        street: user.street,
        zip: user.zip,
        city: user.city,
        lat: user.lat,
        lng: user.lng,
        platform_role: effectivePlatformRole(user, allowlist),
        suspended_at: iso(user.suspendedAt),
        email_verified_at: iso(user.emailVerifiedAt),
        created_at: user.createdAt.toISOString(),
        last_used_at: iso(lastSession?.lastUsedAt),
        memberships: memberships.flatMap((m, i) => {
          const shelter = shelters[i];
          if (!shelter) return [];
          return [
            {
              shelter_id: shelter.id,
              org_name: shelter.orgName,
              role: m.role,
              verification_status: shelter.verificationStatus,
            },
          ];
        }),
      };
    },

    async suspend(actorId: string, targetId: string): Promise<void> {
      const actor = await requireActor(actorId);
      const target = await requireUser(targetId);
      assertCanActOn(actor, target, superAdminAllowlist(env));
      if (target.suspendedAt) {
        throw new HTTPException(409, { message: "already suspended" });
      }
      await userRepo.setSuspendedAt(target.id, new Date());
      await sessionRepo.deleteAllWithUserId(target.id);
      await audit(actor, "suspend", { type: "user", id: target.id, label: target.email });
    },

    async unsuspend(actorId: string, targetId: string): Promise<void> {
      const actor = await requireActor(actorId);
      const target = await requireUser(targetId);
      assertCanActOn(actor, target, superAdminAllowlist(env));
      if (!target.suspendedAt) {
        throw new HTTPException(409, { message: "not suspended" });
      }
      await userRepo.setSuspendedAt(target.id, null);
      await audit(actor, "unsuspend", { type: "user", id: target.id, label: target.email });
    },

    async deleteUser(actorId: string, targetId: string): Promise<void> {
      const actor = await requireActor(actorId);
      const target = await requireUser(targetId);
      if (isSuperAdmin(target, superAdminAllowlist(env))) {
        throw new HTTPException(409, { message: "cannot delete super-admin" });
      }
      assertCanActOn(actor, target, superAdminAllowlist(env));
      if (target.avatarKey) {
        await deleteAvatar(env, target.id);
      }
      await userRepo.delete(target.id);
      await audit(actor, "delete_user", { type: "user", id: target.id, label: target.email });
    },

    async banUser(actorId: string, targetId: string, input: unknown): Promise<void> {
      const data = adminBanSchema.parse(input);
      const actor = await requireActor(actorId);
      const target = await requireUser(targetId);
      assertCanActOn(actor, target, superAdminAllowlist(env));
      if (!target.street || !target.zip || !target.city) {
        throw new HTTPException(400, { message: "user has no address" });
      }
      const hash = await banFingerprint({
        name: target.name,
        street: target.street,
        zip: target.zip,
        city: target.city,
      });
      await banRepo.insert({ hash, bannedBy: actor.id, reason: data.reason });
      if (target.avatarKey) {
        await deleteAvatar(env, target.id);
      }
      await userRepo.delete(target.id);
      await audit(actor, "ban", {
        type: "user",
        id: target.id,
        label: target.email,
        reason: data.reason,
      });
    },

    async listShelters(search: URLSearchParams): Promise<ListEnvelope<Record<string, unknown>>> {
      const query = parseListQuery(search);
      const { items, total } = await adminRepo.listShelters(listParams(search));
      return listEnvelope(
        items.map((row) => ({
          id: row.id,
          org_name: row.orgName,
          city: row.city,
          zip: row.zip,
          street: row.street,
          website: row.website,
          registration_number: row.registrationNumber,
          verification_status: row.verificationStatus,
          created_at: row.createdAt.toISOString(),
          has_logo: Boolean(row.logoKey),
          owner_id: row.ownerId,
          owner_name: row.ownerName,
          owner_email: row.ownerEmail,
        })),
        total,
        query,
      );
    },

    async getShelter(id: string) {
      const shelter = await shelterRepo.findById(id);
      if (!shelter) {
        throw new HTTPException(404, { message: "not found" });
      }
      const members = await memberRepo.listByShelter(id);
      const users = await Promise.all(members.map((m) => userRepo.findById(m.userId)));
      const animals = await adminRepo.listAnimalsByShelter(id);
      const animalCount = await adminRepo.countAnimalsByShelter(id);
      return {
        id: shelter.id,
        org_name: shelter.orgName,
        street: shelter.street,
        zip: shelter.zip,
        city: shelter.city,
        website: shelter.website,
        registration_number: shelter.registrationNumber,
        description: shelter.description,
        verification_status: shelter.verificationStatus,
        verification_reason: shelter.verificationReason,
        verification_decided_at: iso(shelter.verificationDecidedAt),
        verification_decided_by: shelter.verificationDecidedBy,
        lat: shelter.lat,
        lng: shelter.lng,
        archived_at: iso(shelter.archivedAt),
        created_at: shelter.createdAt.toISOString(),
        animal_count: Number(animalCount?.n ?? 0),
        has_logo: Boolean(shelter.logoKey),
        orphaned: members.every((m) => m.role !== SHELTER_ROLE.OWNER),
        members: members.flatMap((m, i) => {
          const user = users[i];
          if (!user) return [];
          return [
            {
              user_id: user.id,
              name: user.name,
              email: user.email,
              role: m.role,
              has_avatar: Boolean(user.avatarKey),
            },
          ];
        }),
        animals: animals.map((a) => adminAnimalCard(a)),
      };
    },

    async transferOrphan(actorId: string, shelterId: string, input: unknown) {
      const data = adminOrphanTransferSchema.parse(input);
      const actor = await requireActor(actorId);
      const shelter = await shelterRepo.findById(shelterId);
      if (!shelter) {
        throw new HTTPException(404, { message: "not found" });
      }
      const members = await memberRepo.listByShelter(shelterId);
      if (members.some((row) => row.role === SHELTER_ROLE.OWNER)) {
        throw new HTTPException(409, { message: "shelter has owner" });
      }
      const user = await requireUser(data.user_id);
      const existing = members.find((row) => row.userId === user.id);
      if (existing) {
        await memberRepo.updateRole(user.id, shelterId, SHELTER_ROLE.OWNER);
      } else {
        await memberRepo.create({
          userId: user.id,
          shelterId,
          role: SHELTER_ROLE.OWNER,
        });
      }
      if (shelter.archivedAt) {
        await shelterRepo.update(shelterId, { archivedAt: null });
      }
      await audit(actor, "transfer_shelter", {
        type: "shelter",
        id: shelter.id,
        label: shelter.orgName,
        reason: user.email,
      });
      return this.getShelter(shelterId);
    },

    async archiveOrphan(actorId: string, shelterId: string) {
      const actor = await requireActor(actorId);
      const shelter = await shelterRepo.findById(shelterId);
      if (!shelter) {
        throw new HTTPException(404, { message: "not found" });
      }
      const members = await memberRepo.listByShelter(shelterId);
      if (members.some((row) => row.role === SHELTER_ROLE.OWNER)) {
        throw new HTTPException(409, { message: "shelter has owner" });
      }
      await shelterRepo.update(shelterId, { archivedAt: new Date() });
      const live = await animalRepo.listByShelter(shelterId, "live");
      for (const animal of live) {
        await animalRepo.update(animal.id, {
          status: "draft",
          publishedAt: null,
        });
      }
      await audit(actor, "archive_shelter", {
        type: "shelter",
        id: shelter.id,
        label: shelter.orgName,
      });
      return this.getShelter(shelterId);
    },

    async listAnimals(search: URLSearchParams): Promise<ListEnvelope<Record<string, unknown>>> {
      const query = parseListQuery(search);
      const { items, total } = await adminRepo.listAnimals(listParams(search));
      return listEnvelope(
        items.map((row) => adminAnimalCard(row)),
        total,
        query,
      );
    },

    async getAnimal(id: string) {
      const row = await adminRepo.findAnimalWithShelter(id);
      if (!row) {
        throw new HTTPException(404, { message: "not found" });
      }
      const a = row.animal;
      return {
        ...adminAnimalCard({
          id: a.id,
          name: a.name,
          species: a.species,
          status: a.status,
          createdAt: a.createdAt,
          photos: a.photos,
          ageMonths: a.ageMonths,
          ageUnknown: a.ageUnknown,
          tagline: a.tagline,
          traits: a.traits,
          shelterId: row.shelterId,
          shelterName: row.shelterName,
          city: row.city,
        }),
        sex: a.sex,
        description: a.description,
      };
    },

    async getAnimalPhoto(animalId: string, index: number) {
      const row = await adminRepo.findAnimalWithShelter(animalId);
      if (!row) return null;
      const keys = row.animal.photos ?? [];
      const key = keys[index];
      if (!key) return null;
      return env.adoptierlieber_images.get(key);
    },

    async listApplications(search: URLSearchParams): Promise<ListEnvelope<Record<string, unknown>>> {
      if (!search.has("verification_status") && !search.get("verification_status")) {
        search = new URLSearchParams(search);
        search.set("verification_status", "pending");
      }
      return this.listShelters(search);
    },

    async getApplication(id: string) {
      return this.getShelter(id);
    },

    async approve(actorId: string, shelterId: string): Promise<void> {
      const actor = await requireActor(actorId);
      const shelter = await shelterRepo.findById(shelterId);
      if (!shelter) {
        throw new HTTPException(404, { message: "not found" });
      }
      if (shelter.verificationStatus !== "pending") {
        throw new HTTPException(409, { message: "not pending" });
      }
      await shelterRepo.updateVerification(shelter.id, {
        verificationStatus: "verified",
        verificationReason: null,
        verificationDecidedAt: new Date(),
        verificationDecidedBy: actor.id,
      });
      await adminRepo.wipeNotes(shelter.id);
      const members = await memberRepo.listByShelter(shelter.id);
      const ownerMember = members.find((m) => m.role === SHELTER_ROLE.OWNER);
      const owner = ownerMember ? await userRepo.findById(ownerMember.userId) : null;
      if (owner) {
        try {
          await sendMail(shelterApprovedTemplate({ to: owner.email, orgName: shelter.orgName }));
        } catch (e: unknown) {
          console.error(e);
        }
      }
      await audit(actor, "approve", { type: "shelter", id: shelter.id, label: shelter.orgName });
    },

    async reject(actorId: string, shelterId: string, input: unknown): Promise<void> {
      const data = adminRejectionSchema.parse(input);
      const actor = await requireActor(actorId);
      const shelter = await shelterRepo.findById(shelterId);
      if (!shelter) {
        throw new HTTPException(404, { message: "not found" });
      }
      if (shelter.verificationStatus !== "pending") {
        throw new HTTPException(409, { message: "not pending" });
      }
      await shelterRepo.updateVerification(shelter.id, {
        verificationStatus: "rejected",
        verificationReason: data.reason,
        verificationDecidedAt: new Date(),
        verificationDecidedBy: actor.id,
      });
      const members = await memberRepo.listByShelter(shelter.id);
      const ownerMember = members.find((m) => m.role === SHELTER_ROLE.OWNER);
      const owner = ownerMember ? await userRepo.findById(ownerMember.userId) : null;
      if (owner) {
        try {
          await sendMail(
            shelterRejectedTemplate({
              to: owner.email,
              orgName: shelter.orgName,
              reason: data.reason,
            }),
          );
        } catch (e: unknown) {
          console.error(e);
        }
      }
      await audit(actor, "deny", {
        type: "shelter",
        id: shelter.id,
        label: shelter.orgName,
        reason: data.reason,
      });
    },

    async listNotes(shelterId: string) {
      const shelter = await shelterRepo.findById(shelterId);
      if (!shelter) {
        throw new HTTPException(404, { message: "not found" });
      }
      const notes = await adminRepo.listNotes(shelterId);
      return notes.map((n) => ({
        id: n.id,
        author_id: n.authorId,
        author_name: n.authorName,
        body: n.body,
        created_at: n.createdAt.toISOString(),
      }));
    },

    async addNote(actorId: string, shelterId: string, input: unknown) {
      const data = adminNoteSchema.parse(input);
      const actor = await requireActor(actorId);
      const shelter = await shelterRepo.findById(shelterId);
      if (!shelter) {
        throw new HTTPException(404, { message: "not found" });
      }
      if (shelter.verificationStatus === "verified") {
        throw new HTTPException(404, { message: "not found" });
      }
      const note = await adminRepo.insertNote({
        shelterId: shelter.id,
        authorId: actor.id,
        authorName: actor.name,
        body: data.body,
      });
      await audit(actor, "note", {
        type: "shelter",
        id: shelter.id,
        label: shelter.orgName,
      });
      return {
        id: note?.id,
        author_id: actor.id,
        author_name: actor.name,
        body: data.body,
        created_at: note?.createdAt.toISOString() ?? new Date().toISOString(),
      };
    },

    async listBans(search: URLSearchParams): Promise<ListEnvelope<Record<string, unknown>>> {
      const query = parseListQuery(search);
      const { items, total } = await adminRepo.listBans(listParams(search));
      const actorIds = items.map((b) => b.bannedBy).filter((id): id is string => Boolean(id));
      const names = await adminRepo.namesByIds(actorIds);
      const nameById = new Map(names.map((n) => [n.id, n.name]));
      return listEnvelope(
        items.map((row) => ({
          hash: row.hash,
          reason: row.reason,
          created_at: row.createdAt.toISOString(),
          banned_by: row.bannedBy,
          banned_by_name: row.bannedBy ? (nameById.get(row.bannedBy) ?? null) : null,
        })),
        total,
        query,
      );
    },

    async dropBan(actorId: string, hash: string): Promise<void> {
      const actor = await requireActor(actorId);
      const existing = await banRepo.findByHash(hash);
      if (!existing) {
        throw new HTTPException(404, { message: "not found" });
      }
      await banRepo.deleteByHash(hash);
      await audit(actor, "drop_ban", {
        type: "ban",
        id: hash,
        label: hash.slice(0, 8),
        reason: existing.reason,
      });
    },

    async lookupBan(actorId: string, input: unknown) {
      const data = banLookupSchema.parse(input);
      const actor = await requireActor(actorId);
      const hash = await banFingerprint({
        name: data.name,
        street: data.street,
        zip: data.zip,
        city: data.city,
      });
      const hit = await banRepo.findByHash(hash);
      if (!hit) {
        return { match: false as const };
      }
      await audit(actor, "ban_lookup_hit", {
        type: "ban",
        id: hash,
        label: hash.slice(0, 8),
      });
      const banner = hit.bannedBy ? await userRepo.findById(hit.bannedBy) : null;
      return {
        match: true as const,
        hash: hit.hash,
        reason: hit.reason,
        created_at: hit.createdAt.toISOString(),
        banned_by_name: banner?.name ?? null,
      };
    },

    async listAudit(search: URLSearchParams): Promise<ListEnvelope<Record<string, unknown>>> {
      const query = parseListQuery(search);
      const { items, total } = await adminRepo.listAudit(listParams(search));
      return listEnvelope(
        items.map((row) => ({
          id: row.id,
          created_at: row.createdAt.toISOString(),
          action: row.action,
          actor_id: row.actorId,
          actor_name: row.actorName,
          actor_email: row.actorEmail,
          target_type: row.targetType,
          target_id: row.targetId,
          target_label: row.targetLabel,
          reason: row.reason,
        })),
        total,
        query,
      );
    },

    async listAdmins() {
      const [admins, invites] = await Promise.all([
        adminRepo.listAdmins(),
        adminRepo.listPendingInvites(),
      ]);
      const allowlist = superAdminAllowlist(env);
      return {
        items: admins.map((row) => ({
          id: row.id,
          name: row.name,
          email: row.email,
          platform_role: effectivePlatformRole(row, allowlist),
          created_at: row.createdAt.toISOString(),
          has_avatar: Boolean(row.avatarKey),
        })),
        invites: invites.map((row) => ({
          id: row.id,
          email: row.email,
          expires_at: row.expiresAt.toISOString(),
          created_at: row.createdAt.toISOString(),
          invited_by: row.invitedBy,
        })),
      };
    },

    async invite(actorId: string, input: unknown): Promise<void> {
      const data = adminInviteSchema.parse(input);
      const actor = await requireActor(actorId);
      const existing = await userRepo.findByEmail(data.email);
      if (existing && isSuperAdmin(existing, superAdminAllowlist(env))) {
        throw new HTTPException(409, { message: "already on the team" });
      }
      if (existing && existing.platformRole <= PLATFORM_ROLE.ADMIN) {
        throw new HTTPException(409, { message: "already on the team" });
      }
      const { token, hashedToken } = await generateToken();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const pending = await adminRepo.findInviteByEmail(data.email);
      if (pending) {
        await adminRepo.rotateInvite(pending.id, hashedToken, expiresAt);
      } else {
        await adminRepo.insertInvite({
          email: data.email,
          tokenHash: hashedToken,
          invitedBy: actor.id,
          expiresAt,
        });
      }
      try {
        await sendMail(adminInviteTemplate({ to: data.email, token }));
      } catch (e: unknown) {
        console.error(e);
        throw new HTTPException(500, { message: "failed to send invite email" });
      }
      await audit(actor, "invite", { type: "invite", id: null, label: data.email });
    },

    async revokeInvite(actorId: string, inviteId: string): Promise<void> {
      const actor = await requireActor(actorId);
      const invite = await adminRepo.findInviteById(inviteId);
      if (!invite || invite.consumedAt) {
        throw new HTTPException(404, { message: "not found" });
      }
      await adminRepo.deleteInvite(invite.id);
      await audit(actor, "revoke_invite", { type: "invite", id: invite.id, label: invite.email });
    },

    async removeAdmin(actorId: string, targetId: string): Promise<void> {
      const actor = await requireActor(actorId);
      if (!isSuperAdmin(actor, superAdminAllowlist(env))) {
        throw new HTTPException(403, { message: "insufficient privilege" });
      }
      const target = await requireUser(targetId);
      if (target.platformRole !== PLATFORM_ROLE.ADMIN) {
        throw new HTTPException(409, { message: "not an admin" });
      }
      await userRepo.updatePlatformRole(target.id, PLATFORM_ROLE.USER);
      await audit(actor, "remove_admin", { type: "user", id: target.id, label: target.email });
    },

    async getInvite(rawToken: string) {
      const hashed = await hashToken(rawToken);
      const invite = await adminRepo.findInviteByTokenHash(hashed);
      if (!invite || invite.consumedAt || invite.expiresAt.getTime() < Date.now()) {
        throw new HTTPException(404, { message: "not found" });
      }
      const existing = await userRepo.findByEmail(invite.email);
      return {
        email: invite.email,
        expires_at: invite.expiresAt.toISOString(),
        existing_user: Boolean(existing),
      };
    },

    async acceptInvite(
      rawToken: string,
      input: unknown,
      sessionUserId: string | null,
    ): Promise<{ sessionToken?: string; expiresAt?: Date; setup_required?: boolean }> {
      const hashed = await hashToken(rawToken);
      const invite = await adminRepo.findInviteByTokenHash(hashed);
      if (!invite || invite.consumedAt || invite.expiresAt.getTime() < Date.now()) {
        throw new HTTPException(404, { message: "not found" });
      }

      const existing = await userRepo.findByEmail(invite.email);

      if (existing) {
        if (sessionUserId && sessionUserId !== existing.id) {
          throw new HTTPException(409, { message: "logged in as other email" });
        }
        if (!sessionUserId) {
          throw new HTTPException(401, { message: "log in to accept" });
        }
        if (
          isSuperAdmin(existing, superAdminAllowlist(env)) ||
          existing.platformRole === PLATFORM_ROLE.ADMIN
        ) {
          throw new HTTPException(409, { message: "already on the team" });
        }
        const consumed = await adminRepo.consumeInvite(invite.id);
        if (!consumed) {
          throw new HTTPException(409, { message: "invite already used" });
        }
        await userRepo.updatePlatformRole(existing.id, PLATFORM_ROLE.ADMIN);
        return {};
      }

      if (sessionUserId) {
        throw new HTTPException(409, { message: "logged in as other email" });
      }

      const data = inviteAcceptanceSchema.parse(input);
      await assertRegistrationAllowed(env, {
        name: data.name,
        street: data.street,
        zip: data.zip,
        city: data.city,
      });
      const consumed = await adminRepo.consumeInvite(invite.id);
      if (!consumed) {
        throw new HTTPException(409, { message: "invite already used" });
      }
      const password = await hashPassword(data.password);
      const user = await insertRegisteredUser(env, {
        name: data.name,
        displayName: data.displayName,
        email: invite.email,
        password,
        street: data.street,
        zip: data.zip,
        city: data.city,
        lat: data.lat,
        lng: data.lng,
        platformRole: PLATFORM_ROLE.ADMIN,
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      });
      await userRepo.verifyEmail(user.id);
      const verified = await userRepo.findById(user.id);
      if (verified) {
        await grantSuperAdminIfAllowlisted(env, verified);
      }
      const session = await createSessionService(env).create(
        { userId: user.id, kind: "setup" },
        null,
      );
      return {
        sessionToken: session.sessionToken,
        expiresAt: session.expiresAt,
        setup_required: true,
      };
    },
  };
}
