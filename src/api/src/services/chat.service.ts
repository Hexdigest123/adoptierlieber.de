import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import { assignThreadSchema, createMessageSchema, createThreadSchema } from "../lib/zod";
import { createAnimalRepo } from "../repositories/animal.repo";
import { createShelterRepo } from "../repositories/shelter.repo";
import { createShelterMemberRepo } from "../repositories/shelter-member.repo";
import { createThreadRepo } from "../repositories/thread.repo";
import { createThreadReadRepo } from "../repositories/thread-read.repo";
import { createMessageRepo } from "../repositories/message.repo";
import { createUserRepo } from "../repositories/user.repo";
import { sendMail } from "../lib/mail";
import { newThreadNotifyTemplate } from "../lib/email-templates";
import { chatRoomStub } from "../durable-objects/chat-room";
import type {
  ApplicationAnswer,
  ApplicationField,
  GrantProfile,
  Message,
  Thread,
} from "../types";

type ThreadView = {
  id: string;
  shelter_id: string;
  animal_id: string;
  animal_name: string;
  animal_photo: string | null;
  animal_status: string | null;
  adopter_user_id: string;
  adopter_name: string;
  adopter_has_avatar: boolean;
  created_at: string;
  last_message_at: string;
  last_preview: string | null;
  unread_for_shelter: boolean;
  unread_for_me: boolean;
  unread_for_adopter: boolean;
  archived: boolean;
  assigned_user_id: string | null;
  assigned_name: string | null;
  email_granted: boolean;
  profile_granted: boolean;
  shelter_name: string;
};

type MessageView = {
  id: string;
  thread_id: string;
  author_user_id: string | null;
  kind: Message["kind"];
  body: string;
  created_at: string;
};

function asForm(value: unknown): ApplicationField[] {
  return Array.isArray(value) ? (value as ApplicationField[]) : [];
}

function toMessageView(row: Message): MessageView {
  return {
    id: row.id,
    thread_id: row.threadId,
    author_user_id: row.authorUserId,
    kind: row.kind,
    body: row.body,
    created_at: row.createdAt.toISOString(),
  };
}

