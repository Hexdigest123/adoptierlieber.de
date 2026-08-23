import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import {
  applicationFormSchema,
  createShelterSchema,
  inviteMemberSchema,
  replySnippetSchema,
  shelterChecklistSchema,
  transferOwnerSchema,
  updateShelterSchema,
} from "../lib/zod";
import { generateToken, hashPassword, hashToken } from "../lib/hashing";
import { hasPrivilege, SHELTER_ROLE, type ShelterRole } from "../lib/roles";
import { createUserRepo } from "../repositories/user.repo";
import { createShelterRepo } from "../repositories/shelter.repo";
import { createShelterMemberRepo } from "../repositories/shelter-member.repo";
import { createShelterInviteRepo } from "../repositories/shelter-invite.repo";
import { createAnimalRepo } from "../repositories/animal.repo";
import { createThreadRepo } from "../repositories/thread.repo";
import { createImpressionRepo } from "../repositories/impression.repo";
import { createSnippetRepo } from "../repositories/snippet.repo";
import type {
  ApplicationField,
  Shelter,
  ShelterChecklist,
  ShelterMember,
} from "../types";
import {
  deleteShelterLogo,
  getShelterLogoObject,
  parseAvatarFile,
  putAvatar,
  putShelterLogo,
} from "../lib/avatar";
import { assertRegistrationAllowed, insertRegisteredUser } from "../lib/create-account";
import { geocodeAddress } from "../lib/geocode";
import { partnerMap } from "../lib/bond";
import { toStaffAnimal, toStaffShelter } from "../lib/staff-animal";
import { sendMail } from "../lib/mail";
import { shelterStaffInviteTemplate } from "../lib/email-templates";

const INVITE_TTL_MS = 14 * 24 * 60 * 60 * 1000;

function asForm(value: unknown): ApplicationField[] {
  return Array.isArray(value) ? (value as ApplicationField[]) : [];
}

function asChecklist(value: unknown): ShelterChecklist {
  return value && typeof value === "object" ? (value as ShelterChecklist) : {};
}

