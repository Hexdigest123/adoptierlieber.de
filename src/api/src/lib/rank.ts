import type { Animal, User } from "../types";
import { haversineKm } from "./distance";

const SKIP_WEIGHT = 0.3;
const HALF_LIFE_DAYS = 30;
const UPDATED_AT_KEY = "_updated_at";

export type RankedAnimal = {
  animal: Animal;
  score: number;
  implicit: number;
  waiting: number;
  longStay: boolean;
  senior: boolean;
  bucket: string;
};

export type PrefSpeciesTag = "dog" | "cat" | "small" | "bird" | "open";

export type UserPreferences = {
  species?: PrefSpeciesTag | PrefSpeciesTag[] | string;
  home?: string;
  with?: unknown;
  lifestyle?: string;
};

function prefSpeciesTags(raw: unknown): PrefSpeciesTag[] {
  const parts = typeof raw === "string" ? [raw] : Array.isArray(raw) ? raw : [];
  const out: PrefSpeciesTag[] = [];
  for (const part of parts) {
    if (
      (part === "dog" || part === "cat" || part === "small" || part === "bird" || part === "open") &&
      !out.includes(part)
    ) {
      out.push(part);
    }
  }
  return out;
}

/** null = open / no species filter. */
export function prefSpeciesExpanded(raw: unknown): Animal["species"][] | null {
  const tags = prefSpeciesTags(raw);
  if (tags.length === 0 || tags.includes("open")) return null;
  const out: Animal["species"][] = [];
  for (const tag of tags) {
    if (tag === "small") out.push("rabbit", "guinea_pig");
    else if (tag === "dog" || tag === "cat" || tag === "bird") out.push(tag);
  }
  return out.length > 0 ? out : null;
}

function ageBucket(months: number | null): string {
  if (months == null) return "unknown";
  if (months < 6) return "baby";
  if (months < 24) return "young";
  if (months < 84) return "adult";
  return "senior";
}

function traitKeys(animal: Animal): string[] {
  // coat color stays a catalog filter; swipe taste must not learn it
  const keys = [`species:${animal.species}`, `age:${ageBucket(animal.ageMonths)}`];
  if (animal.size) keys.push(`size:${animal.size}`);
  for (const trait of animal.traits ?? []) {
    keys.push(`trait:${trait.toLowerCase()}`);
  }
  return keys;
}

function decayWeights(weights: Record<string, number>, now: number): Record<string, number> {
  const prev = weights[UPDATED_AT_KEY];
  if (!prev || !Number.isFinite(prev)) {
    return { ...weights, [UPDATED_AT_KEY]: now };
  }
  const days = Math.max(0, (now - prev) / (24 * 60 * 60 * 1000));
  const factor = 0.5 ** (days / HALF_LIFE_DAYS);
  const next: Record<string, number> = { [UPDATED_AT_KEY]: now };
  for (const [key, value] of Object.entries(weights)) {
    if (key === UPDATED_AT_KEY || key.startsWith("color:")) continue;
    const scaled = value * factor;
    if (Math.abs(scaled) >= 0.01) next[key] = scaled;
  }
  return next;
}

export function applyTaste(
  weights: Record<string, number> | null | undefined,
  animal: Animal,
  action: "like" | "skip" | "undo",
  previous?: "like" | "skip",
): Record<string, number> {
  const now = Date.now();
  let next = decayWeights(weights ?? {}, now);
  const keys = traitKeys(animal);

  if (action === "undo") {
    const reverse = previous === "like" ? -1 : previous === "skip" ? SKIP_WEIGHT : 0;
    if (reverse !== 0) {
      for (const key of keys) {
        next[key] = (next[key] ?? 0) + reverse;
      }
    }
    return next;
  }

  const delta = action === "like" ? 1 : -SKIP_WEIGHT;
  for (const key of keys) {
    next[key] = (next[key] ?? 0) + delta;
  }
  return next;
}

function prefsOverlap(prefs: UserPreferences | null | undefined, animal: Animal): number {
  if (!prefs) return 0.5;
  let hits = 0;
  let checks = 0;

  const wanted = prefSpeciesExpanded(prefs.species);
  if (wanted) {
    checks += 1;
    if (wanted.includes(animal.species)) hits += 1;
  }

  const withWho = Array.isArray(prefs.with)
    ? prefs.with.filter((v) => typeof v === "string" && v !== "kids")
    : [];
  if (withWho.length > 0) {
    checks += 1;
    const traits = (animal.traits ?? []).map((t) => t.toLowerCase());
    const matched = withWho.some((tag) => {
      if (tag === "dog") return traits.some((t) => t.includes("hund") || t.includes("dog"));
      if (tag === "cat") return traits.some((t) => t.includes("katze") || t.includes("cat"));
      if (tag === "alone") return traits.some((t) => t.includes("allein") || t.includes("single"));
      return false;
    });
    if (matched) hits += 1;
  }

  if (prefs.lifestyle) {
    checks += 1;
    const traits = (animal.traits ?? []).map((t) => t.toLowerCase());
    if (prefs.lifestyle === "active") {
      if (traits.some((t) => t.includes("aktiv") || t.includes("energie") || t.includes("active"))) {
        hits += 1;
      }
    } else if (prefs.lifestyle === "cuddle") {
      if (traits.some((t) => t.includes("schmus") || t.includes("ruhig") || t.includes("cuddle"))) {
        hits += 1;
      }
    } else if (prefs.lifestyle === "first") {
      if (traits.some((t) => t.includes("anfänger") || t.includes("first") || t.includes("easy"))) {
        hits += 1;
      }
    }
  }

  if (checks === 0) return 0.5;
  return hits / checks;
}

