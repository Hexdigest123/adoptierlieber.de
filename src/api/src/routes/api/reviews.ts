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

/** Avatar of an approved review author. No auth. */
reviews.get("/:id/avatar", rateLimitByIp("review-avatar", 120), async (c) => {
  const object = await createReviewService(c.env).getPublicAvatar(c.req.param("id"));
  if (!object) {
    return c.json({ error: "avatar not found" }, 404);
  }
  const headers = new Headers();
  headers.set("content-type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("cache-control", "public, max-age=3600");
  if (object.httpEtag) {
    headers.set("etag", object.httpEtag);
  }
  return new Response(object.body, { status: 200, headers });
});

reviews.post("/", sessionValidation, rateLimitByUser("review-create", 5), async (c) => {
  await createReviewService(c.env).create(await c.req.json(), c.get("userId"));
  return c.json({}, 201);
});
