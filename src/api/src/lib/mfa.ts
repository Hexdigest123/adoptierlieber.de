import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import type { User } from "../types";
import { generateToken, hashToken, verifyPassword } from "./hashing";
import { isPlatformAdmin } from "./roles";
import { superAdminAllowlist } from "./create-account";
import { openSecret } from "./secret-box";
import { verifyTotpCode } from "./totp";
import { mfaStepUpSchema } from "./zod";
import { createUserRepo } from "../repositories/user.repo";
import { createWebauthnRepo } from "../repositories/webauthn.repo";

const LOGIN_TTL_SECONDS = 5 * 60;
const WEBAUTHN_TTL_SECONDS = 5 * 60;
// Wrong TOTP codes: per mfa_token, then per account across tokens.
const LOGIN_MAX_FAILURES = 5;
const ACCOUNT_MAX_FAILURES = 10;
const ACCOUNT_FAILURE_TTL_SECONDS = 15 * 60;

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
  await Promise.all([
    env.RATE_LIMIT_KV.delete(`mfa:login:${hashed}`),
    env.RATE_LIMIT_KV.delete(`mfa:login-fail:${hashed}`),
  ]);
}

async function readCount(env: Env, key: string): Promise<number> {
  return Number((await env.RATE_LIMIT_KV.get(key)) ?? 0) || 0;
}

/** 429 while the account has used up its wrong-code budget. */
export async function assertLoginAttemptsLeft(env: Env, userId: string): Promise<void> {
  if ((await readCount(env, `mfa:account-fail:${userId}`)) >= ACCOUNT_MAX_FAILURES) {
    throw new HTTPException(429, { message: "too many attempts" });
  }
}

/**
 * Count a wrong code against the mfa_token and the account. Returns true once
 * the token is used up and dropped, so the next try needs the password again.
 * KV is not atomic; parallel guesses can slip a few over the limit.
 */
export async function recordLoginFailure(
  env: Env,
  token: string,
  userId: string,
): Promise<boolean> {
  const hashed = await hashToken(token);
  const tokenKey = `mfa:login-fail:${hashed}`;
  const accountKey = `mfa:account-fail:${userId}`;
  const [tokenFails, accountFails] = await Promise.all([
    readCount(env, tokenKey),
    readCount(env, accountKey),
  ]);
  await env.RATE_LIMIT_KV.put(accountKey, String(accountFails + 1), {
    expirationTtl: ACCOUNT_FAILURE_TTL_SECONDS,
  });
  if (tokenFails + 1 >= LOGIN_MAX_FAILURES) {
    await dropLoginChallenge(env, token);
    return true;
  }
  await env.RATE_LIMIT_KV.put(tokenKey, String(tokenFails + 1), {
    expirationTtl: LOGIN_TTL_SECONDS,
  });
  return false;
}

/**
 * Adding or replacing a factor needs the password, plus a fresh TOTP code
 * while TOTP is on, so a stolen session cannot plant its own factor. Only a
 * setup session of a user without any factor (just logged in) skips this.
 */
export async function assertStepUp(
  env: Env,
  userId: string,
  sessionKind: "full" | "setup",
  input: unknown,
): Promise<void> {
  const users = createUserRepo(env);
  const user = await users.findById(userId);
  if (!user) throw new HTTPException(404, { message: "user not found" });
  const passkeyCount = (await createWebauthnRepo(env).countByUserId(userId))?.n ?? 0;
  if (sessionKind === "setup" && !hasMfa(user, passkeyCount)) return;

  const data = mfaStepUpSchema.parse(input ?? {});
  if (!data.current_password || !(await verifyPassword(data.current_password, user.password))) {
    throw new HTTPException(401, { message: "invalid password" });
  }
  if (totpEnabled(user) && user.totpSecret) {
    const secret = await openSecret(env, user.totpSecret, user.id);
    const counter = data.code
      ? await verifyTotpCode(secret, data.code, user.totpLastCounter)
      : null;
    if (counter === null) {
      throw new HTTPException(401, { message: "invalid code" });
    }
    await users.updateTotpLastCounter(user.id, counter);
  }
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
