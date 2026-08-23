import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import type { AppEnv } from "../../types";
import { sessionValidation } from "../../middlewares/session";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { createCatalogService } from "../../services/catalog.service";
import { createSessionService } from "../../services/session.service";

export const animals = new Hono<AppEnv>();

/** 10 random live excerpts for the landing teaser. No auth. */
animals.get("/excerpts", rateLimitByIp("animal-excerpts", 60), async (c) => {
  const items = await createCatalogService(c.env).excerpts();
  return c.json({ items }, 200);
});

animals.get("/sitemap", rateLimitByIp("animal-sitemap", 30), async (c) => {
  const items = await createCatalogService(c.env).sitemap();
  return c.json({ items }, 200);
});

animals.get("/breeds", sessionValidation, rateLimitByIp("animal-breeds", 60), async (c) => {
  const species = c.req.query("species") ?? "";
  const q = c.req.query("q") ?? "";
  const items = await createCatalogService(c.env).breeds(species, q);
  return c.json({ items }, 200);
});

animals.get("/:id/photos/:n", rateLimitByIp("animal-photo", 120), async (c) => {
  const n = Number(c.req.param("n"));
  if (!Number.isInteger(n) || n < 0 || n > 20) {
    return c.json({ error: "photo not found" }, 404);
  }
  const object = await createCatalogService(c.env).photo(c.req.param("id"), n);
  if (!object) {
    return c.json({ error: "photo not found" }, 404);
  }
  const headers = new Headers();
  headers.set("content-type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("cache-control", "public, max-age=86400");
  if (object.httpEtag) headers.set("etag", object.httpEtag);
  return new Response(object.body, { status: 200, headers });
});

animals.get("/", sessionValidation, rateLimitByIp("animal-list", 120), async (c) => {
  const search = new URL(c.req.url).searchParams;
  const result = await createCatalogService(c.env).list(c.get("userId"), search);
  return c.json(result, 200);
});

animals.get("/:id", rateLimitByIp("animal-public", 120), async (c) => {
  const token = getCookie(c, "sessionToken");
  if (token) {
    try {
      const session = await createSessionService(c.env).validate(token);
      const animal = await createCatalogService(c.env).get(session.userId, c.req.param("id"));
      return c.json(animal, 200);
    } catch {
      // public fallback
    }
  }
  const animal = await createCatalogService(c.env).publicGet(c.req.param("id"));
  return c.json(animal, 200);
});

animals.post("/:id/impressions", sessionValidation, rateLimitByIp("animal-impression", 60), async (c) => {
  await createCatalogService(c.env).recordImpression(c.get("userId"), c.req.param("id"));
  return c.json({}, 200);
});

animals.get("/:id/like", sessionValidation, async (c) => {
  const result = await createCatalogService(c.env).getLike(c.get("userId"), c.req.param("id"));
  return c.json(result, 200);
});

animals.post("/:id/like", sessionValidation, rateLimitByIp("animal-like", 60), async (c) => {
  const result = await createCatalogService(c.env).like(c.get("userId"), c.req.param("id"));
  return c.json(result, 200);
});

animals.delete("/:id/like", sessionValidation, async (c) => {
  const result = await createCatalogService(c.env).unlike(c.get("userId"), c.req.param("id"));
  return c.json(result, 200);
});
