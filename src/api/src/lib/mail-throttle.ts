import type { Env } from "../config/env";
import { hashToken } from "./hashing";
import { normalizeEmail } from "./roles";

// KV rejects expirations less than 60s away.
const KV_MIN_TTL_SECONDS = 60;

/**
 * Per-recipient cap on outgoing auth mail, keyed on a hash of the address, so
 * many IPs cannot flood one inbox. Returns false once the window is used up.
 * KV is eventually consistent: a brake, not an exact count.
 */
export async function takeMailSlot(
  env: Env,
  kind: string,
  email: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
): Promise<boolean> {
  const key = `mail:${kind}:${await hashToken(normalizeEmail(email))}`;
  const now = Math.floor(Date.now() / 1000);
  const raw = await env.RATE_LIMIT_KV.get(key);
  const stored = raw ? (JSON.parse(raw) as { n: number; reset: number }) : null;
  const bucket = stored && stored.reset > now ? stored : { n: 0, reset: now + windowSeconds };
  if (bucket.n >= limit) return false;
  bucket.n += 1;
  await env.RATE_LIMIT_KV.put(key, JSON.stringify(bucket), {
    expiration: Math.max(bucket.reset, now + KV_MIN_TTL_SECONDS),
  });
  return true;
}
