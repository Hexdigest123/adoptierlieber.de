import { Hono, type Context, type MiddlewareHandler } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { basicAuth } from "./middlewares/auth";
import { errorHandler } from "./middlewares/error-handler";
import routes from "./routes";
import type { AppEnv } from "./types";

const app = new Hono<AppEnv>();

app.onError(errorHandler);

const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

if (process.env.NODE_ENV === "development") {
  app.use("*", cors({ origin: (origin) => (LOCAL_ORIGIN.test(origin) ? origin : null) }));
}

app.use("*", async (c, next) => {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("X-Frame-Options", "DENY");
  c.header("Referrer-Policy", "no-referrer");
  if (process.env.NODE_ENV !== "development") {
    c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
});

app.use("*", basicAuth); // checks if we are in a staging environment and enforces http auth

const BODY_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
async function reject(c: Context, error: string, status: 413 | 415) {
  // wrangler dev's proxy dies when an early response leaves a large body unread.
  if (process.env.NODE_ENV === "development") await c.req.raw.arrayBuffer().catch(() => {});
  return c.json({ error }, status);
}
const limit = (maxSize: number) =>
  bodyLimit({ maxSize, onError: (c) => reject(c, "payload too large", 413) });
const jsonLimit = limit(64 * 1024);
// Images are capped at 2 MB (lib/avatar.ts); leave room for the multipart fields.
const uploadLimit = limit(2.5 * 1024 * 1024);
// Bulk create: up to 100 animals with long descriptions (createGroupSchema).
const groupLimit = limit(1024 * 1024);

type BodyRoute = { method: string; path: RegExp; multipart?: true; limit: MiddlewareHandler };

/** Routes with a non-default body limit; `multipart` ones also accept image uploads. */
const BODY_ROUTES: BodyRoute[] = [
  { method: "POST", path: /^\/api\/users$/, multipart: true, limit: uploadLimit },
  { method: "PUT", path: /^\/api\/users\/me\/avatar$/, multipart: true, limit: uploadLimit },
  { method: "POST", path: /^\/api\/shelters$/, multipart: true, limit: uploadLimit },
  { method: "PUT", path: /^\/api\/shelters\/[^/]+\/logo$/, multipart: true, limit: uploadLimit },
  {
    method: "PUT",
    path: /^\/api\/shelters\/[^/]+\/animals\/[^/]+\/photos$/,
    multipart: true,
    limit: uploadLimit,
  },
  { method: "POST", path: /^\/api\/shelters\/[^/]+\/animals\/group$/, limit: groupLimit },
];

/**
 * Bodies must be JSON (or multipart on upload routes): a cross-site form can
 * only send urlencoded, multipart or text/plain. Sizes are capped before any
 * route buffers the body.
 */
app.use("*", async (c, next) => {
  if (!BODY_METHODS.has(c.req.method)) return next();
  if (!c.req.raw.body || c.req.header("content-length") === "0") return next();
  const route = BODY_ROUTES.find((r) => r.method === c.req.method && r.path.test(c.req.path));
  const type = (c.req.header("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (type !== "application/json" && !(route?.multipart && type === "multipart/form-data")) {
    return reject(c, "unsupported media type", 415);
  }
  return (route?.limit ?? jsonLimit)(c, next);
});

app.route("/", routes);

export default app;
