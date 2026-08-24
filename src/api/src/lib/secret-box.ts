import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";

const VERSION = 1;
const IV_LENGTH = 12;

function b64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function unb64url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/");
  const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
  return Uint8Array.from(atob(padded + pad), (c) => c.charCodeAt(0));
}

function fromHex(value: string): Uint8Array | null {
  if (!/^[0-9a-fA-F]+$/.test(value) || value.length % 2 !== 0) return null;
  const out = new Uint8Array(value.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(value.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

async function totpKeyRaw(env: Env): Promise<Uint8Array> {
  const raw = (env.SECRET_TOTP_KEY ?? process.env.SECRET_TOTP_KEY ?? "").trim();
  if (!raw) {
    throw new HTTPException(500, { message: "something wen't wrong" });
  }
  const hex = fromHex(raw);
  if (hex && hex.length === 32) return hex;
  if (hex && hex.length === 64) {
    return new Uint8Array(await crypto.subtle.digest("SHA-256", hex));
  }
  let bytes: Uint8Array;
  try {
    bytes = unb64url(raw);
  } catch {
    throw new HTTPException(500, { message: "something wen't wrong" });
  }
  if (bytes.length !== 32) {
    throw new HTTPException(500, { message: "something wen't wrong" });
  }
  return bytes;
}

async function importKey(env: Env) {
  return crypto.subtle.importKey("raw", await totpKeyRaw(env), { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function sealSecret(env: Env, plaintext: string, aad: string): Promise<string> {
  const key = await importKey(env);
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(aad) },
      key,
      new TextEncoder().encode(plaintext),
    ),
  );
  const out = new Uint8Array(1 + iv.length + cipher.length);
  out[0] = VERSION;
  out.set(iv, 1);
  out.set(cipher, 1 + iv.length);
  return b64url(out);
}

export async function openSecret(env: Env, blob: string, aad: string): Promise<string> {
  const bytes = unb64url(blob);
  if (bytes.length < 1 + IV_LENGTH + 16 || bytes[0] !== VERSION) {
    throw new HTTPException(500, { message: "something wen't wrong" });
  }
  const iv = bytes.slice(1, 1 + IV_LENGTH);
  const cipher = bytes.slice(1 + IV_LENGTH);
  const key = await importKey(env);
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv, additionalData: new TextEncoder().encode(aad) },
      key,
      cipher,
    );
    return new TextDecoder().decode(plain);
  } catch {
    throw new HTTPException(500, { message: "something wen't wrong" });
  }
}
