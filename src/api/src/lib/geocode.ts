import type { Env } from "../config/env";
import { haversineKm } from "./distance";

export type GeocodeResult = {
  lat: number;
  lng: number;
  label: string;
  country: string | null;
};

export type ReverseResult = {
  street: string | null;
  zip: string | null;
  city: string | null;
};

const DACH = new Set(["de", "at", "ch"]);
const PLACE_TYPES = new Set(["city", "postcode", "suburb", "district", "locality"]);
const MIN_CONFIDENCE = 0.8;
const PLACE_MATCH_KM = 2;
const FETCH_TIMEOUT_MS = 4000;
const PAUSE_MS = 5 * 60 * 1000;
const GEOAPIFY_URL = "https://api.geoapify.com/v1/geocode/";

/**
 * Edge cache (Workers Cache API) under synthetic keys; nothing is ever fetched
 * from this origin. Free and without KV's write quota, but per data center and
 * a no-op on workers.dev, where every miss simply goes upstream.
 */
const CACHE_ORIGIN = "https://geocode-cache.internal/v1/";
const HIT_TTL_SECONDS = 30 * 24 * 60 * 60;
// "No match" may be a gap the map data fills later.
const MISS_TTL_SECONDS = 24 * 60 * 60;

/**
 * Upstream calls per UTC day when GEOAPIFY_DAILY_BUDGET is unset. Assumes one
 * credit per geocode/reverse request against Geoapify's free 3,000 a day; the
 * gap absorbs KV's approximate count.
 */
const DEFAULT_DAILY_BUDGET = 2500;
const BUDGET_KEY_TTL_SECONDS = 2 * 24 * 60 * 60;

/** Lookups a single user's profile or shelter edits may trigger per hour. */
const USER_LOOKUPS_PER_WINDOW = 10;
const USER_WINDOW_SECONDS = 60 * 60;
// KV rejects expirations less than 60s away.
const KV_MIN_TTL_SECONDS = 60;

/** Per-isolate circuit breaker: after a 429/5xx/timeout, skip Geoapify until this time. */
let pausedUntil = 0;
/** This isolate's view of today's upstream count, so its own bursts count even if KV lags. */
let budgetDay = "";
let budgetFloor = 0;

type GeoapifyHit = {
  lat?: number;
  lon?: number;
  formatted?: string;
  country?: string;
  country_code?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  suburb?: string;
  district?: string;
  street?: string;
  housenumber?: string;
  result_type?: string;
  rank?: { confidence?: number };
};

type GeoapifySearchBody = {
  results?: GeoapifyHit[];
};

/** Geocoder not configured, paused, out of budget or failing, as opposed to "no match". */
export class GeocodeUnavailableError extends Error {}

function apiKey(env: Env): string | null {
  const key = (env.SECRET_GEOAPIFY ?? process.env.SECRET_GEOAPIFY)?.trim();
  return key || null;
}

/** Local mock server for development; deployed builds never read the override. */
function baseUrl(env: Env): string {
  if (process.env.NODE_ENV !== "development") return GEOAPIFY_URL;
  const override = (env.GEOAPIFY_BASE_URL ?? process.env.GEOAPIFY_BASE_URL)?.trim();
  if (!override) return GEOAPIFY_URL;
  let url: URL;
  try {
    url = new URL(override);
  } catch {
    return GEOAPIFY_URL;
  }
  // Loopback only, so the key can never be pointed at another host.
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) return GEOAPIFY_URL;
  return url.href.endsWith("/") ? url.href : `${url.href}/`;
}

function normalizeText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** ~100 m: nearby reverse lookups share one cache entry and one credit. */
function roundCoord(value: number): string {
  return value.toFixed(3);
}

function cacheKey(path: string, params: URLSearchParams): string {
  const sorted = new URLSearchParams([...params].sort(([a], [b]) => a.localeCompare(b)));
  return `${CACHE_ORIGIN}${path}?${sorted}`;
}

function edgeCache(): Cache | null {
  return typeof caches === "undefined" ? null : caches.default;
}

async function readCache(key: string): Promise<GeoapifyHit[] | null> {
  try {
    const res = await edgeCache()?.match(key);
    return res ? ((await res.json()) as GeoapifyHit[]) : null;
  } catch (err) {
    console.error("geocode cache read failed", err);
    return null;
  }
}

async function writeCache(key: string, hits: GeoapifyHit[]): Promise<void> {
  const ttl = hits.length ? HIT_TTL_SECONDS : MISS_TTL_SECONDS;
  try {
    await edgeCache()?.put(
      key,
      new Response(JSON.stringify(hits), {
        headers: { "content-type": "application/json", "cache-control": `max-age=${ttl}` },
      }),
    );
  } catch (err) {
    console.error("geocode cache write failed", err);
  }
}

/** Only the fields we read, so cache entries stay small. */
function slim(hit: GeoapifyHit): GeoapifyHit {
  return {
    lat: hit.lat,
    lon: hit.lon,
    formatted: hit.formatted,
    country: hit.country,
    country_code: hit.country_code,
    postcode: hit.postcode,
    city: hit.city,
    town: hit.town,
    village: hit.village,
    suburb: hit.suburb,
    district: hit.district,
    street: hit.street,
    housenumber: hit.housenumber,
    result_type: hit.result_type,
    rank: hit.rank ? { confidence: hit.rank.confidence } : undefined,
  };
}