function dayStamp(offsetDays: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

export function createShelterService(env: Env) {
  const userRepo = createUserRepo(env);
  const shelterRepo = createShelterRepo(env);
  const memberRepo = createShelterMemberRepo(env);
  const inviteRepo = createShelterInviteRepo(env);
  const animalRepo = createAnimalRepo(env);
  const threadRepo = createThreadRepo(env);
  const snippetRepo = createSnippetRepo(env);
  const impressionRepo = createImpressionRepo(env);

  async function requireShelter(shelterId: string): Promise<Shelter> {
    const shelter = await shelterRepo.findById(shelterId);
    if (!shelter) {
      throw new HTTPException(404, { message: "shelter not found" });
    }
    return shelter;
  }

  async function assertWritable(shelter: Shelter): Promise<void> {
    if (shelter.verificationStatus === "rejected") {
      throw new HTTPException(403, { message: "shelter rejected" });
    }
  }

  async function ownerCount(shelterId: string): Promise<number> {
    const peers = await memberRepo.listByShelter(shelterId);
    return peers.filter((peer) => peer.role === SHELTER_ROLE.OWNER).length;
  }

  return {
    /**
     * Register a new shelter together with its owner account.
     * Creates user (+ email-verification token) + shelter (pending) + membership (OWNER).
     */
    async create(
      input: unknown,
      avatarFile: File | null = null,
    ): Promise<{ verificationToken: string } | null> {
      const data = createShelterSchema.parse(input);
      const parsedAvatar = avatarFile ? await parseAvatarFile(avatarFile) : null;

      await assertRegistrationAllowed(env, {
        name: data.name,
        street: data.street,
        zip: data.zip,
        city: data.city,
      });

      const hashedPassword = await hashPassword(data.password);
      const { token, hashedToken } = await generateToken();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

      let lat = data.lat;
      let lng = data.lng;
      let geocodedAt: Date | undefined;
      if (lat == null || lng == null) {
        const geo = await geocodeAddress(data.street, data.zip, data.city);
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
          geocodedAt = new Date();
        }
      }

      let user;
      try {
        user = await insertRegisteredUser(env, {
          name: data.name,
          displayName: data.displayName,
          email: data.email,
          password: hashedPassword,
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
        if (await userRepo.findByEmail(data.email)) {
          throw new HTTPException(409, { message: "email already registered" });
        }
        throw e;
      }

      let shelter;
      try {
        shelter = await shelterRepo.create({
          orgName: data.orgName,
          street: data.street,
          zip: data.zip,
          city: data.city,
          website: data.website,
          registrationNumber: data.registrationNumber,
          description: data.description,
          notifyEmail: data.email,
          lat,
          lng,
          geocodedAt,
        });
      } catch (e: unknown) {
        await userRepo.delete(user.id);
        throw e;
      }
      if (!shelter) {
        await userRepo.delete(user.id);
        throw new HTTPException(500, { message: "something wen't wrong" });
      }

      try {
        await memberRepo.create({
          userId: user.id,
          shelterId: shelter.id,
          role: SHELTER_ROLE.OWNER,
        });
      } catch (e: unknown) {
        await userRepo.delete(user.id);
        await shelterRepo.delete(shelter.id);
        throw e;
      }

      if (parsedAvatar) {
        try {
          const avatarKey = await putAvatar(env, user.id, parsedAvatar);
          await userRepo.updateAvatarKey(user.id, avatarKey);
        } catch (e: unknown) {
          console.error(e);
        }
      }

      return { verificationToken: token };
    },

    async getMembership(userId: string, shelterId: string): Promise<ShelterMember | undefined> {
      return memberRepo.findMembership(userId, shelterId);
    },

    /**
     * Assert that a user holds at least `minPrivilege` within a shelter.
     * Ring check: role <= minPrivilege. GLOBAL_ADMIN bypasses shelter checks.
     */
    async assertRole(
      userId: string,
      shelterId: string,
      minPrivilege: ShelterRole,
    ): Promise<ShelterMember> {
      const membership = await memberRepo.findMembership(userId, shelterId);
      if (!membership) {
        throw new HTTPException(403, { message: "insufficient shelter privileges" });
      }
      if (
        membership.role !== SHELTER_ROLE.GLOBAL_ADMIN &&
        !hasPrivilege(membership.role, minPrivilege)
      ) {
        throw new HTTPException(403, { message: "insufficient shelter privileges" });
      }
      return membership;
    },

    async get(userId: string, shelterId: string) {
      await this.assertRole(userId, shelterId, SHELTER_ROLE.STAFF);
      return toStaffShelter(await requireShelter(shelterId));
    },

    async update(userId: string, shelterId: string, input: unknown) {
      await this.assertRole(userId, shelterId, SHELTER_ROLE.OWNER);
      const shelter = await requireShelter(shelterId);
      await assertWritable(shelter);
      const data = updateShelterSchema.parse(input);

      const addressChanged =
        (data.street !== undefined && data.street !== shelter.street) ||
        (data.zip !== undefined && data.zip !== shelter.zip) ||
        (data.city !== undefined && data.city !== shelter.city);

      let lat = shelter.lat;
      let lng = shelter.lng;
      let geocodedAt = shelter.geocodedAt;
      if (addressChanged) {
        const geo = await geocodeAddress(
          data.street ?? shelter.street,
          data.zip ?? shelter.zip,
          data.city ?? shelter.city,
        );
        if (geo) {
          lat = geo.lat;
          lng = geo.lng;
          geocodedAt = new Date();
        }
      }

      const updated = await shelterRepo.update(shelterId, {
        ...(data.org_name !== undefined ? { orgName: data.org_name } : {}),
        ...(data.street !== undefined ? { street: data.street } : {}),
        ...(data.zip !== undefined ? { zip: data.zip } : {}),
        ...(data.city !== undefined ? { city: data.city } : {}),
        ...(data.website !== undefined ? { website: data.website || null } : {}),
        ...(data.registration_number !== undefined
          ? { registrationNumber: data.registration_number }
          : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.notify_email !== undefined
          ? { notifyEmail: data.notify_email, notifyLastError: null }
          : {}),
        lat,
        lng,
        geocodedAt,
      });
      if (!updated) {
        throw new HTTPException(404, { message: "shelter not found" });
      }
      return toStaffShelter(updated);
    },

    async dashboard(userId: string, shelterId: string) {
      await this.assertRole(userId, shelterId, SHELTER_ROLE.STAFF);
      const shelter = await requireShelter(shelterId);
      const [live, drafts, found, unread, recent, likes, impressions] = await Promise.all([
        animalRepo.countByShelter(shelterId, "live"),
        animalRepo.countByShelter(shelterId, "draft"),
        animalRepo.countByShelter(shelterId, "found_home"),
        threadRepo.countUnreadForShelter(shelterId),
        threadRepo.countCreatedSince(shelterId, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)),
        impressionRepo.sumLikesLive(shelterId),
        impressionRepo.sumSince(shelterId, dayStamp(-6)),
      ]);

      const recentThreads = (await threadRepo.listByShelter(shelterId, { archived: false })).slice(
        0,
        5,
      );
      const recentItems = [];
      for (const thread of recentThreads) {
        const [animal, adopter] = await Promise.all([
          animalRepo.findById(thread.animalId),
          userRepo.findById(thread.adopterUserId),
        ]);
        recentItems.push({
          id: thread.id,
          animal_id: thread.animalId,
          animal_name: animal?.name ?? "",
          animal_photo: animal?.photos?.[0] ?? null,
          adopter_name: adopter?.displayName || adopter?.name || "",
          last_message_at: thread.lastMessageAt.toISOString(),
          unread: thread.unreadForShelter,
        });
      }

      const staleBefore = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
      const staleDrafts = await impressionRepo.listStaleDrafts(shelterId, staleBefore);
      const attention: { kind: string; animal_id?: string; thread_id?: string }[] = [];
      for (const draft of staleDrafts) {
        if (!(draft.photos ?? []).length) {
          attention.push({ kind: "stale_draft_no_photo", animal_id: draft.id });
        }
      }
      const liveAnimals = await animalRepo.listByShelter(shelterId, "live");
      for (const animal of liveAnimals) {
        if (!(animal.photos ?? []).length) {
          attention.push({ kind: "live_no_photo", animal_id: animal.id });
        }
      }
      const unanswered = await threadRepo.countUnansweredSince(
        shelterId,
        new Date(Date.now() - 48 * 60 * 60 * 1000),
      );
      if ((unanswered?.n ?? 0) > 0) {
        attention.push({ kind: "unanswered" });
      }
      if (shelter.verificationStatus === "pending") {
        attention.push({ kind: "pending" });
      }

      return {
        shelter: toStaffShelter(shelter),
        kpis: {
          live: shelter.verificationStatus === "verified" ? (live?.n ?? 0) : 0,
          drafts: drafts?.n ?? 0,
          found_home: found?.n ?? 0,
          new_threads: recent?.n ?? 0,
          unread: unread?.n ?? 0,
          likes: likes?.n ?? 0,
          impressions_7d: impressions?.n ?? 0,
        },
        recent_threads: recentItems,
        attention,
      };
    },

    async getForm(userId: string, shelterId: string) {
      await this.assertRole(userId, shelterId, SHELTER_ROLE.STAFF);
      const shelter = await requireShelter(shelterId);
      return { fields: asForm(shelter.applicationForm) };
    },

    async putForm(userId: string, shelterId: string, input: unknown) {
      await this.assertRole(userId, shelterId, SHELTER_ROLE.OWNER);
      const shelter = await requireShelter(shelterId);
      await assertWritable(shelter);
      const raw = Array.isArray(input)
        ? input
        : input && typeof input === "object" && "fields" in input
          ? (input as { fields: unknown }).fields
          : input;
      const fields = applicationFormSchema.parse(raw);
      const updated = await shelterRepo.update(shelterId, { applicationForm: fields });
      if (!updated) {
        throw new HTTPException(404, { message: "shelter not found" });
      }
      return { fields: asForm(updated.applicationForm) };
    },

    async getChecklist(userId: string, shelterId: string) {
      await this.assertRole(userId, shelterId, SHELTER_ROLE.STAFF);
      const shelter = await requireShelter(shelterId);
      return asChecklist(shelter.checklist);
    },

    async patchChecklist(userId: string, shelterId: string, input: unknown) {
      await this.assertRole(userId, shelterId, SHELTER_ROLE.STAFF);
      const shelter = await requireShelter(shelterId);
      await assertWritable(shelter);
      const patch = shelterChecklistSchema.parse(input);
      const next = { ...asChecklist(shelter.checklist), ...patch };
      const updated = await shelterRepo.update(shelterId, { checklist: next });
      if (!updated) {
        throw new HTTPException(404, { message: "shelter not found" });
      }
      return asChecklist(updated.checklist);
    },

    async listMembers(userId: string, shelterId: string) {
      await this.assertRole(userId, shelterId, SHELTER_ROLE.STAFF);
      const members = await memberRepo.listByShelter(shelterId);
      const invites = (await inviteRepo.listByShelter(shelterId)).filter((row) => !row.consumedAt);
      const items = [];
      for (const member of members) {
        const user = await userRepo.findById(member.userId);
        items.push({
          user_id: member.userId,
          name: user?.name ?? "",
          display_name: user?.displayName ?? null,
          email: user?.email ?? "",
          has_avatar: Boolean(user?.avatarKey),
          role: member.role,
          joined_at: member.createdAt.toISOString(),
        });
      }
      return {
        members: items,
        invites: invites.map((invite) => ({
          id: invite.id,
          email: invite.email,
          role: invite.role,
          expires_at: invite.expiresAt.toISOString(),
          created_at: invite.createdAt.toISOString(),
        })),
      };
    },

    async invite(userId: string, shelterId: string, input: unknown) {
      await this.assertRole(userId, shelterId, SHELTER_ROLE.OWNER);
      const shelter = await requireShelter(shelterId);
      await assertWritable(shelter);
      const data = inviteMemberSchema.parse(input);
      const role = data.role ?? SHELTER_ROLE.STAFF;
      if (role !== SHELTER_ROLE.OWNER && role !== SHELTER_ROLE.STAFF) {
        throw new HTTPException(400, { message: "invalid role" });
      }

      const existingUser = await userRepo.findByEmail(data.email);
      if (existingUser) {
        const already = await memberRepo.findMembership(existingUser.id, shelterId);
        if (already) {
          throw new HTTPException(409, { message: "already a member" });
        }
        await memberRepo.create({
          userId: existingUser.id,
          shelterId,
          role,
        });
        try {
          await sendMail(
            shelterStaffInviteTemplate({
              to: data.email,
              orgName: shelter.orgName,
              token: "joined",
              existingUser: true,
            }),
          );
        } catch (error: unknown) {
          console.error(error);
        }
        return {};
      }

      const { token, hashedToken } = await generateToken();
      const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
      const pending = await inviteRepo.findPending(shelterId, data.email);
      if (pending) {
        await inviteRepo.refresh(pending.id, hashedToken, expiresAt);
      } else {
        await inviteRepo.create({
          shelterId,
          email: data.email.toLowerCase(),
          role,
          tokenHash: hashedToken,
          invitedBy: userId,
          expiresAt,
        });
      }

      try {
        await sendMail(
          shelterStaffInviteTemplate({
            to: data.email,
            orgName: shelter.orgName,
            token,
            existingUser: false,
          }),
        );
      } catch (error: unknown) {
        console.error(error);
      }

      return {};
    },

    async removeMember(actorId: string, shelterId: string, targetUserId: string) {
      await this.assertRole(actorId, shelterId, SHELTER_ROLE.OWNER);
      const shelter = await requireShelter(shelterId);
      await assertWritable(shelter);
      const target = await memberRepo.findMembership(targetUserId, shelterId);
      if (!target) {
        throw new HTTPException(404, { message: "member not found" });
      }
      if (target.role === SHELTER_ROLE.OWNER && (await ownerCount(shelterId)) <= 1) {
        throw new HTTPException(409, { message: "transfer ownership first" });
      }
      await memberRepo.delete(targetUserId, shelterId);
      return {};
    },

    async transfer(actorId: string, shelterId: string, input: unknown) {
      await this.assertRole(actorId, shelterId, SHELTER_ROLE.OWNER);
      const shelter = await requireShelter(shelterId);
      await assertWritable(shelter);
      const data = transferOwnerSchema.parse(input);
      const target = await memberRepo.findMembership(data.user_id, shelterId);
      if (!target) {
        throw new HTTPException(404, { message: "member not found" });
      }
      if (target.role === SHELTER_ROLE.OWNER) {
        return {};
      }
      await memberRepo.updateRole(data.user_id, shelterId, SHELTER_ROLE.OWNER);
      return {};
    },

    async acceptInvite(userId: string, token: string) {
      const hashed = await hashToken(token);
      const invite = await inviteRepo.findByTokenHash(hashed);
      if (!invite || invite.consumedAt) {
        throw new HTTPException(404, { message: "invite not found" });
      }
      if (invite.expiresAt.getTime() < Date.now()) {
        throw new HTTPException(400, { message: "invite expired" });
      }
      const user = await userRepo.findById(userId);
      if (!user || user.email.toLowerCase() !== invite.email.toLowerCase()) {
        throw new HTTPException(403, { message: "invite email mismatch" });
      }
      const already = await memberRepo.findMembership(userId, invite.shelterId);
      if (!already) {
        await memberRepo.create({
          userId,
          shelterId: invite.shelterId,
          role: invite.role,
        });
      }
      await inviteRepo.consume(invite.id);
      return { shelter_id: invite.shelterId };
    },

    async putLogo(userId: string, shelterId: string, file: File) {
      await this.assertRole(userId, shelterId, SHELTER_ROLE.OWNER);
      const shelter = await requireShelter(shelterId);
      await assertWritable(shelter);
      const parsed = await parseAvatarFile(file);
      const key = await putShelterLogo(env, shelterId, parsed);
      const updated = await shelterRepo.update(shelterId, { logoKey: key });
      if (!updated) {
        throw new HTTPException(404, { message: "shelter not found" });
      }
      return toStaffShelter(updated);
    },

    async deleteLogo(userId: string, shelterId: string) {
      await this.assertRole(userId, shelterId, SHELTER_ROLE.OWNER);
      const shelter = await requireShelter(shelterId);
      await assertWritable(shelter);
      await deleteShelterLogo(env, shelterId);
      const updated = await shelterRepo.update(shelterId, { logoKey: null });
      if (!updated) {
        throw new HTTPException(404, { message: "shelter not found" });
      }
      return toStaffShelter(updated);
    },

    async getLogo(shelterId: string) {
      const shelter = await requireShelter(shelterId);
      if (!shelter.logoKey) return null;
      return getShelterLogoObject(env, shelterId);
    },

    async listSnippets(userId: string, shelterId: string) {
      await this.assertRole(userId, shelterId, SHELTER_ROLE.STAFF);
      const rows = await snippetRepo.listByShelter(shelterId);
      return rows.map((row) => ({
        id: row.id,
        title: row.title,
        body: row.body,
        created_at: row.createdAt.toISOString(),
      }));
    },

    async createSnippet(userId: string, shelterId: string, input: unknown) {
      await this.assertRole(userId, shelterId, SHELTER_ROLE.STAFF);
      const shelter = await requireShelter(shelterId);
      await assertWritable(shelter);
      const data = replySnippetSchema.parse(input);
      const existing = await snippetRepo.listByShelter(shelterId);
      if (existing.length >= 20) {
        throw new HTTPException(409, { message: "too many snippets" });
      }
      const row = await snippetRepo.create({
        shelterId,
        title: data.title,
        body: data.body,
      });
      if (!row) {
        throw new HTTPException(500, { message: "something wen't wrong" });
      }
      return {
        id: row.id,
        title: row.title,
        body: row.body,
        created_at: row.createdAt.toISOString(),
      };
    },

    async deleteSnippet(userId: string, shelterId: string, snippetId: string) {
      await this.assertRole(userId, shelterId, SHELTER_ROLE.STAFF);
      const shelter = await requireShelter(shelterId);
      await assertWritable(shelter);
      const row = await snippetRepo.findById(snippetId);
      if (!row || row.shelterId !== shelterId) {
        throw new HTTPException(404, { message: "snippet not found" });
      }
      await snippetRepo.delete(snippetId);
      return {};
    },

    async listAnimals(userId: string, shelterId: string, status?: string) {
      await this.assertRole(userId, shelterId, SHELTER_ROLE.STAFF);
      await requireShelter(shelterId);
      const filter =
        status === "draft" || status === "live" || status === "found_home" ? status : undefined;
      const rows = await animalRepo.listByShelter(shelterId, filter);
      const ids = rows.map((row) => row.id);
      const groupIds = [
        ...new Set(rows.map((row) => row.bondGroupId).filter((id): id is string => Boolean(id))),
      ];
      const extraIds = [
        ...new Set(
          rows
            .map((row) => row.bondedAnimalId)
            .filter((id): id is string => Boolean(id))
            .filter((id) => !ids.includes(id)),
        ),
      ];
      const [threadCounts, unreadCounts, grouped, extras] = await Promise.all([
        threadRepo.countByAnimalIds(ids),
        threadRepo.countUnreadByAnimalIds(ids),
        animalRepo.listByBondGroups(groupIds),
        animalRepo.findByIds(extraIds),
      ]);
      const partners = partnerMap(rows, grouped, extras);
      const threads = new Map(threadCounts.map((row) => [row.animalId, Number(row.n)]));
      const unread = new Map(unreadCounts.map((row) => [row.animalId, Number(row.n)]));
      return rows.map((row) =>
        toStaffAnimal(row, {
          thread_count: threads.get(row.id) ?? 0,
          unread_threads: unread.get(row.id) ?? 0,
          bonded_partners: partners.get(row.id) ?? [],
        }),
      );
    },
  };
}
