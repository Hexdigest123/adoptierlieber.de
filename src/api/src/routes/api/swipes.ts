import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { sessionValidation } from "../../middlewares/session";
import { rateLimitByUser } from "../../middlewares/rate-limit";
import { createCatalogService } from "../../services/catalog.service";
import { swipeSchema } from "../../lib/zod";

export const swipes = new Hono<AppEnv>();

swipes.use("*", sessionValidation);

swipes.post("/", rateLimitByUser("swipe", 80), async (c) => {
  const data = swipeSchema.parse(await c.req.json());
  const result = await createCatalogService(c.env).swipe(c.get("userId"), data);
  return c.json(result, 200);
});

swipes.delete("/", async (c) => {
  await createCatalogService(c.env).resetSkips(c.get("userId"));
  return c.json({}, 200);
});
