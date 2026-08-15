import { rateLimiter } from "hono-rate-limiter";
import { WorkersKVStore } from "@hono-rate-limiter/cloudflare";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";

const stores = new Map<KVNamespace, WorkersKVStore<AppEnv, string, {}>>();
const limiters = new Map<number, MiddlewareHandler<AppEnv>>();

function getStore(namespace: KVNamespace) {
  let store = stores.get(namespace);
  if (!store) {
    store = new WorkersKVStore<AppEnv, string, {}>({ namespace });
    stores.set(namespace, store);
  }
  return store;
}

/** Rate limit by client IP (via Cloudflare's `cf-connecting-ip` header). */
export function rateLimitByIp(limit: number): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    let middleware = limiters.get(limit);
    if (!middleware) {
      middleware = rateLimiter<AppEnv, string, {}>({
        windowMs: 15 * 60 * 1000,
        limit,
        standardHeaders: "draft-6",
        keyGenerator: (ctx) => ctx.req.header("cf-connecting-ip") ?? "unknown",
        store: getStore(c.env.RATE_LIMIT_KV),
      });
      limiters.set(limit, middleware);
    }
    return middleware(c, next);
  };
}
