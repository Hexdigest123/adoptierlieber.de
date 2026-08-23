import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { sessionValidation } from "../../middlewares/session";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { geocodeQuery, reverseGeocode } from "../../lib/geocode";
import { geoReverseSchema, geoSearchSchema } from "../../lib/zod";

export const geo = new Hono<AppEnv>();

geo.post("/search", sessionValidation, rateLimitByIp("geo-search", 20), async (c) => {
  const data = geoSearchSchema.parse(await c.req.json());
  const items = await geocodeQuery(data.q);
  return c.json({ items }, 200);
});

geo.post("/reverse", rateLimitByIp("geo-reverse", 20), async (c) => {
  const data = geoReverseSchema.parse(await c.req.json());
  const item = await reverseGeocode(data.lat, data.lng);
  return c.json({ item }, 200);
});