export function createChatService(env: Env) {
  const animalRepo = createAnimalRepo(env);
  const shelterRepo = createShelterRepo(env);
  const memberRepo = createShelterMemberRepo(env);
  const threadRepo = createThreadRepo(env);
  const threadReadRepo = createThreadReadRepo(env);
  const messageRepo = createMessageRepo(env);
  const userRepo = createUserRepo(env);

  async function staffOf(userId: string, shelterId: string) {
    return memberRepo.findMembership(userId, shelterId);
  }

  async function requireThreadAccess(userId: string, threadId: string) {
    const thread = await threadRepo.findById(threadId);
    if (!thread) {
      throw new HTTPException(404, { message: "thread not found" });
    }
    const staff = await staffOf(userId, thread.shelterId);
    const isAdopter = thread.adopterUserId === userId;
    if (!staff && !isAdopter) {
      throw new HTTPException(403, { message: "insufficient privileges" });
    }
    return { thread, isStaff: Boolean(staff), isAdopter };
  }

  async function toThreadView(thread: Thread, viewerId?: string): Promise<ThreadView> {
    const [animal, adopter, last, assigned, mine, shelter] = await Promise.all([
      animalRepo.findById(thread.animalId),
      userRepo.findById(thread.adopterUserId),
      messageRepo.lastByThread(thread.id),
      thread.assignedUserId ? userRepo.findById(thread.assignedUserId) : Promise.resolve(undefined),
      viewerId ? threadReadRepo.find(thread.id, viewerId) : Promise.resolve(undefined),
      shelterRepo.findById(thread.shelterId),
    ]);
    const unreadForMe =
      viewerId && viewerId === thread.adopterUserId
        ? thread.unreadForAdopter
        : viewerId
          ? !mine || mine.lastReadAt.getTime() < thread.lastMessageAt.getTime()
          : thread.unreadForShelter;
    return {
      id: thread.id,
      shelter_id: thread.shelterId,
      animal_id: thread.animalId,
      animal_name: animal?.name ?? "",
      animal_photo: animal?.photos?.[0] ?? null,
      animal_status: animal?.status ?? null,
      adopter_user_id: thread.adopterUserId,
      adopter_name: adopter?.displayName || adopter?.name || "",
      adopter_has_avatar: Boolean(adopter?.avatarKey),
      created_at: thread.createdAt.toISOString(),
      last_message_at: thread.lastMessageAt.toISOString(),
      last_preview: last && last.kind === "user" ? last.body.slice(0, 140) : null,
      unread_for_shelter: thread.unreadForShelter,
      unread_for_me: unreadForMe,
      unread_for_adopter: thread.unreadForAdopter,
      archived: thread.archived,
      assigned_user_id: thread.assignedUserId,
      assigned_name: assigned ? assigned.displayName || assigned.name : null,
      email_granted: thread.emailGranted,
      profile_granted: thread.profileGranted,
      shelter_name: shelter?.orgName ?? "",
    };
  }

  function collectAnswers(
    form: ApplicationField[],
    raw: { field_id: string; value: string }[] | undefined,
  ): ApplicationAnswer[] {
    const visible = form.filter((field) => !field.hidden);
    const byId = new Map((raw ?? []).map((entry) => [entry.field_id, entry.value]));
    const answers: ApplicationAnswer[] = [];
    for (const field of visible) {
      const value = (byId.get(field.id) ?? "").trim();
      if (field.required && !value) {
        throw new HTTPException(400, { message: "missing answers" });
      }
      if (field.type === "select" && value && !(field.options ?? []).includes(value)) {
        throw new HTTPException(400, { message: "invalid answer" });
      }
      if (field.type === "yesno" && value && value !== "yes" && value !== "no") {
        throw new HTTPException(400, { message: "invalid answer" });
      }
      answers.push({
        field_id: field.id,
        label: field.label,
        type: field.type,
        value,
      });
    }
    return answers;
  }

  return {
    async create(userId: string, input: unknown) {
      const data = createThreadSchema.parse(input);
      const existing = await threadRepo.findByAnimalAdopter(data.animal_id, userId);
      if (existing) {
        return toThreadView(existing, userId);
      }

      const animal = await animalRepo.findById(data.animal_id);
      if (!animal || animal.status !== "live") {
        throw new HTTPException(404, { message: "animal not found" });
      }
      const shelter = await shelterRepo.findById(animal.shelterId);
      if (!shelter || shelter.verificationStatus !== "verified") {
        throw new HTTPException(404, { message: "animal not found" });
      }
      const staff = await staffOf(userId, shelter.id);
      if (staff) {
        throw new HTTPException(403, { message: "staff cannot apply" });
      }

      const adopter = await userRepo.findById(userId);
      if (!adopter) {
        throw new HTTPException(404, { message: "user not found" });
      }
      if (adopter.suspendedAt) {
        throw new HTTPException(403, { message: "account suspended" });
      }

      const grantProfile: GrantProfile = {
        display_name: adopter.displayName || adopter.name,
        city: adopter.city,
        zip: adopter.zip,
        preferences: adopter.preferences ?? null,
      };
      const answers = collectAnswers(asForm(shelter.applicationForm), data.answers);

      const thread = await threadRepo.create({
        shelterId: shelter.id,
        animalId: animal.id,
        adopterUserId: userId,
        emailGranted: true,
        profileGranted: true,
        grantedAt: new Date(),
        grantEmail: adopter.email,
        grantProfile,
        applicationAnswers: answers,
        unreadForShelter: true,
        unreadForAdopter: false,
      });
      if (!thread) {
        throw new HTTPException(500, { message: "something wen't wrong" });
      }

      await messageRepo.create({
        threadId: thread.id,
        authorUserId: null,
        kind: "system",
        body: "opened",
      });
      const excerpt = data.message?.trim() ?? "";
      if (excerpt) {
        await messageRepo.create({
          threadId: thread.id,
          authorUserId: userId,
          kind: "user",
          body: excerpt,
        });
        await threadRepo.update(thread.id, { lastMessageAt: new Date() });
      }

      const notifyTo = shelter.notifyEmail || null;
      if (notifyTo) {
        try {
          await sendMail(
            newThreadNotifyTemplate({
              to: notifyTo,
              animalName: animal.name,
              adopterName: adopter.displayName || adopter.name,
              excerpt,
              threadId: thread.id,
            }),
          );
          if (shelter.notifyLastError) {
            await shelterRepo.update(shelter.id, { notifyLastError: null });
          }
        } catch (error: unknown) {
          console.error(error);
          const message = error instanceof Error ? error.message : "send failed";
          await shelterRepo.update(shelter.id, { notifyLastError: message.slice(0, 280) });
        }
      }

      const fresh = await threadRepo.findById(thread.id);
      return toThreadView(fresh ?? thread, userId);
    },

    async list(userId: string, opts: { shelterId?: string; archived?: boolean }) {
      if (opts.shelterId) {
        const staff = await staffOf(userId, opts.shelterId);
        if (!staff) {
          throw new HTTPException(403, { message: "insufficient privileges" });
        }
        const rows = await threadRepo.listByShelter(opts.shelterId, {
          archived: opts.archived ?? false,
        });
        return Promise.all(rows.map((row) => toThreadView(row, userId)));
      }
      const rows = await threadRepo.listByAdopter(userId);
      return Promise.all(rows.map((row) => toThreadView(row, userId)));
    },

    async get(userId: string, threadId: string) {
      const { thread, isStaff } = await requireThreadAccess(userId, threadId);
      const view = await toThreadView(thread, userId);
      const siblings = await threadRepo.listByShelterAdopter(thread.shelterId, thread.adopterUserId);
      const prior = siblings
        .filter((row) => row.id !== thread.id)
        .map((row) => ({
          id: row.id,
          animal_id: row.animalId,
          last_message_at: row.lastMessageAt.toISOString(),
        }));
      const animalNames = new Map<string, string>();
      for (const row of prior) {
        const animal = await animalRepo.findById(row.animal_id);
        animalNames.set(row.id, animal?.name ?? "");
      }
      return {
        ...view,
        prior: prior.map((row) => ({
          ...row,
          animal_name: animalNames.get(row.id) ?? "",
        })),
        grant: isStaff
          ? {
              email: thread.emailGranted ? thread.grantEmail : null,
              profile: thread.profileGranted ? thread.grantProfile : null,
              granted_at: thread.grantedAt ? thread.grantedAt.toISOString() : null,
            }
          : undefined,
      };
    },

    async listMessages(userId: string, threadId: string, after?: string) {
      await requireThreadAccess(userId, threadId);
      let afterDate: Date | undefined;
      if (after) {
        const previous = await messageRepo.findById(after);
        if (previous && previous.threadId === threadId) {
          afterDate = previous.createdAt;
        }
      }
      const rows = await messageRepo.listByThread(threadId, afterDate);
      return rows.map(toMessageView);
    },

    async postMessage(userId: string, threadId: string, input: unknown) {
      const { thread, isStaff } = await requireThreadAccess(userId, threadId);
      const shelter = await shelterRepo.findById(thread.shelterId);
      const animal = await animalRepo.findById(thread.animalId);
      if (shelter?.verificationStatus === "rejected" || animal?.status === "found_home") {
        throw new HTTPException(409, { message: "thread closed" });
      }
      const data = createMessageSchema.parse(input);
      const row = await messageRepo.create({
        threadId,
        authorUserId: userId,
        kind: "user",
        body: data.body,
      });
      if (!row) {
        throw new HTTPException(500, { message: "something wen't wrong" });
      }
      await threadRepo.update(threadId, {
        lastMessageAt: new Date(),
        unreadForShelter: !isStaff,
        unreadForAdopter: isStaff,
        archived: false,
      });
      const view = toMessageView(row);
      try {
        await chatRoomStub(env, threadId).fanout({ type: "message", message: view });
      } catch (error) {
        console.error(error);
      }
      return view;
    },

    async markRead(userId: string, threadId: string) {
      const { thread, isStaff } = await requireThreadAccess(userId, threadId);
      if (isStaff) {
        await threadReadRepo.upsert(threadId, userId, new Date());
        if (thread.unreadForShelter) {
          await threadRepo.update(threadId, { unreadForShelter: false });
        }
      }
      if (!isStaff && thread.unreadForAdopter) {
        await threadRepo.update(threadId, { unreadForAdopter: false });
      }
      return {};
    },

    async assign(userId: string, threadId: string, input: unknown) {
      const { thread, isStaff } = await requireThreadAccess(userId, threadId);
      if (!isStaff) {
        throw new HTTPException(403, { message: "insufficient privileges" });
      }
      const data = assignThreadSchema.parse(input);
      if (data.user_id) {
        const member = await staffOf(data.user_id, thread.shelterId);
        if (!member) {
          throw new HTTPException(404, { message: "member not found" });
        }
      }
      const updated = await threadRepo.update(threadId, { assignedUserId: data.user_id });
      return toThreadView(updated ?? thread, userId);
    },

    async archive(userId: string, threadId: string) {
      const { isStaff } = await requireThreadAccess(userId, threadId);
      if (!isStaff) {
        throw new HTTPException(403, { message: "insufficient privileges" });
      }
      await threadRepo.update(threadId, { archived: true });
      return {};
    },

    async application(userId: string, threadId: string) {
      const { thread, isStaff } = await requireThreadAccess(userId, threadId);
      if (!isStaff) {
        throw new HTTPException(404, { message: "not found" });
      }
      return {
        answers: thread.applicationAnswers ?? [],
        granted_at: thread.grantedAt ? thread.grantedAt.toISOString() : null,
      };
    },

    async existingForAnimal(userId: string, animalId: string) {
      const row = await threadRepo.findByAnimalAdopter(animalId, userId);
      return row ? { thread_id: row.id } : { thread_id: null };
    },

    async interestContext(userId: string, animalId: string) {
      const animal = await animalRepo.findById(animalId);
      if (!animal || animal.status !== "live") {
        throw new HTTPException(404, { message: "animal not found" });
      }
      const shelter = await shelterRepo.findById(animal.shelterId);
      if (!shelter) {
        throw new HTTPException(404, { message: "animal not found" });
      }
      const existing = await threadRepo.findByAnimalAdopter(animalId, userId);
      const others = (await threadRepo.listByShelterAdopter(shelter.id, userId)).filter(
        (row) => row.animalId !== animalId,
      );
      const otherNames: string[] = [];
      for (const row of others) {
        const other = await animalRepo.findById(row.animalId);
        if (other) otherNames.push(other.name);
      }
      return {
        animal_id: animal.id,
        animal_name: animal.name,
        shelter_id: shelter.id,
        org_name: shelter.orgName,
        city: shelter.city,
        thread_id: existing?.id ?? null,
        other_animals: otherNames,
        fields: asForm(shelter.applicationForm).filter((field) => !field.hidden),
      };
    },
  };
}
