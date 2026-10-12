import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import type { AppEnv } from "../../types";
import { sessionValidation } from "../../middlewares/session";
import { rateLimitByIp, rateLimitByUser } from "../../middlewares/rate-limit";
import { GeocodeUnavailableError, geocodeQuery, reverseGeocode } from "../../lib/geocode";
import { geoReverseSchema, geoSearchSchema } from "../../lib/zod";

export const geo = new Hono<AppEnv>();

/** 503 so clients can tell "search is down" apart from "no match" (200, empty). */
async function orUnavailable<T>(lookup: Promise<T>): Promise<T> {
  try {
    return await lookup;
  } catch (err) {
    if (err instanceof GeocodeUnavailableError) {
      throw new HTTPException(503, { message: "geocoding unavailable" });
    }
    throw err;
  }
}

// Paid lookups: limiters fail closed, clients fall back to manual entry on 429/503.
geo.post(
  "/search",
  sessionValidation,
  rateLimitByIp("geo-search", 20, { failClosed: true }),
  rateLimitByUser("geo-search-user", 10, { failClosed: true }),
  async (c) => {
    const data = geoSearchSchema.parse(await c.req.json());
    const items = await orUnavailable(geocodeQuery(c.env, data.q));
    return c.json({ items }, 200);
  },
);

// No session: the registration form calls it before login. IP limit, cache and budget.
geo.post("/reverse", rateLimitByIp("geo-reverse", 20, { failClosed: true }), async (c) => {
  const data = geoReverseSchema.parse(await c.req.json());
  const item = await orUnavailable(reverseGeocode(c.env, data.lat, data.lng));
  return c.json({ item }, 200);
});