function dailyBudget(env: Env): number {
  const raw = (env.GEOAPIFY_DAILY_BUDGET ?? process.env.GEOAPIFY_DAILY_BUDGET)?.trim();
  const value = raw ? Number(raw) : Number.NaN;
  return Number.isInteger(value) && value >= 0 ? value : DEFAULT_DAILY_BUDGET;
}

/**
 * Count one upstream call against today's global budget (a KV counter per UTC
 * day). Returns the pending counter write, or null once the budget is spent.
 * KV is not atomic and allows one write per key and second, so the count is
 * approximate and errs low under bursts from many isolates.
 */
async function reserveBudget(env: Env): Promise<{ written: Promise<void> } | null> {
  const day = new Date().toISOString().slice(0, 10);
  if (day !== budgetDay) {
    budgetDay = day;
    budgetFloor = 0;
  }
  const limit = dailyBudget(env);
  if (budgetFloor >= limit) return null;
  const key = `geo:budget:${day}`;
  // A failed read throws: without a count, stay closed rather than spend blind.
  const used = Math.max(Number(await env.RATE_LIMIT_KV.get(key)) || 0, budgetFloor);
  if (used >= limit) {
    budgetFloor = used;
    console.warn(`geoapify daily budget of ${limit} spent`);
    return null;
  }
  budgetFloor = used + 1;
  // Wrapped so the caller can fetch while the write is in flight.
  const written = env.RATE_LIMIT_KV.put(key, String(budgetFloor), {
    expirationTtl: BUDGET_KEY_TTL_SECONDS,
  }).catch((err: unknown) => console.error("geocode budget write failed", err));
  return { written };
}

/**
 * Per-user brake on the lookups profile and shelter edits trigger. A spent
 * allowance reads like an outage, so the edit still saves without coordinates.
 */
async function takeUserLookup(env: Env, userId: string): Promise<boolean> {
  const key = `geo:user:${userId}`;
  const now = Math.floor(Date.now() / 1000);
  try {
    const raw = await env.RATE_LIMIT_KV.get(key);
    const stored = raw ? (JSON.parse(raw) as { n: number; reset: number }) : null;
    const bucket =
      stored && stored.reset > now ? stored : { n: 0, reset: now + USER_WINDOW_SECONDS };
    if (bucket.n >= USER_LOOKUPS_PER_WINDOW) return false;
    bucket.n += 1;
    await env.RATE_LIMIT_KV.put(key, JSON.stringify(bucket), {
      expiration: Math.max(bucket.reset, now + KV_MIN_TTL_SECONDS),
    });
    return true;
  } catch (err) {
    console.error("geocode user limit failed", err);
    return false;
  }
}

function placeOf(hit: GeoapifyHit): string | undefined {
  return hit.city ?? hit.town ?? hit.village;
}

function postcodeOf(hit: GeoapifyHit): string | undefined {
  const zip = hit.postcode?.trim();
  if (!zip || zip.includes("–") || zip.includes("-")) return undefined;
  return zip;
}

function toPlaceResult(hit: GeoapifyHit): GeocodeResult | null {
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const type = hit.result_type ?? "";
  if (!PLACE_TYPES.has(type)) return null;
  if ((hit.rank?.confidence ?? 0) < MIN_CONFIDENCE) return null;
  const cc = hit.country_code?.toLowerCase();
  if (cc && !DACH.has(cc)) return null;
  const place = placeOf(hit);
  if (!place && type !== "postcode") return null;
  const suburb = hit.suburb ?? hit.district;
  const specific = suburb && place && suburb !== place ? `${suburb}, ${place}` : place;
  const label = [postcodeOf(hit), specific].filter(Boolean).join(" ");
  if (!label) return null;
  return {
    lat,
    lng,
    label,
    country: hit.country ?? null,
  };
}

function toResult(hit: GeoapifyHit, fallback: string): GeocodeResult | null {
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const label =
    [postcodeOf(hit), placeOf(hit)].filter(Boolean).join(" ") || hit.formatted || fallback;
  return {
    lat,
    lng,
    label,
    country: hit.country ?? null,
  };
}

/**
 * Cache first; otherwise Geoapify, if configured, not paused, within the
 * user's allowance and today's budget. Throws GeocodeUnavailableError
 * when any of those fails.
 */
