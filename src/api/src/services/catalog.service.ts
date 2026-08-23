import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import { haversineKm } from "../lib/distance";
import { parseListQuery, listEnvelope, type ListEnvelope } from "../lib/pagination";
import {
  toPublicAnimal,
  toPublicExcerpt,
  type PublicAnimal,
  type PublicExcerpt,
} from "../lib/public-animal";
import { partnerMap, type BondedPartner } from "../lib/bond";
import { applyTaste, diversify, scoreAnimal } from "../lib/rank";
import { animalSpeciesSchema } from "../lib/zod";
import { createAnimalRepo } from "../repositories/animal.repo";
import { createCatalogRepo, type AnimalWithShelter } from "../repositories/catalog.repo";
import { createUserRepo } from "../repositories/user.repo";
import type { Animal, User } from "../types";

const SKIP_COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

export type CatalogFilters = {
  q?: string;
  breed?: string;
  species: Animal["species"][];
  sex?: Animal["sex"];
  size?: Animal["size"];
  status?: "live" | "found_home";
  min_age?: number;
  max_age?: number;
  good_with: string[];
  colors: string[];
  special_needs?: "include" | "only" | "exclude";
  range?: number | null;
  sort: "best" | "distance" | "new";
  mode: "deck" | "map" | "search";
};

function originOf(user: User): { lat: number; lng: number } | null {
  if (user.homeLat != null && user.homeLng != null) {
    return { lat: user.homeLat, lng: user.homeLng };
  }
  return null;
}

