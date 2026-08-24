import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import { dropLoginChallenge, isMfaRequired, peekLoginChallenge, totpEnabled } from "../lib/mfa";
import { openSecret, sealSecret } from "../lib/secret-box";
import { generateTotpSecret, totpUri, verifyTotpCode } from "../lib/totp";
import { verifyPassword } from "../lib/hashing";
import { confirmTotpSchema, disableTotpSchema, verifyLoginTotpSchema } from "../lib/zod";
import { createUserRepo } from "../repositories/user.repo";
import { createWebauthnRepo } from "../repositories/webauthn.repo";
import type { PublicSession } from "../types";
import { createSessionService } from "./session.service";

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
    async startEnroll(userId: string): Promise<{ otpauth_uri: string; secret: string }> {
      const user = await users.findById(userId);
      if (!user) throw new HTTPException(404, { message: "user not found" });
      const secret = generateTotpSecret();
      const blob = await sealSecret(env, secret, userId);
      if (!(await users.updateTotpPending(userId, blob))) {
        throw new HTTPException(500, { message: "something wen't wrong" });
      }
      return { otpauth_uri: totpUri(user.email, secret), secret };
    },

    async confirmEnroll(userId: string, sessionToken: string, input: unknown): Promise<void> {
      const { code } = confirmTotpSchema.parse(input);
      const user = await users.findById(userId);
      if (!user?.totpPendingSecret) {
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
      const user = await users.findById(userId);
      if (!user || !totpEnabled(user) || !user.totpSecret || user.suspendedAt) {
        throw new HTTPException(401, { message: "invalid code" });
      }
      const secret = await openSecret(env, user.totpSecret, user.id);
      const counter = await verifyTotpCode(secret, data.code, user.totpLastCounter);
      if (counter === null) {
        throw new HTTPException(401, { message: "invalid code" });
      }
      await dropLoginChallenge(env, data.mfa_token);
      await users.updateTotpLastCounter(user.id, counter);
      return createSessionService(env).create({ userId: user.id, kind: "full" }, userAgent);
    },
  };
}
