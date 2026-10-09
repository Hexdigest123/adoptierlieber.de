import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { tinyJson } from "../../middlewares/tiny-json";
import { createStatsService } from "../../services/stats.service";

export const stats = new Hono<AppEnv>();

stats.post("/visit", rateLimitByIp("stats-visit", 120), tinyJson, async (c) => {
  await createStatsService(c.env).recordVisit(await c.req.json());
  return c.json({}, 200);
});
