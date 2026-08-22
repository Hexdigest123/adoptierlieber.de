const PBKDF2_ITERATIONS = 600_000;
const MIN_ITERATIONS = 600_000;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
const MAX_ITERATIONS = 10_000_000;
const MAX_KEY_LENGTH = 64;

const PHC = /^\$pbkdf2-sha256\$i=(\d+),l=(\d+)\$([A-Za-z0-9_-]+)\$([A-Za-z0-9_-]+)$/;

function b64(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function unb64(value: string) {
  return Uint8Array.from(atob(value.replace(/_/g, "/").replace(/-/g, "+")), (c) => c.charCodeAt(0));
}

async function deriveKey(password: string, salt: Uint8Array, iterations: number) {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    keyMaterial,
    KEY_LENGTH * 8,
  );
  return new Uint8Array(bits);
}

export function timingSafeEqual(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export function tokensEqual(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function secretsEqual(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  if (left.length !== right.length) {
    timingSafeEqual(right, right);
    return false;
  }
  return timingSafeEqual(left, right);
}

export async function hashPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);
  return `$pbkdf2-sha256$i=${PBKDF2_ITERATIONS},l=${KEY_LENGTH}$${b64(salt)}$${b64(key)}`;
}

export async function verifyPassword(password: string, stored: string) {
  const match = stored.match(PHC);
  if (!match) return false;
  const [, iter, len, saltB64, hashB64] = match;
  const iterations = Number(iter);
  if (iterations < MIN_ITERATIONS || iterations > MAX_ITERATIONS) return false;
  if (Number(len) > MAX_KEY_LENGTH) return false;
  const expected = unb64(hashB64);
  const actual = await deriveKey(password, unb64(saltB64), iterations);
  return timingSafeEqual(actual, expected);
}

export function passwordNeedsRehash(stored: string) {
  const match = stored.match(PHC);
  if (!match) return true;
  return Number(match[1]) < PBKDF2_ITERATIONS;
}

export async function generateToken(): Promise<{ token: string; hashedToken: string }> {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const hashedToken = await hashToken(token);
  return { token, hashedToken };
}

export async function hashToken(token: string): Promise<string> {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Cached PHC of a random secret so unknown-user paths still cost one verify.
function randomDummyPassword() {
  return b64(crypto.getRandomValues(new Uint8Array(32)));
}

let dummyHash: Promise<string> | undefined;

export async function verifyDummyPassword(password = randomDummyPassword()) {
  dummyHash ??= hashPassword(randomDummyPassword());
  return verifyPassword(password, await dummyHash);
}
