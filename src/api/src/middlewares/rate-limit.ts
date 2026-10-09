import { rateLimiter, type ClientRateLimitInfo } from "hono-rate-limiter";
import { WorkersKVStore } from "@hono-rate-limiter/cloudflare";
import type { Context, MiddlewareHandler } from "hono";
import { secretsEqual } from "../lib/hashing";
import type { AppEnv } from "../types";

const limiters = new Map<string, MiddlewareHandler<AppEnv>>();

/** Set by the web worker's /api proxy next to the X-Forwarded-For it stamps. */
export const PROXY_SECRET_HEADER = "x-proxy-secret";

// KV rejects expirations less than 60s away.
const KV_MIN_TTL_MS = 60 * 1000;

let warnedNoProxySecret = false;

export function clientIp(ctx: Context<AppEnv>): string {
  const cfIp = ctx.req.header("cf-connecting-ip");
  const forwarded = ctx.req.header("x-forwarded-for")?.split(",")[0]?.trim();
  const secret = ctx.env.PROXY_SECRET;
  if (secret) {
    // Cloudflare appends to a client-sent XFF, so the first hop is only the
    // browser IP when our own web worker set it (proven by the shared secret).
    const proxied = secretsEqual(ctx.req.header(PROXY_SECRET_HEADER) ?? "", secret);
    if (proxied && forwarded) return forwarded;
    return cfIp ?? "unknown";
  }
  // Transition without PROXY_SECRET (and local dev): trust XFF as before, so
  // proxied traffic does not collapse into the web worker's egress IP bucket.
  // Direct api.* hits can still pick their own key until the secret is set.
  if (!warnedNoProxySecret && process.env.NODE_ENV !== "development") {
    warnedNoProxySecret = true;
    console.warn("PROXY_SECRET is not set; rate limits trust X-Forwarded-For from any client");
  }
  return forwarded || cfIp || "unknown";
}

/**
 * WorkersKVStore re-PUTs a bucket with expiration = resetTime. Within the last
 * 60s of a window KV rejects that ("Invalid expiration"). Keep the window but
 * let the KV entry outlive it by up to a minute; an expired bucket restarts.
 */
class ClampedKVStore extends WorkersKVStore<AppEnv, string, {}> {
  async increment(key: string): Promise<ClientRateLimitInfo> {
    const now = Date.now();
    const stored = await this.get(key);
    const storedReset = stored?.resetTime ? new Date(stored.resetTime) : null;
    const info =
      stored && storedReset && storedReset.getTime() > now
        ? { totalHits: stored.totalHits + 1, resetTime: storedReset }
        : { totalHits: 1, resetTime: new Date(now + this.windowMs) };
    await this.write(key, info, now);
    return info;
  }

  async decrement(key: string): Promise<void> {
    const now = Date.now();
    const stored = await this.get(key);
    if (!stored?.resetTime || new Date(stored.resetTime).getTime() <= now) return;
    await this.write(
      key,
      { totalHits: stored.totalHits - 1, resetTime: new Date(stored.resetTime) },
      now,
    );
  }

  private async write(key: string, info: ClientRateLimitInfo, now: number) {
    const expiresAt = Math.max(info.resetTime?.getTime() ?? 0, now + KV_MIN_TTL_MS);
    await this.namespace.put(this.prefixKey(key), JSON.stringify(info), {
      expiration: Math.ceil(expiresAt / 1000),
    });
  }
}

type LimitOptions = {
  /**
   * Answer 429 when the KV store errors instead of letting the request through.
   * Use on credential, mail and account endpoints; public reads stay fail-open.
   */
  failClosed?: boolean;
};

function guarded(
  name: string,
  options: LimitOptions,
  getMiddleware: (c: Context<AppEnv>) => MiddlewareHandler<AppEnv>,
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    let reached = false;
    try {
      return await getMiddleware(c)(c, () => {
        reached = true;
        return next();
      });
    } catch (e: unknown) {
      // Errors from the route itself are not limiter failures.
      if (reached) throw e;
      // KV store errors (e.g. >1 write/s per key) must not lift the limit on
      // sensitive routes. Elsewhere, log and degrade gracefully.
      if (options.failClosed) {
        console.error(`rate limiter ${name} failed, failing closed`, e);
        return c.json({ error: "too many requests" }, 429, { "Retry-After": "60" });
      }
      console.error(`rate limiter ${name} failed, failing open`, e);
      return next();
    }
  };
}

/**
 * Rate limit by client IP.
 * Each route gets its own limiter and KV prefix so buckets never bleed
 * into each other, regardless of shared limit values.
 */
export function rateLimitByIp(
  name: string,
  limit: number,
  options: LimitOptions = {},
): MiddlewareHandler<AppEnv> {
  return guarded(name, options, (c) => {
    let middleware = limiters.get(name);
    if (!middleware) {
      middleware = rateLimiter<AppEnv, string, {}>({
        windowMs: 15 * 60 * 1000,
        limit,
        standardHeaders: "draft-6",
        keyGenerator: clientIp,
        store: new ClampedKVStore({
          namespace: c.env.RATE_LIMIT_KV,
          prefix: `rl:${name}:`,
        }),
      });
      limiters.set(name, middleware);
    }
    return middleware;
  });
}

/** Rate limit by authenticated user. Session middleware must run first. */
export function rateLimitByUser(
  name: string,
  limit: number,
  options: LimitOptions = {},
): MiddlewareHandler<AppEnv> {
  return guarded(name, options, (c) => {
    const key = `user:${name}`;
    let middleware = limiters.get(key);
    if (!middleware) {
      middleware = rateLimiter<AppEnv, string, {}>({
        windowMs: 15 * 60 * 1000,
        limit,
        standardHeaders: "draft-6",
        keyGenerator: (ctx) => ctx.get("userId") || clientIp(ctx),
        store: new ClampedKVStore({
          namespace: c.env.RATE_LIMIT_KV,
          prefix: `rl:${name}:`,
        }),
      });
      limiters.set(key, middleware);
    }
    return middleware;
  });
}
