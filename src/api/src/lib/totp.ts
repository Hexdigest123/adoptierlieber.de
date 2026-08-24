import { timingSafeEqual } from "./hashing";

const DIGITS = 6;
const PERIOD = 30;
const WINDOW = 1;
const SECRET_BYTES = 20;
const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

export const TOTP_ISSUER = "Adoptier Lieber";

export function generateTotpSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SECRET_BYTES));
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let out = "";
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += BASE32[parseInt(bits.slice(i, i + 5), 2)];
  }
  return out;
}

function decodeBase32(secret: string): Uint8Array {
  const clean = secret.toUpperCase().replace(/=+$/, "");
  let bits = "";
  for (const char of clean) {
    const idx = BASE32.indexOf(char);
    if (idx < 0) throw new Error("invalid totp secret");
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes = new Uint8Array(Math.floor(bits.length / 8));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(bits.slice(i * 8, i * 8 + 8), 2);
  }
  return bytes;
}

async function hotp(secret: Uint8Array, counter: number): Promise<string> {
  const buf = new ArrayBuffer(8);
  const view = new DataView(buf);
  view.setUint32(4, counter >>> 0);
  const key = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-1" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, buf);
  const bytes = new Uint8Array(sig);
  const offset = bytes[bytes.length - 1] & 0x0f;
  const bin =
    ((bytes[offset] & 0x7f) << 24) |
    ((bytes[offset + 1] & 0xff) << 16) |
    ((bytes[offset + 2] & 0xff) << 8) |
    (bytes[offset + 3] & 0xff);
  return (bin % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

export function totpCounter(at = Date.now()): number {
  return Math.floor(at / 1000 / PERIOD);
}

export async function verifyTotpCode(
  secret: string,
  code: string,
  lastCounter: number | null,
  at = Date.now(),
): Promise<number | null> {
  if (!/^\d{6}$/.test(code)) return null;
  const key = decodeBase32(secret);
  const center = totpCounter(at);
  const expected = new TextEncoder().encode(code);
  let match: number | null = null;
  for (let delta = -WINDOW; delta <= WINDOW; delta++) {
    const counter = center + delta;
    if (lastCounter !== null && counter <= lastCounter) continue;
    const candidate = new TextEncoder().encode(await hotp(key, counter));
    if (candidate.length === expected.length && timingSafeEqual(candidate, expected)) {
      match = counter;
    }
  }
  return match;
}

export function totpUri(email: string, secret: string): string {
  const label = encodeURIComponent(`${TOTP_ISSUER}:${email}`);
  const issuer = encodeURIComponent(TOTP_ISSUER);
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=${DIGITS}&period=${PERIOD}`;
}
