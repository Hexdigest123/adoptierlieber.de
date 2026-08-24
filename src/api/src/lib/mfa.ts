import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import type { User } from "../types";
import { generateToken, hashToken } from "./hashing";
import { isPlatformAdmin } from "./roles";
import { superAdminAllowlist } from "./create-account";

const LOGIN_TTL_SECONDS = 5 * 60;
const WEBAUTHN_TTL_SECONDS = 5 * 60;

export function isMfaRequired(user: User, env: Env): boolean {
  return isPlatformAdmin(user, superAdminAllowlist(env));
}

export function totpEnabled(user: Pick<User, "totpSecret" | "totpConfirmedAt">): boolean {
  return Boolean(user.totpSecret && user.totpConfirmedAt);
}

export function hasMfa(
  user: Pick<User, "totpSecret" | "totpConfirmedAt">,
  passkeyCount: number,
): boolean {
  return totpEnabled(user) || passkeyCount > 0;
}

export function effectiveSessionKind(
  stored: "full" | "setup",
  user: User,
  passkeyCount: number,
  env: Env,
): "full" | "setup" {
  if (isMfaRequired(user, env) && !hasMfa(user, passkeyCount)) return "setup";
  return stored;
}

export async function putLoginChallenge(env: Env, userId: string): Promise<string> {
  const { token, hashedToken } = await generateToken();
  await env.RATE_LIMIT_KV.put(`mfa:login:${hashedToken}`, JSON.stringify({ user_id: userId }), {
    expirationTtl: LOGIN_TTL_SECONDS,
  });
  return token;
}

export async function peekLoginChallenge(env: Env, token: string): Promise<string> {
  const hashed = await hashToken(token);
  const raw = await env.RATE_LIMIT_KV.get(`mfa:login:${hashed}`);
  if (!raw) {
    throw new HTTPException(401, { message: "invalid code" });
  }
  const parsed = JSON.parse(raw) as { user_id?: string };
  if (!parsed.user_id) {
    throw new HTTPException(401, { message: "invalid code" });
  }
  return parsed.user_id;
}

export async function dropLoginChallenge(env: Env, token: string): Promise<void> {
  const hashed = await hashToken(token);
  await env.RATE_LIMIT_KV.delete(`mfa:login:${hashed}`);
}

export async function putWebauthnRegChallenge(
  env: Env,
  userId: string,
  challenge: string,
): Promise<void> {
  await env.RATE_LIMIT_KV.put(`webauthn:reg:${userId}`, JSON.stringify({ challenge }), {
    expirationTtl: WEBAUTHN_TTL_SECONDS,
  });
}

export async function takeWebauthnRegChallenge(env: Env, userId: string): Promise<string> {
  const key = `webauthn:reg:${userId}`;
  const raw = await env.RATE_LIMIT_KV.get(key);
  if (!raw) {
    throw new HTTPException(400, { message: "invalid challenge" });
  }
  await env.RATE_LIMIT_KV.delete(key);
  const parsed = JSON.parse(raw) as { challenge?: string };
  if (!parsed.challenge) {
    throw new HTTPException(400, { message: "invalid challenge" });
  }
  return parsed.challenge;
}

export async function putWebauthnAuthChallenge(env: Env, challenge: string): Promise<string> {
  const { token, hashedToken } = await generateToken();
  await env.RATE_LIMIT_KV.put(
    `webauthn:auth:${hashedToken}`,
    JSON.stringify({ challenge }),
    { expirationTtl: WEBAUTHN_TTL_SECONDS },
  );
  return token;
}

export async function peekWebauthnAuthChallenge(
  env: Env,
  challengeId: string,
): Promise<string> {
  const hashed = await hashToken(challengeId);
  const raw = await env.RATE_LIMIT_KV.get(`webauthn:auth:${hashed}`);
  if (!raw) {
    throw new HTTPException(401, { message: "invalid challenge" });
  }
  const parsed = JSON.parse(raw) as { challenge?: string };
  if (!parsed.challenge) {
    throw new HTTPException(401, { message: "invalid challenge" });
  }
  return parsed.challenge;
}

export async function dropWebauthnAuthChallenge(env: Env, challengeId: string): Promise<void> {
  const hashed = await hashToken(challengeId);
  await env.RATE_LIMIT_KV.delete(`webauthn:auth:${hashed}`);
}