function implicitAffinity(weights: Record<string, number> | null | undefined, animal: Animal): number {
  if (!weights) return 0.5;
  const keys = traitKeys(animal);
  let sum = 0;
  let n = 0;
  for (const key of keys) {
    const value = weights[key];
    if (value == null) continue;
    sum += value;
    n += 1;
  }
  if (n === 0) return 0.5;
  // squash roughly into 0..1
  return 1 / (1 + Math.exp(-sum / Math.max(1, n)));
}

function listedDays(publishedAt: Date | null, now: number): number {
  if (!publishedAt) return 0;
  return Math.max(0, (now - publishedAt.getTime()) / (24 * 60 * 60 * 1000));
}

function waitingBoost(days: number): number {
  if (days <= 0) return 0;
  return Math.min(1, Math.log1p(days) / Math.log1p(180));
}

function seniorBoost(months: number | null): number {
  if (months == null) return 0;
  if (months >= 84) return 1;
  if (months < 60) return 0;
  return (months - 60) / 24;
}

function freshness(days: number): number {
  return days > 0 && days <= 14 ? 1 : 0;
}

export function scoreAnimal(
  animal: Animal,
  user: User,
  origin: { lat: number; lng: number } | null,
  rangeKm: number | null,
  animalLat: number | null,
  animalLng: number | null,
  skipSenior = false,
): RankedAnimal {
  const now = Date.now();
  const prefs = (user.preferences ?? null) as UserPreferences | null;
  const explicit = prefsOverlap(prefs, animal);
  const rawImplicit = implicitAffinity(user.tasteWeights, animal);
  const implicit = 0.5 + (rawImplicit - 0.5) * 0.7;

  let distanceDecay = 0.5;
  if (origin && animalLat != null && animalLng != null) {
    const km = haversineKm(origin, { lat: animalLat, lng: animalLng });
    const scale = rangeKm && rangeKm > 0 ? rangeKm : 50;
    distanceDecay = 1 / (1 + km / scale);
  }

  const days = listedDays(animal.publishedAt, now);
  const waiting = waitingBoost(days);
  const senior = skipSenior ? 0 : seniorBoost(animal.ageMonths);

  const score =
    0.3 * explicit +
    0.18 * implicit +
    0.18 * distanceDecay +
    0.16 * waiting +
    0.12 * senior +
    0.06 * freshness(days);

  return {
    animal,
    score,
    implicit,
    waiting,
    longStay: days >= 90,
    senior: animal.ageMonths != null && animal.ageMonths >= 84,
    bucket: `${animal.species}:${animal.size ?? "u"}`,
  };
}

function fairnessScore(row: RankedAnimal): number {
  return row.waiting * (1 - row.implicit);
}

function needsFairSlot(row: RankedAnimal): boolean {
  return row.senior || row.longStay;
}

/** No more than 2 consecutive same species+size. Every 5th card: long stay taste would bury. */
export function diversify(ranked: RankedAnimal[]): RankedAnimal[] {
  const remaining = [...ranked];
  const out: RankedAnimal[] = [];

  while (remaining.length > 0) {
    const explore = out.length > 0 && (out.length + 1) % 5 === 0;
    let pickAt = -1;

    if (explore) {
      let best = -Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const value = fairnessScore(remaining[i]);
        if (value > best) {
          best = value;
          pickAt = i;
        }
      }
    }

    if (pickAt < 0) {
      const last = out[out.length - 1]?.bucket;
      const prev = out[out.length - 2]?.bucket;
      for (let i = 0; i < remaining.length; i++) {
        const bucket = remaining[i].bucket;
        if (last && prev && last === prev && bucket === last) continue;
        pickAt = i;
        break;
      }
      if (pickAt < 0) pickAt = 0;
    }

    const [picked] = remaining.splice(pickAt, 1);
    if (picked) out.push(picked);
  }

  const head = out.slice(0, 8);
  if (head.length === 8 && !head.some(needsFairSlot)) {
    const swapAt = out.findIndex((row, i) => i >= 8 && needsFairSlot(row));
    if (swapAt > 0) {
      const [fair] = out.splice(swapAt, 1);
      if (fair) out.splice(7, 0, fair);
    }
  }

  return out;
}
