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

type GeoapifyHit = {
  lat?: number;
  lon?: number;
  formatted?: string;
  country?: string;
  postcode?: string;
  city?: string;
  town?: string;
  village?: string;
  street?: string;
  housenumber?: string;
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

function toResult(hit: GeoapifyHit, fallback: string): GeocodeResult | null {
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const label = [hit.postcode, placeOf(hit)].filter(Boolean).join(" ") || hit.formatted || fallback;
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
    bias: "countrycode:de,at,ch",
  });
  return hits
    .map((hit) => toResult(hit, query))
    .filter((hit): hit is GeocodeResult => hit !== null);
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
