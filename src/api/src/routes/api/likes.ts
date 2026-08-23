import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { sessionValidation } from "../../middlewares/session";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { createCatalogService } from "../../services/catalog.service";

export const likes = new Hono<AppEnv>();

likes.use("*", sessionValidation);

likes.get("/", rateLimitByIp("likes-list", 60), async (c) => {
  const search = new URL(c.req.url).searchParams;
  const result = await createCatalogService(c.env).likes(c.get("userId"), search);
  return c.json(result, 200);
});
