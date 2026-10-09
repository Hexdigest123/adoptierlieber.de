export type Env = {
  BASIC_AUTH_USER?: string;
  BASIC_AUTH_PASSWORD?: string;
  ENVIRONMENT?: string;
  PUBLIC_SITE_URL?: string;
  SUPER_ADMIN_EMAIL?: string;
  SECRET_TOTP_KEY?: string;
  /** Shared with the web worker; proves its X-Forwarded-For (see rate-limit.ts). */
  PROXY_SECRET?: string;
  /** Turnstile widget secret; unset = verification skipped (see lib/turnstile.ts). */
  SECRET_TURNSTILE_SECRET?: string;
  SECRET_GEOAPIFY?: string;
  /** Upstream Geoapify calls per UTC day; default 2500 (see lib/geocode.ts). */
  GEOAPIFY_DAILY_BUDGET?: string;
  /** Development only: loopback mock for Geoapify (see lib/geocode.ts). */
  GEOAPIFY_BASE_URL?: string;
  RATE_LIMIT_KV: KVNamespace;
  adoptierlieber?: D1Database;
  adoptierlieber_staging?: D1Database;
  adoptierlieber_images: R2Bucket;
  CHAT_ROOM: DurableObjectNamespace<import("../durable-objects/chat-room").ChatRoom>;
};

export function getDb(env: Env): D1Database {
  const db = env.adoptierlieber ?? env.adoptierlieber_staging;
  if (!db) {
    throw new Error("missing D1 binding adoptierlieber");
  }
  return db;
}