async function geoapifyGet(
  env: Env,
  path: string,
  params: Record<string, string>,
  userId?: string,
): Promise<GeoapifyHit[]> {
  const search = new URLSearchParams(params);
  search.set("format", "json");
  search.set("lang", "de");
  const key = cacheKey(path, search);
  const cached = await readCache(key);
  if (cached) return cached;

  const secret = apiKey(env);
  if (!secret) {
    console.error("SECRET_GEOAPIFY missing, geocode skipped");
    throw new GeocodeUnavailableError("geocoder not configured");
  }
  if (Date.now() < pausedUntil) {
    throw new GeocodeUnavailableError("geoapify paused");
  }
  if (userId && !(await takeUserLookup(env, userId))) {
    throw new GeocodeUnavailableError("user lookup limit reached");
  }
  let counted: { written: Promise<void> } | null;
  try {
    counted = await reserveBudget(env);
  } catch (err) {
    console.error("geocode budget read failed", err);
    throw new GeocodeUnavailableError("budget unknown");
  }
  if (!counted) {
    throw new GeocodeUnavailableError("daily budget spent");
  }

  const url = new URL(path, baseUrl(env));
  url.search = search.toString();
  url.searchParams.set("apiKey", secret);
  let body: GeoapifySearchBody;
  try {
    const res = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      if (res.status === 429 || res.status >= 500) pausedUntil = Date.now() + PAUSE_MS;
      throw new GeocodeUnavailableError(`geoapify ${res.status}`);
    }
    body = (await res.json()) as GeoapifySearchBody;
  } catch (err) {
    if (err instanceof GeocodeUnavailableError) throw err;
    // Timeout or network failure: same treatment as a 5xx.
    pausedUntil = Date.now() + PAUSE_MS;
    throw new GeocodeUnavailableError("geoapify unreachable");
  } finally {
    await counted.written;
  }
  const hits = (body.results ?? []).map(slim);
  await writeCache(key, hits);
  return hits;
}

/** Address lookups for accounts and shelters treat an outage like "no match". */
async function orEmpty(lookup: Promise<GeoapifyHit[]>): Promise<GeoapifyHit[]> {
  try {
    return await lookup;
  } catch (err) {
    if (err instanceof GeocodeUnavailableError) return [];
    throw err;
  }
}

export async function geocodeQuery(
  env: Env,
  query: string,
  userId?: string,
): Promise<GeocodeResult[]> {
  const text = normalizeText(query);
  if (!text) return [];
  const hits = await geoapifyGet(
    env,
    "search",
    {
      text,
      limit: "5",
      type: "locality",
      filter: "countrycode:de,at,ch",
    },
    userId,
  );
  const seen = new Set<string>();
  const results: GeocodeResult[] = [];
  for (const hit of hits) {
    const item = toPlaceResult(hit);
    if (!item) continue;
    const key = `${item.label}|${item.lat.toFixed(3)}|${item.lng.toFixed(3)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    results.push(item);
  }
  return results;
}

export async function resolveHomePlace(
  env: Env,
  query: string,
  lat?: number,
  lng?: number,
  userId?: string,
): Promise<GeocodeResult | null> {
  // Throws GeocodeUnavailableError so callers can tell an outage from an unknown place.
  const hits = await geocodeQuery(env, query, userId);
  if (hits.length === 0) return null;
  if (lat == null || lng == null) return hits[0];
  return hits.find((hit) => haversineKm(hit, { lat, lng }) <= PLACE_MATCH_KM) ?? null;
}

/** Like geocodeAddress, but throws GeocodeUnavailableError on an outage (backfill job). */
export async function lookupAddress(
  env: Env,
  street: string,
  zip: string,
  city: string,
  userId?: string,
): Promise<GeocodeResult | null> {
  const hits = await geoapifyGet(
    env,
    "search",
    {
      street: normalizeText(street),
      postcode: normalizeText(zip),
      city: normalizeText(city),
      limit: "1",
      bias: "countrycode:de,at,ch",
    },
    userId,
  );
  return (hits[0] ? toResult(hits[0], `${street}, ${zip} ${city}`) : null) ?? null;
}

export async function geocodeAddress(
  env: Env,
  street: string,
  zip: string,
  city: string,
  userId?: string,
): Promise<GeocodeResult | null> {
  try {
    return await lookupAddress(env, street, zip, city, userId);
  } catch (err) {
    if (err instanceof GeocodeUnavailableError) return null;
    throw err;
  }
}

export async function reverseGeocode(
  env: Env,
  lat: number,
  lng: number,
): Promise<ReverseResult | null> {
  const hits = await geoapifyGet(env, "reverse", {
    lat: roundCoord(lat),
    lon: roundCoord(lng),
    limit: "1",
  });
  const hit = hits[0];
  if (!hit) return null;
  const street = [hit.street, hit.housenumber].filter(Boolean).join(" ") || null;
  return {
    street,
    zip: hit.postcode ?? null,
    city: placeOf(hit) ?? null,
  };
}

export async function labelFromCoords(
  env: Env,
  lat: number,
  lng: number,
  userId?: string,
): Promise<{ label: string; country: string | null } | null> {
  const hits = await orEmpty(
    geoapifyGet(
      env,
      "reverse",
      {
        lat: roundCoord(lat),
        lon: roundCoord(lng),
        limit: "1",
      },
      userId,
    ),
  );
  const hit = hits[0];
  if (!hit) return null;
  const place = placeOf(hit);
  if (!place) return null;
  return {
    label: [postcodeOf(hit), place].filter(Boolean).join(" "),
    country: hit.country ?? null,
  };
}
