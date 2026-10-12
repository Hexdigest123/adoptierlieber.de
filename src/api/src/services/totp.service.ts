import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import {
  assertLoginAttemptsLeft,
  assertStepUp,
  dropLoginChallenge,
  isMfaRequired,
  peekLoginChallenge,
  recordLoginFailure,
  totpEnabled,
} from "../lib/mfa";
import { openSecret, sealSecret } from "../lib/secret-box";
import { generateTotpSecret, totpUri, verifyTotpCode } from "../lib/totp";
import { verifyPassword } from "../lib/hashing";
import { confirmTotpSchema, disableTotpSchema, verifyLoginTotpSchema } from "../lib/zod";
import { createUserRepo } from "../repositories/user.repo";
import { createWebauthnRepo } from "../repositories/webauthn.repo";
import type { PublicSession } from "../types";
import { createSessionService } from "./session.service";
import { recordLogin } from "./stats.service";

// A pending secret is only confirmable shortly after a (step-up checked) start.
const ENROLL_TTL_SECONDS = 15 * 60;

export function createTotpService(env: Env) {
  const users = createUserRepo(env);
  const passkeys = createWebauthnRepo(env);

  async function assertLastFactor(userId: string, droppingTotp: boolean) {
    const user = await users.findById(userId);
    if (!user) throw new HTTPException(404, { message: "user not found" });
    const count = (await passkeys.countByUserId(userId))?.n ?? 0;
    const stillHas = droppingTotp ? count > 0 : totpEnabled(user) || count > 1;
    if (isMfaRequired(user, env) && !stillHas) {
      throw new HTTPException(409, { message: "last factor" });
    }
  }

  return {
    async startEnroll(
      userId: string,
      sessionKind: "full" | "setup",
      input: unknown,
    ): Promise<{ otpauth_uri: string; secret: string }> {
      await assertStepUp(env, userId, sessionKind, input);
      const user = await users.findById(userId);
      if (!user) throw new HTTPException(404, { message: "user not found" });
      const secret = generateTotpSecret();
      const blob = await sealSecret(env, secret, userId);
      if (!(await users.updateTotpPending(userId, blob))) {
        throw new HTTPException(500, { message: "something wen't wrong" });
      }
      await env.RATE_LIMIT_KV.put(`totp:enroll:${userId}`, "1", {
        expirationTtl: ENROLL_TTL_SECONDS,
      });
      return { otpauth_uri: totpUri(user.email, secret), secret };
    },

    async confirmEnroll(userId: string, sessionToken: string, input: unknown): Promise<void> {
      const { code } = confirmTotpSchema.parse(input);
      const user = await users.findById(userId);
      if (!user?.totpPendingSecret || !(await env.RATE_LIMIT_KV.get(`totp:enroll:${userId}`))) {
        throw new HTTPException(400, { message: "invalid code" });
      }
      const secret = await openSecret(env, user.totpPendingSecret, userId);
      const counter = await verifyTotpCode(secret, code, null);
      if (counter === null) {
        throw new HTTPException(401, { message: "invalid code" });
      }
      const blob = await sealSecret(env, secret, userId);
      if (!(await users.confirmTotp(userId, blob))) {
        throw new HTTPException(500, { message: "something wen't wrong" });
      }
      await users.updateTotpLastCounter(userId, counter);
      await env.RATE_LIMIT_KV.delete(`totp:enroll:${userId}`);
      await createSessionService(env).upgradeToFull(sessionToken);
    },

    async disable(userId: string, input: unknown): Promise<void> {
      const data = disableTotpSchema.parse(input);
      const user = await users.findById(userId);
      if (!user || !totpEnabled(user) || !user.totpSecret) {
        throw new HTTPException(404, { message: "not found" });
      }
      if (!(await verifyPassword(data.current_password, user.password))) {
        throw new HTTPException(401, { message: "invalid password" });
      }
      const secret = await openSecret(env, user.totpSecret, userId);
      const counter = await verifyTotpCode(secret, data.code, user.totpLastCounter);
      if (counter === null) {
        throw new HTTPException(401, { message: "invalid code" });
      }
      await assertLastFactor(userId, true);
      await users.clearTotp(userId);
    },

    async verifyLogin(input: unknown, userAgent: string | null): Promise<PublicSession> {
      const data = verifyLoginTotpSchema.parse(input);
      const userId = await peekLoginChallenge(env, data.mfa_token);
      await assertLoginAttemptsLeft(env, userId);
      const user = await users.findById(userId);
      if (!user || !totpEnabled(user) || !user.totpSecret || user.suspendedAt) {
        throw new HTTPException(401, { message: "invalid code" });
      }
      const secret = await openSecret(env, user.totpSecret, user.id);
      const counter = await verifyTotpCode(secret, data.code, user.totpLastCounter);
      if (counter === null) {
        if (await recordLoginFailure(env, data.mfa_token, user.id)) {
          throw new HTTPException(429, { message: "too many attempts" });
        }
        throw new HTTPException(401, { message: "invalid code" });
      }
      await dropLoginChallenge(env, data.mfa_token);
      await users.updateTotpLastCounter(user.id, counter);
      const session = await createSessionService(env).create(
        { userId: user.id, kind: "full" },
        userAgent,
      );
      await recordLogin(env);
      return session;
    },
  };
}
