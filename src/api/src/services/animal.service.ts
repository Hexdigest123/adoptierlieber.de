import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import {
  createAnimalSchema,
  createGroupSchema,
  createPairSchema,
  foundHomeSchema,
  photoReorderSchema,
  updateAnimalSchema,
} from "../lib/zod";
import { BOND_GROUP_MAX, bondLabel, partnersOf, type BondedPartner } from "../lib/bond";
import { SHELTER_ROLE } from "../lib/roles";
import { createAnimalRepo } from "../repositories/animal.repo";
import { createShelterRepo } from "../repositories/shelter.repo";
import { createThreadRepo } from "../repositories/thread.repo";
import { createMessageRepo } from "../repositories/message.repo";
import { createShelterService } from "./shelter.service";
import { publishMissing, toStaffAnimal } from "../lib/staff-animal";
import {
  ANIMAL_PHOTO_MAX,
  deleteAnimalPhoto,
  getAnimalPhotoObject,
  parseAnimalPhoto,
  parsePhotoSlot,
  putAnimalPhoto,
} from "../lib/animal-photo";
import type { AnimalWrite } from "../repositories/animal.repo";
import type { Animal, Shelter } from "../types";

function toWrite(data: {
  name?: string;
  species?: Animal["species"];
  breed?: string | null;
  sex?: Animal["sex"];
  age_months?: number | null;
  age_unknown?: boolean;
  size?: Animal["size"];
  colors?: string[] | null;
  traits?: string[] | null;
  tagline?: string | null;
  description?: string | null;
  vaccinated?: Animal["vaccinated"];
  neutered?: Animal["neutered"];
  chipped?: Animal["chipped"];
  house_trained?: Animal["houseTrained"];
  bonded_partner?: string | null;
  bonded_animal_id?: string | null;
  bond_group_id?: string | null;
}): Partial<AnimalWrite> {
  return {
    ...(data.name !== undefined ? { name: data.name } : {}),
    ...(data.species !== undefined ? { species: data.species } : {}),
    ...(data.breed !== undefined ? { breed: data.breed } : {}),
    ...(data.sex !== undefined ? { sex: data.sex } : {}),
    ...(data.age_months !== undefined ? { ageMonths: data.age_months } : {}),
    ...(data.age_unknown !== undefined ? { ageUnknown: data.age_unknown } : {}),
    ...(data.size !== undefined ? { size: data.size } : {}),
    ...(data.colors !== undefined ? { colors: data.colors } : {}),
    ...(data.traits !== undefined ? { traits: data.traits } : {}),
    ...(data.tagline !== undefined ? { tagline: data.tagline } : {}),
    ...(data.description !== undefined ? { description: data.description } : {}),
    ...(data.vaccinated !== undefined ? { vaccinated: data.vaccinated } : {}),
    ...(data.neutered !== undefined ? { neutered: data.neutered } : {}),
    ...(data.chipped !== undefined ? { chipped: data.chipped } : {}),
    ...(data.house_trained !== undefined ? { houseTrained: data.house_trained } : {}),
    ...(data.bonded_partner !== undefined ? { bondedPartner: data.bonded_partner } : {}),
    ...(data.bonded_animal_id !== undefined ? { bondedAnimalId: data.bonded_animal_id } : {}),
    ...(data.bond_group_id !== undefined ? { bondGroupId: data.bond_group_id } : {}),
  };
}

