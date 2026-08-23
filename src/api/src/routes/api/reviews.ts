import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { rateLimitByIp, rateLimitByUser } from "../../middlewares/rate-limit";
import { sessionValidation } from "../../middlewares/session";
import { createReviewService } from "../../services/review.service";

export const reviews = new Hono<AppEnv>();

/** 10 random approved reviews for the landing carousel. No auth. */
reviews.get("/", rateLimitByIp("review-list", 60), async (c) => {
  return c.json(await createReviewService(c.env).listPublic());
});

reviews.post("/", sessionValidation, rateLimitByUser("review-create", 5), async (c) => {
  await createReviewService(c.env).create(await c.req.json(), c.get("userId"));
  return c.json({}, 201);
});
