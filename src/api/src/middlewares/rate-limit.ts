import { rateLimiter } from "hono-rate-limiter";
import { WorkersKVStore } from "@hono-rate-limiter/cloudflare";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types";

const limiters = new Map<string, MiddlewareHandler<AppEnv>>();

/**
 * Rate limit by client IP (via Cloudflare's `cf-connecting-ip` header).
 * Each route gets its own limiter and KV prefix so buckets never bleed
 * into each other, regardless of shared limit values.
 */
export function rateLimitByIp(name: string, limit: number): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    let middleware = limiters.get(name);
    if (!middleware) {
      middleware = rateLimiter<AppEnv, string, {}>({
        windowMs: 15 * 60 * 1000,
        limit,
        standardHeaders: "draft-6",
        keyGenerator: (ctx) => ctx.req.header("cf-connecting-ip") ?? "unknown",
        store: new WorkersKVStore<AppEnv, string, {}>({
          namespace: c.env.RATE_LIMIT_KV,
          prefix: `rl:${name}:`,
        }),
      });
      limiters.set(name, middleware);
    }
    return middleware(c, next);
  };
}