export function createAnimalService(env: Env) {
  const animalRepo = createAnimalRepo(env);
  const shelterRepo = createShelterRepo(env);
  const threadRepo = createThreadRepo(env);
  const messageRepo = createMessageRepo(env);
  const shelterService = createShelterService(env);

  async function requireOwned(userId: string, shelterId: string, animalId: string) {
    await shelterService.assertRole(userId, shelterId, SHELTER_ROLE.STAFF);
    const shelter = await shelterRepo.findById(shelterId);
    if (!shelter) {
      throw new HTTPException(404, { message: "shelter not found" });
    }
    const animal = await animalRepo.findById(animalId);
    if (!animal || animal.shelterId !== shelterId) {
      throw new HTTPException(404, { message: "animal not found" });
    }
    return { shelter, animal };
  }

  function assertWritable(shelter: Shelter) {
    if (shelter.verificationStatus === "rejected") {
      throw new HTTPException(403, { message: "shelter rejected" });
    }
  }

  async function partnersFor(animal: Animal): Promise<BondedPartner[]> {
    const grouped = animal.bondGroupId ? await animalRepo.listByBondGroup(animal.bondGroupId) : [];
    const byId = new Map(grouped.map((row) => [row.id, row]));
    if (animal.bondedAnimalId && !byId.has(animal.bondedAnimalId)) {
      const peer = await animalRepo.findById(animal.bondedAnimalId);
      if (peer) byId.set(peer.id, peer);
    }
    return partnersOf(animal, grouped, byId);
  }

  async function withCounts(animal: Animal) {
    const [threads, unread, bonded_partners] = await Promise.all([
      threadRepo.countByAnimalIds([animal.id]),
      threadRepo.countUnreadByAnimalIds([animal.id]),
      partnersFor(animal),
    ]);
    return toStaffAnimal(animal, {
      thread_count: Number(threads[0]?.n ?? 0),
      unread_threads: Number(unread[0]?.n ?? 0),
      bonded_partners,
    });
  }

  async function relabelGroup(members: Animal[]) {
    if (members.length < 2) {
      await Promise.all(
        members.map((row) =>
          animalRepo.update(row.id, {
            bondGroupId: null,
            bondedPartner: null,
            bondedAnimalId: null,
          }),
        ),
      );
      return;
    }
    const groupId = members.find((row) => row.bondGroupId)?.bondGroupId ?? crypto.randomUUID();
    await Promise.all(
      members.map((row) => {
        const others = members.filter((entry) => entry.id !== row.id);
        return animalRepo.update(row.id, {
          bondGroupId: groupId,
          bondedPartner: bondLabel(others),
          bondedAnimalId: others[0]?.id ?? null,
        });
      }),
    );
  }

  async function collectGroup(seedIds: string[]): Promise<Animal[]> {
    const unique = [...new Set(seedIds.filter(Boolean))];
    if (!unique.length) return [];
    const seeds = await animalRepo.findByIds(unique);
    const extraPeerIds = [
      ...new Set(
        seeds
          .map((row) => row.bondedAnimalId)
          .filter((id): id is string => Boolean(id))
          .filter((id) => !unique.includes(id)),
      ),
    ];
    const peers = await animalRepo.findByIds(extraPeerIds);
    const groupIds = [
      ...new Set(
        [...seeds, ...peers]
          .map((row) => row.bondGroupId)
          .filter((id): id is string => Boolean(id)),
      ),
    ];
    const grouped = await animalRepo.listByBondGroups(groupIds);
    const byId = new Map<string, Animal>();
    for (const row of [...seeds, ...peers, ...grouped]) byId.set(row.id, row);
    return [...byId.values()];
  }

  async function joinGroup(shelterId: string, seedIds: string[]) {
    const members = await collectGroup(seedIds);
    if (members.some((row) => row.shelterId !== shelterId)) {
      throw new HTTPException(400, { message: "invalid partner" });
    }
    if (members.length > BOND_GROUP_MAX) {
      throw new HTTPException(400, { message: "bond group too large" });
    }
    await relabelGroup(members);
  }

  async function setPartners(shelterId: string, animal: Animal, partnerIds: string[]) {
    const current = await collectGroup([animal.id, animal.bondedAnimalId ?? ""]);
    const incoming = await collectGroup(partnerIds);
    if ([...current, ...incoming].some((row) => row.shelterId !== shelterId)) {
      throw new HTTPException(400, { message: "invalid partner" });
    }
    const keep = new Set([animal.id, ...partnerIds]);
    const dropped = current.filter((row) => row.id !== animal.id && !keep.has(row.id));
    await Promise.all(
      dropped.map((row) =>
        animalRepo.update(row.id, {
          bondGroupId: null,
          bondedPartner: null,
          bondedAnimalId: null,
        }),
      ),
    );
    const byId = new Map<string, Animal>();
    for (const row of [...current.filter((entry) => keep.has(entry.id)), ...incoming, animal]) {
      byId.set(row.id, row);
    }
    if (byId.size > BOND_GROUP_MAX) {
      throw new HTTPException(400, { message: "bond group too large" });
    }
    await relabelGroup([...byId.values()]);
  }

  async function leaveGroup(animal: Animal) {
    if (!animal.bondGroupId && !animal.bondedAnimalId && !animal.bondedPartner) {
      return;
    }
    const remaining = (await collectGroup([animal.id, animal.bondedAnimalId ?? ""]))
      .filter((row) => row.id !== animal.id);
    await animalRepo.update(animal.id, {
      bondGroupId: null,
      bondedPartner: null,
      bondedAnimalId: null,
    });
    await relabelGroup(remaining);
  }

  function requestedPartnerIds(data: {
    bonded_animal_ids?: string[];
    bonded_animal_id?: string | null;
  }): string[] | undefined {
    if (data.bonded_animal_ids !== undefined) return data.bonded_animal_ids;
    if (data.bonded_animal_id !== undefined) {
      return data.bonded_animal_id ? [data.bonded_animal_id] : [];
    }
    return undefined;
  }

  return {
    async create(userId: string, shelterId: string, input: unknown) {
      await shelterService.assertRole(userId, shelterId, SHELTER_ROLE.STAFF);
      const shelter = await shelterRepo.findById(shelterId);
      if (!shelter) {
        throw new HTTPException(404, { message: "shelter not found" });
      }
      assertWritable(shelter);
      const data = createAnimalSchema.parse(input);
      const partnerIds = requestedPartnerIds(data);
      const row = await animalRepo.create({
        shelterId,
        name: data.name,
        species: data.species,
        breed: data.breed ?? null,
        sex: data.sex ?? null,
        ageMonths: data.age_months ?? null,
        ageUnknown: data.age_unknown ?? false,
        size: data.size ?? null,
        colors: data.colors ?? null,
        traits: data.traits ?? null,
        tagline: data.tagline ?? null,
        description: data.description ?? null,
        vaccinated: data.vaccinated ?? null,
        neutered: data.neutered ?? null,
        chipped: data.chipped ?? null,
        houseTrained: data.house_trained ?? null,
        bondedPartner: partnerIds?.length
          ? data.bonded_partner ?? null
          : partnerIds === undefined
            ? data.bonded_partner ?? null
            : null,
        bondedAnimalId:
          partnerIds?.[0] ?? (partnerIds === undefined ? data.bonded_animal_id ?? null : null),
        status: "draft",
      });
      if (!row) {
        throw new HTTPException(500, { message: "something wen't wrong" });
      }
      if (partnerIds?.length) {
        await joinGroup(shelterId, [row.id, ...partnerIds]);
      }
      const checklist =
        shelter.checklist && typeof shelter.checklist === "object" ? shelter.checklist : {};
      if (!("first_animal" in checklist && checklist.first_animal)) {
        await shelterRepo.update(shelterId, {
          checklist: { ...checklist, first_animal: true },
        });
      }
      const fresh = await animalRepo.findById(row.id);
      return withCounts(fresh ?? row);
    },

    async get(userId: string, shelterId: string, animalId: string) {
      const { animal } = await requireOwned(userId, shelterId, animalId);
      return withCounts(animal);
    },

    async update(userId: string, shelterId: string, animalId: string, input: unknown) {
      const { shelter, animal } = await requireOwned(userId, shelterId, animalId);
      assertWritable(shelter);
      if (animal.status === "found_home") {
        throw new HTTPException(409, { message: "animal found a home" });
      }
      const data = updateAnimalSchema.parse(input);
      const write = toWrite(data);
      delete write.bondedPartner;
      delete write.bondedAnimalId;
      delete write.bondGroupId;
      const updated = await animalRepo.update(animalId, write);
      if (!updated) {
        throw new HTTPException(404, { message: "animal not found" });
      }
      const partnerIds = requestedPartnerIds(data);
      if (partnerIds !== undefined) {
        if (partnerIds.length === 0) {
          await leaveGroup(updated);
          if (data.bonded_partner) {
            await animalRepo.update(animalId, {
              bondedPartner: data.bonded_partner,
              bondedAnimalId: null,
              bondGroupId: null,
            });
          }
        } else {
          await setPartners(shelterId, updated, partnerIds);
        }
      } else if (data.bonded_partner !== undefined && !updated.bondGroupId) {
        await animalRepo.update(animalId, {
          bondedPartner: data.bonded_partner,
          bondedAnimalId: null,
        });
      } else if (data.name !== undefined && (updated.bondGroupId || updated.bondedAnimalId)) {
        await joinGroup(shelterId, [updated.id, updated.bondedAnimalId ?? ""]);
      }
      const fresh = await animalRepo.findById(animalId);
      return withCounts(fresh ?? updated);
    },

    async remove(userId: string, shelterId: string, animalId: string) {
      const { shelter, animal } = await requireOwned(userId, shelterId, animalId);
      assertWritable(shelter);
      if (animal.status !== "draft") {
        throw new HTTPException(409, { message: "only drafts can be deleted" });
      }
      const threads = await threadRepo.countByAnimalIds([animalId]);
      if (Number(threads[0]?.n ?? 0) > 0) {
        throw new HTTPException(409, { message: "animal has threads" });
      }
      for (const key of animal.photos ?? []) {
        const slot = Number(key.split("/").at(-1));
        if (Number.isInteger(slot)) {
          await deleteAnimalPhoto(env, animalId, slot);
        }
      }
      const remaining = (await collectGroup([animal.id, animal.bondedAnimalId ?? ""])).filter(
        (row) => row.id !== animal.id,
      );
      await animalRepo.delete(animalId);
      await relabelGroup(remaining);
      return {};
    },

    async publish(userId: string, shelterId: string, animalId: string) {
      const { shelter, animal } = await requireOwned(userId, shelterId, animalId);
      assertWritable(shelter);
      if (shelter.verificationStatus !== "verified") {
        throw new HTTPException(403, { message: "shelter not verified" });
      }
      if (animal.status === "found_home") {
        throw new HTTPException(409, { message: "animal found a home" });
      }
      if (animal.status === "live") {
        return withCounts(animal);
      }
      const missing = publishMissing(animal);
      if (missing.length) {
        throw new HTTPException(400, { message: `missing ${missing.join(",")}` });
      }
      const updated = await animalRepo.update(animalId, {
        status: "live",
        publishedAt: animal.publishedAt ?? new Date(),
      });
      if (!updated) {
        throw new HTTPException(404, { message: "animal not found" });
      }
      return withCounts(updated);
    },

    async unpublish(userId: string, shelterId: string, animalId: string) {
      const { shelter, animal } = await requireOwned(userId, shelterId, animalId);
      assertWritable(shelter);
      if (animal.status !== "live") {
        throw new HTTPException(409, { message: "animal not live" });
      }
      const updated = await animalRepo.update(animalId, { status: "draft" });
      if (!updated) {
        throw new HTTPException(404, { message: "animal not found" });
      }
      return withCounts(updated);
    },

    async markHome(userId: string, shelterId: string, animalId: string, input: unknown) {
      const { shelter, animal } = await requireOwned(userId, shelterId, animalId);
      assertWritable(shelter);
      if (animal.status === "found_home") {
        return withCounts(animal);
      }
      const data = foundHomeSchema.parse(input ?? {});
      const updated = await animalRepo.update(animalId, {
        status: "found_home",
        foundHomeAt: new Date(),
        foundHomeNote: data.note ?? null,
      });
      if (!updated) {
        throw new HTTPException(404, { message: "animal not found" });
      }
      const threads = await threadRepo.listByShelter(shelterId);
      for (const thread of threads) {
        if (thread.animalId !== animalId) continue;
        await messageRepo.create({
          threadId: thread.id,
          authorUserId: null,
          kind: "system",
          body: "found_home",
        });
        await threadRepo.update(thread.id, {
          lastMessageAt: new Date(),
          unreadForAdopter: true,
        });
      }
      return withCounts(updated);
    },

    async putPhoto(userId: string, shelterId: string, animalId: string, file: File) {
      const { shelter, animal } = await requireOwned(userId, shelterId, animalId);
      assertWritable(shelter);
      if (animal.status === "found_home") {
        throw new HTTPException(409, { message: "animal found a home" });
      }
      const photos = [...(animal.photos ?? [])];
      if (photos.length >= ANIMAL_PHOTO_MAX) {
        throw new HTTPException(400, { message: "too many photos" });
      }
      const used = new Set(photos.map((key) => Number(key.split("/").at(-1))));
      let slot = 0;
      while (used.has(slot) && slot < ANIMAL_PHOTO_MAX) slot += 1;
      const parsed = await parseAnimalPhoto(file);
      const key = await putAnimalPhoto(env, animalId, slot, parsed);
      photos.push(key);
      const updated = await animalRepo.update(animalId, { photos });
      if (!updated) {
        throw new HTTPException(404, { message: "animal not found" });
      }
      return withCounts(updated);
    },

    async deletePhoto(userId: string, shelterId: string, animalId: string, slotRaw: string) {
      const { shelter, animal } = await requireOwned(userId, shelterId, animalId);
      assertWritable(shelter);
      if (animal.status === "found_home") {
        throw new HTTPException(409, { message: "animal found a home" });
      }
      const slot = parsePhotoSlot(slotRaw);
      const key = `animals/${animalId}/${slot}`;
      const photos = (animal.photos ?? []).filter((entry) => entry !== key);
      await deleteAnimalPhoto(env, animalId, slot);
      const updated = await animalRepo.update(animalId, { photos });
      if (!updated) {
        throw new HTTPException(404, { message: "animal not found" });
      }
      return withCounts(updated);
    },

    async reorderPhotos(userId: string, shelterId: string, animalId: string, input: unknown) {
      const { shelter, animal } = await requireOwned(userId, shelterId, animalId);
      assertWritable(shelter);
      const data = photoReorderSchema.parse(input);
      const current = new Set(animal.photos ?? []);
      if (data.photos.length !== current.size || data.photos.some((key) => !current.has(key))) {
        throw new HTTPException(400, { message: "invalid photo" });
      }
      const updated = await animalRepo.update(animalId, { photos: data.photos });
      if (!updated) {
        throw new HTTPException(404, { message: "animal not found" });
      }
      return withCounts(updated);
    },

    async clone(userId: string, shelterId: string, animalId: string) {
      const { shelter, animal } = await requireOwned(userId, shelterId, animalId);
      assertWritable(shelter);
      if (animal.status !== "found_home") {
        throw new HTTPException(409, { message: "only found_home can be cloned" });
      }
      const copy = await animalRepo.create({
        shelterId,
        name: animal.name,
        species: animal.species,
        breed: animal.breed,
        sex: animal.sex,
        ageMonths: animal.ageMonths,
        ageUnknown: animal.ageUnknown,
        size: animal.size,
        colors: animal.colors,
        traits: animal.traits,
        tagline: animal.tagline,
        description: animal.description,
        vaccinated: animal.vaccinated,
        neutered: animal.neutered,
        chipped: animal.chipped,
        houseTrained: animal.houseTrained,
        bondedPartner: null,
        bondedAnimalId: null,
        bondGroupId: null,
        status: "draft",
        photos: [],
      });
      if (!copy) {
        throw new HTTPException(500, { message: "something wen't wrong" });
      }
      return withCounts(copy);
    },

    async createPair(userId: string, shelterId: string, input: unknown) {
      const data = createPairSchema.parse(input);
      const group = await this.createGroup(userId, shelterId, { members: [data.a, data.b] });
      return { a: group.members[0], b: group.members[1] };
    },

    async createGroup(userId: string, shelterId: string, input: unknown) {
      await shelterService.assertRole(userId, shelterId, SHELTER_ROLE.STAFF);
      const shelter = await shelterRepo.findById(shelterId);
      if (!shelter) {
        throw new HTTPException(404, { message: "shelter not found" });
      }
      assertWritable(shelter);
      const data = createGroupSchema.parse(input);
      const created = [];
      for (const member of data.members) {
        created.push(
          await this.create(userId, shelterId, {
            ...member,
            bonded_animal_id: null,
            bonded_animal_ids: [],
            bonded_partner: null,
          }),
        );
      }
      const ids = created.map((row) => row.id);
      await joinGroup(shelterId, ids);
      const members = [];
      for (const id of ids) {
        const fresh = await animalRepo.findById(id);
        if (fresh) members.push(await withCounts(fresh));
      }
      return { members };
    },

    async getPhoto(animalId: string, slotRaw: string) {
      const slot = parsePhotoSlot(slotRaw);
      const animal = await animalRepo.findById(animalId);
      if (!animal) {
        throw new HTTPException(404, { message: "animal not found" });
      }
      const key = `animals/${animalId}/${slot}`;
      if (!(animal.photos ?? []).includes(key)) {
        throw new HTTPException(404, { message: "photo not found" });
      }
      return getAnimalPhotoObject(env, animalId, slot);
    },
  };
}