function parseSpecies(raw: string | null): Animal["species"][] {
  if (!raw) return [];
  const out: Animal["species"][] = [];
  for (const part of raw.split(",")) {
    const parsed = animalSpeciesSchema.safeParse(part.trim());
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

export function parseCatalogFilters(search: URLSearchParams): CatalogFilters {
  const species = parseSpecies(search.get("species"));
  const sexRaw = search.get("sex");
  const sizeRaw = search.get("size");
  const statusRaw = search.get("status");
  const sortRaw = search.get("sort");
  const modeRaw = search.get("mode");
  const rangeRaw = search.get("range");
  const minAge = search.get("min_age");
  const maxAge = search.get("max_age");
  const goodWith = (search.get("good_with") ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const colors = (search.get("colors") ?? "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const specialRaw = search.get("special_needs");

  const range =
    rangeRaw === "unlimited" || rangeRaw === "∞" || rangeRaw === "inf"
      ? null
      : rangeRaw != null && rangeRaw !== ""
        ? Number(rangeRaw)
        : undefined;

  return {
    q: search.get("q")?.trim() || undefined,
    breed: search.get("breed")?.trim() || undefined,
    species,
    sex: sexRaw === "male" || sexRaw === "female" || sexRaw === "unknown" ? sexRaw : undefined,
    size: sizeRaw === "s" || sizeRaw === "m" || sizeRaw === "l" || sizeRaw === "xl" ? sizeRaw : undefined,
    status: statusRaw === "found_home" ? "found_home" : statusRaw === "live" ? "live" : undefined,
    min_age: minAge != null && Number.isFinite(Number(minAge)) ? Number(minAge) : undefined,
    max_age: maxAge != null && Number.isFinite(Number(maxAge)) ? Number(maxAge) : undefined,
    good_with: goodWith,
    colors,
    special_needs:
      specialRaw === "only" || specialRaw === "exclude" || specialRaw === "include"
        ? specialRaw
        : undefined,
    range: range !== undefined && (range === null || Number.isFinite(range)) ? range : undefined,
    sort: sortRaw === "distance" || sortRaw === "new" ? sortRaw : "best",
    mode: modeRaw === "map" || modeRaw === "search" ? modeRaw : "deck",
  };
}

function matchesQuery(row: AnimalWithShelter, q: string): boolean {
  const hay = `${row.animal.name} ${row.animal.breed ?? ""} ${row.animal.tagline ?? ""} ${row.shelter.city} ${row.shelter.orgName}`.toLowerCase();
  return hay.includes(q.toLowerCase());
}

function matchesGoodWith(animal: Animal, tags: string[]): boolean {
  if (tags.length === 0) return true;
  const traits = (animal.traits ?? []).map((t) => t.toLowerCase());
  return tags.every((tag) => {
    if (tag === "kids" || tag === "kinder") {
      return traits.some((t) => t.includes("kind") || t.includes("kid"));
    }
    if (tag === "dogs" || tag === "hunde" || tag === "dog") {
      return traits.some((t) => t.includes("hund") || t.includes("dog"));
    }
    if (tag === "cats" || tag === "katzen" || tag === "cat") {
      return traits.some((t) => t.includes("katze") || t.includes("cat"));
    }
    return traits.includes(tag);
  });
}

function applyHardFilters(
  rows: AnimalWithShelter[],
  filters: CatalogFilters,
  user: User,
  origin: { lat: number; lng: number } | null,
): AnimalWithShelter[] {
  const rangeKm = filters.range !== undefined ? filters.range : user.maxRangeKm;
  return rows.filter((row) => {
    if (row.shelter.archivedAt) return false;
    if (filters.status) {
      if (row.animal.status !== filters.status) return false;
    } else if (row.animal.status !== "live") {
      return false;
    }
    if (filters.species.length > 0 && !filters.species.includes(row.animal.species)) return false;
    if (filters.sex && row.animal.sex !== filters.sex) return false;
    if (filters.size && row.animal.size !== filters.size) return false;
    if (filters.q && !matchesQuery(row, filters.q)) return false;
    if (filters.breed) {
      const breed = row.animal.breed?.toLowerCase() ?? "";
      if (!breed.includes(filters.breed.toLowerCase())) return false;
    }
    if (!matchesGoodWith(row.animal, filters.good_with)) return false;
    if (filters.colors.length > 0) {
      const have = (row.animal.colors ?? []).map((c) => c.toLowerCase());
      if (!filters.colors.every((c) => have.includes(c))) return false;
    }
    if (filters.special_needs && filters.special_needs !== "include") {
      const traits = (row.animal.traits ?? []).map((t) => t.toLowerCase());
      const special = traits.some(
        (t) => t.includes("handicap") || t.includes("special") || t.includes("bedarf"),
      );
      if (filters.special_needs === "only" && !special) return false;
      if (filters.special_needs === "exclude" && special) return false;
    }
    if (filters.min_age != null) {
      if (row.animal.ageMonths == null || row.animal.ageMonths < filters.min_age) return false;
    }
    if (filters.max_age != null) {
      if (row.animal.ageMonths == null || row.animal.ageMonths > filters.max_age) return false;
    }
    if (rangeKm != null && origin && row.shelter.lat != null && row.shelter.lng != null) {
      if (haversineKm(origin, { lat: row.shelter.lat, lng: row.shelter.lng }) > rangeKm) {
        return false;
      }
    }
    return true;
  });
}

function seedSpecies(user: User): Animal["species"][] | null {
  const prefs = user.preferences;
  if (!prefs || typeof prefs !== "object") return null;
  const species = prefs.species;
  if (typeof species !== "string" || species === "open") return null;
  if (species === "small") return ["rabbit", "guinea_pig"];
  if (species === "dog" || species === "cat" || species === "bird") return [species];
  return null;
}

export function createCatalogService(env: Env) {
  const catalog = createCatalogRepo(env);
  const animals = createAnimalRepo(env);
  const users = createUserRepo(env);

  async function partnersFor(rows: Animal[]): Promise<Map<string, BondedPartner[]>> {
    const groupIds = [
      ...new Set(rows.map((row) => row.bondGroupId).filter((id): id is string => Boolean(id))),
    ];
    const extraIds = [
      ...new Set(rows.map((row) => row.bondedAnimalId).filter((id): id is string => Boolean(id))),
    ];
    const [grouped, extras] = await Promise.all([
      animals.listByBondGroups(groupIds),
      animals.findByIds(extraIds),
    ]);
    return partnerMap(rows, grouped, extras, true);
  }

  async function toPublic(
    rows: AnimalWithShelter[],
    user: User,
    liked: Set<string>,
  ): Promise<PublicAnimal[]> {
    const origin = originOf(user);
    const partners = await partnersFor(rows.map((row) => row.animal));
    return rows.map((row) => {
      const distance =
        origin && row.shelter.lat != null && row.shelter.lng != null
          ? haversineKm(origin, { lat: row.shelter.lat, lng: row.shelter.lng })
          : null;
      return toPublicAnimal(row.animal, row.shelter, {
        distance_km: distance,
        liked: liked.has(row.animal.id),
        bonded_partners: partners.get(row.animal.id) ?? [],
      });
    });
  }

  return {
    async excerpts(): Promise<PublicExcerpt[]> {
      const rows = (await catalog.listLiveRandom(10)).filter((row) => !row.shelter.archivedAt);
      return rows.map((row) => toPublicExcerpt(row.animal, row.shelter));
    },

    async breeds(speciesRaw: string, q: string): Promise<string[]> {
      const parsed = animalSpeciesSchema.safeParse(speciesRaw.trim());
      const rows = await catalog.listLive();
      const needle = q.trim().toLowerCase();
      const seen = new Set<string>();
      for (const row of rows) {
        const breed = row.animal.breed?.trim();
        if (!breed) continue;
        if (parsed.success && row.animal.species !== parsed.data) continue;
        if (needle && !breed.toLowerCase().includes(needle)) continue;
        seen.add(breed);
      }
      return [...seen].sort((a, b) => a.localeCompare(b)).slice(0, 20);
    },

    async list(
      userId: string,
      search: URLSearchParams,
    ): Promise<ListEnvelope<PublicAnimal> & { in_range: number }> {
      const user = await users.findById(userId);
      if (!user) throw new HTTPException(404, { message: "user not found" });

      const filters = parseCatalogFilters(search);
      const query = parseListQuery(search, filters.mode === "deck" ? 15 : 24);
      const origin = originOf(user);

      let rows = await catalog.listLive();
      if (filters.species.length === 0 && filters.mode === "deck") {
        const seeded = seedSpecies(user);
        if (seeded) {
          const narrowed = rows.filter((row) => seeded.includes(row.animal.species));
          if (narrowed.length > 0) rows = narrowed;
        }
      }

      rows = applyHardFilters(rows, filters, user, origin);

      const likedIds = new Set(await catalog.likedAnimalIds(userId));
      const skipIds = new Set(
        await catalog.recentSkipIds(userId, new Date(Date.now() - SKIP_COOLDOWN_MS)),
      );

      if (filters.mode === "deck") {
        rows = rows.filter((row) => !likedIds.has(row.animal.id) && !skipIds.has(row.animal.id));
      }

      const inRange = rows.length;

      if (filters.sort === "new") {
        rows.sort((a, b) => {
          const aAt = a.animal.publishedAt?.getTime() ?? 0;
          const bAt = b.animal.publishedAt?.getTime() ?? 0;
          return bAt - aAt;
        });
      } else if (filters.sort === "distance") {
        rows.sort((a, b) => {
          if (!origin) return 0;
          const da =
            a.shelter.lat != null && a.shelter.lng != null
              ? haversineKm(origin, { lat: a.shelter.lat, lng: a.shelter.lng })
              : Infinity;
          const db =
            b.shelter.lat != null && b.shelter.lng != null
              ? haversineKm(origin, { lat: b.shelter.lat, lng: b.shelter.lng })
              : Infinity;
          return da - db;
        });
      } else {
        const ranked = rows.map((row) =>
          scoreAnimal(row.animal, user, origin, user.maxRangeKm, row.shelter.lat, row.shelter.lng),
        );
        ranked.sort((a, b) => b.score - a.score);
        const ordered = filters.mode === "deck" ? diversify(ranked) : ranked;
        const byId = new Map(rows.map((row) => [row.animal.id, row]));
        rows = ordered
          .map((item) => byId.get(item.animal.id))
          .filter((row): row is AnimalWithShelter => row !== undefined);
      }

      const page = rows.slice(query.offset, query.offset + query.per_page);
      const items = await toPublic(page, user, likedIds);
      return { ...listEnvelope(items, rows.length, query), in_range: inRange };
    },

    async sitemap(): Promise<{ id: string; updated_at: string }[]> {
      const rows = await catalog.listLive();
      return rows
        .filter(
          (row) =>
            !row.shelter.archivedAt && row.shelter.verificationStatus === "verified",
        )
        .map((row) => ({
          id: row.animal.id,
          updated_at: row.animal.updatedAt.toISOString(),
        }));
    },

    async publicGet(animalId: string): Promise<PublicAnimal> {
      const row = await catalog.findWithShelter(animalId);
      if (!row || row.animal.status === "draft" || row.shelter.archivedAt) {
        throw new HTTPException(404, { message: "animal not found" });
      }
      if (row.shelter.verificationStatus !== "verified") {
        throw new HTTPException(404, { message: "animal not found" });
      }
      const partners = await partnersFor([row.animal]);
      return toPublicAnimal(row.animal, row.shelter, {
        distance_km: null,
        liked: false,
        bonded_partners: partners.get(row.animal.id) ?? [],
      });
    },

    async get(userId: string, animalId: string): Promise<PublicAnimal> {
      const user = await users.findById(userId);
      if (!user) throw new HTTPException(404, { message: "user not found" });
      const row = await catalog.findWithShelter(animalId);
      if (!row || row.animal.status === "draft") {
        throw new HTTPException(404, { message: "animal not found" });
      }
      const like = await catalog.findLike(userId, animalId);
      const origin = originOf(user);
      const distance =
        origin && row.shelter.lat != null && row.shelter.lng != null
          ? haversineKm(origin, { lat: row.shelter.lat, lng: row.shelter.lng })
          : null;
      const partners = await partnersFor([row.animal]);
      return toPublicAnimal(row.animal, row.shelter, {
        distance_km: distance,
        liked: Boolean(like),
        bonded_partners: partners.get(row.animal.id) ?? [],
      });
    },

    async recordImpression(userId: string, animalId: string): Promise<void> {
      const row = await catalog.findWithShelter(animalId);
      if (!row || row.animal.status !== "live") {
        throw new HTTPException(404, { message: "animal not found" });
      }
      void userId;
      await animals.incrementImpressions(animalId);
      const day = new Date().toISOString().slice(0, 10);
      await catalog.incrementDailyImpression(animalId, day);
    },

    async getLike(userId: string, animalId: string): Promise<{ liked: boolean }> {
      const like = await catalog.findLike(userId, animalId);
      return { liked: Boolean(like) };
    },

    async like(userId: string, animalId: string): Promise<{ liked: boolean }> {
      const row = await catalog.findWithShelter(animalId);
      if (!row || row.animal.status === "draft") {
        throw new HTTPException(404, { message: "animal not found" });
      }
      if (row.animal.status !== "live") {
        throw new HTTPException(409, { message: "animal not available" });
      }
      const existing = await catalog.findLike(userId, animalId);
      if (existing) return { liked: true };
      await catalog.insertLike(userId, animalId);
      await animals.incrementLikes(animalId, 1);
      await catalog.insertSwipe(userId, animalId, "like");
      await applyTasteUpdate(users, userId, row.animal, "like");
      return { liked: true };
    },

    async unlike(userId: string, animalId: string): Promise<{ liked: boolean }> {
      const removed = await catalog.deleteLike(userId, animalId);
      if (removed) {
        await animals.incrementLikes(animalId, -1);
      }
      return { liked: false };
    },

    async likes(userId: string, search: URLSearchParams): Promise<ListEnvelope<PublicAnimal>> {
      const user = await users.findById(userId);
      if (!user) throw new HTTPException(404, { message: "user not found" });
      const query = parseListQuery(search, 24);
      const species = parseSpecies(search.get("species"));
      const sort = search.get("sort");
      let rows = await catalog.listLikes(userId);
      if (species.length > 0) {
        rows = rows.filter((row) => species.includes(row.animal.species));
      }
      const origin = originOf(user);
      if (sort === "distance" && origin) {
        rows.sort((a, b) => {
          const da =
            a.shelter.lat != null && a.shelter.lng != null
              ? haversineKm(origin, { lat: a.shelter.lat, lng: a.shelter.lng })
              : Infinity;
          const db =
            b.shelter.lat != null && b.shelter.lng != null
              ? haversineKm(origin, { lat: b.shelter.lat, lng: b.shelter.lng })
              : Infinity;
          return da - db;
        });
      } else if (sort === "name") {
        rows.sort((a, b) => a.animal.name.localeCompare(b.animal.name, "de"));
      }
      const page = rows.slice(query.offset, query.offset + query.per_page);
      const items = await toPublic(page, user, new Set(page.map((row) => row.animal.id)));
      return listEnvelope(items, rows.length, query);
    },

    async swipe(
      userId: string,
      input: { animal_id: string; action: "like" | "skip" | "undo"; reason?: string },
    ) {
      if (input.action === "undo") {
        const last = await catalog.lastSwipe(userId);
        if (!last || last.action === "undo") {
          throw new HTTPException(409, { message: "nothing to undo" });
        }
        await catalog.insertSwipe(userId, last.animalId, "undo");
        if (last.action === "like") {
          const removed = await catalog.deleteLike(userId, last.animalId);
          if (removed) await animals.incrementLikes(last.animalId, -1);
        }
        const row = await catalog.findWithShelter(last.animalId);
        if (row) {
          await applyTasteUpdate(
            users,
            userId,
            row.animal,
            "undo",
            last.action === "like" || last.action === "skip" ? last.action : undefined,
          );
        }
        return { undone: last.action, animal_id: last.animalId };
      }

      const row = await catalog.findWithShelter(input.animal_id);
      if (!row || row.animal.status !== "live") {
        throw new HTTPException(404, { message: "animal not found" });
      }
      await catalog.insertSwipe(
        userId,
        input.animal_id,
        input.action,
        input.action === "skip" ? (input.reason ?? null) : null,
      );
      if (input.action === "like") {
        const existing = await catalog.findLike(userId, input.animal_id);
        if (!existing) {
          await catalog.insertLike(userId, input.animal_id);
          await animals.incrementLikes(input.animal_id, 1);
        }
      }
      await applyTasteUpdate(users, userId, row.animal, input.action);
      return { action: input.action, animal_id: input.animal_id };
    },

    async resetSkips(userId: string): Promise<void> {
      await catalog.deleteSkipSwipes(userId);
    },

    async photo(animalId: string, index: number) {
      const row = await catalog.findWithShelter(animalId);
      if (!row || row.animal.status === "draft") return null;
      const keys = row.animal.photos ?? [];
      const key = keys[index];
      if (!key) return null;
      return env.adoptierlieber_images.get(key);
    },
  };
}

async function applyTasteUpdate(
  users: ReturnType<typeof createUserRepo>,
  userId: string,
  animal: Animal,
  action: "like" | "skip" | "undo",
  previous?: "like" | "skip",
): Promise<void> {
  const user = await users.findById(userId);
  if (!user) return;
  const next = applyTaste(user.tasteWeights, animal, action, previous);
  await users.updateProfile(userId, { tasteWeights: next });
}
