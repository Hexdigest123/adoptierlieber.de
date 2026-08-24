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

function apiKey(): string | null {
  const key = process.env.SECRET_GEOAPIFY?.trim();
  return key || null;
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
  const label = [postcodeOf(hit), placeOf(hit)].filter(Boolean).join(" ") || hit.formatted || fallback;
  return {
    lat,
    lng,
    label,
    country: hit.country ?? null,
  };
}

async function geoapifyGet(path: string, params: Record<string, string>): Promise<GeoapifyHit[]> {
  const key = apiKey();
  if (!key) {
    console.error("SECRET_GEOAPIFY missing, geocode skipped");
    return [];
  }
  const url = new URL(`https://api.geoapify.com/v1/geocode/${path}`);
  for (const [name, value] of Object.entries(params)) {
    url.searchParams.set(name, value);
  }
  url.searchParams.set("format", "json");
  url.searchParams.set("lang", "de");
  url.searchParams.set("apiKey", key);
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) return [];
  const body = (await res.json()) as GeoapifySearchBody;
  return body.results ?? [];
}

export async function geocodeQuery(query: string): Promise<GeocodeResult[]> {
  const hits = await geoapifyGet("search", {
    text: query,
    limit: "5",
    type: "locality",
    filter: "countrycode:de,at,ch",
  });
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
  query: string,
  lat?: number,
  lng?: number,
): Promise<GeocodeResult | null> {
  const hits = await geocodeQuery(query);
  if (hits.length === 0) return null;
  if (lat == null || lng == null) return hits[0];
  return hits.find((hit) => haversineKm(hit, { lat, lng }) <= PLACE_MATCH_KM) ?? null;
}

export async function geocodeAddress(
  street: string,
  zip: string,
  city: string,
): Promise<GeocodeResult | null> {
  const hits = await geoapifyGet("search", {
    street,
    postcode: zip,
    city,
    limit: "1",
    bias: "countrycode:de,at,ch",
  });
  return (hits[0] ? toResult(hits[0], `${street}, ${zip} ${city}`) : null) ?? null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<ReverseResult | null> {
  const hits = await geoapifyGet("reverse", {
    lat: String(lat),
    lon: String(lng),
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
  lat: number,
  lng: number,
): Promise<{ label: string; country: string | null } | null> {
  const hits = await geoapifyGet("reverse", {
    lat: String(lat),
    lon: String(lng),
    limit: "1",
  });
  const hit = hits[0];
  if (!hit) return null;
  const place = placeOf(hit);
  if (!place) return null;
  return {
    label: [postcodeOf(hit), place].filter(Boolean).join(" "),
    country: hit.country ?? null,
  };
}
