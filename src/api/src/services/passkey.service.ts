import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type AuthenticatorTransportFuture,
  type RegistrationResponseJSON,
} from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import { verifyPassword } from "../lib/hashing";
import {
  isMfaRequired,
  dropWebauthnAuthChallenge,
  peekWebauthnAuthChallenge,
  putWebauthnAuthChallenge,
  putWebauthnRegChallenge,
  takeWebauthnRegChallenge,
  totpEnabled,
} from "../lib/mfa";
import { asTransports, relyingParty } from "../lib/webauthn";
import {
  assertPasskeySchema,
  disablePasskeySchema,
  registerPasskeySchema,
  renamePasskeySchema,
} from "../lib/zod";
import { createUserRepo } from "../repositories/user.repo";
import { createWebauthnRepo } from "../repositories/webauthn.repo";
import type { PublicSession } from "../types";
import { createSessionService } from "./session.service";

function asRegistrationResponse(value: Record<string, unknown>): RegistrationResponseJSON {
  if (typeof value.id !== "string" || typeof value.rawId !== "string") {
    throw new HTTPException(400, { message: "invalid request" });
  }
  return value as unknown as RegistrationResponseJSON;
}

function asAuthenticationResponse(value: Record<string, unknown>): AuthenticationResponseJSON {
  if (typeof value.id !== "string" || typeof value.rawId !== "string") {
    throw new HTTPException(400, { message: "invalid request" });
  }
  return value as unknown as AuthenticationResponseJSON;
}

export function createPasskeyService(env: Env) {
  const users = createUserRepo(env);
  const creds = createWebauthnRepo(env);

  async function assertLastFactor(userId: string) {
    const user = await users.findById(userId);
    if (!user) throw new HTTPException(404, { message: "user not found" });
    const count = (await creds.countByUserId(userId))?.n ?? 0;
    if (isMfaRequired(user, env) && !totpEnabled(user) && count <= 1) {
      throw new HTTPException(409, { message: "last factor" });
    }
  }

  return {
    async registrationOptions(userId: string) {
      const user = await users.findById(userId);
      if (!user) throw new HTTPException(404, { message: "user not found" });
      const existing = await creds.listByUserId(userId);
      const rp = relyingParty();
      const options = await generateRegistrationOptions({
        rpName: rp.rpName,
        rpID: rp.rpID,
        userID: Uint8Array.from(new TextEncoder().encode(user.id)),
        userName: user.email,
        userDisplayName: user.displayName || user.name,
        attestationType: "none",
        excludeCredentials: existing.map((row) => ({
          id: row.credentialId,
          transports: asTransports(row.transports),
        })),
        authenticatorSelection: {
          residentKey: "required",
          userVerification: "preferred",
        },
      });
      await putWebauthnRegChallenge(env, userId, options.challenge);
      return options;
    },

    async register(userId: string, sessionToken: string, input: unknown): Promise<void> {
      const data = registerPasskeySchema.parse(input);
      const user = await users.findById(userId);
      if (!user) throw new HTTPException(404, { message: "user not found" });
      const expectedChallenge = await takeWebauthnRegChallenge(env, userId);
      const rp = relyingParty();
      const verification = await verifyRegistrationResponse({
        response: asRegistrationResponse(data.response),
        expectedChallenge,
        expectedOrigin: rp.expectedOrigins,
        expectedRPID: rp.rpID,
        requireUserVerification: false,
      });
      if (!verification.verified || !verification.registrationInfo) {
        throw new HTTPException(401, { message: "invalid challenge" });
      }
      const info = verification.registrationInfo;
      const publicKey = isoBase64URL.fromBuffer(info.credential.publicKey);
      const created = await creds.create({
        userId,
        credentialId: info.credential.id,
        publicKey,
        counter: info.credential.counter,
        transports: info.credential.transports ?? null,
        deviceType: info.credentialDeviceType,
        backedUp: info.credentialBackedUp,
        name: data.name,
      });
      if (!created) {
        throw new HTTPException(409, { message: "already registered" });
      }
      await createSessionService(env).upgradeToFull(sessionToken);
    },

    async list(userId: string) {
      const rows = await creds.listByUserId(userId);
      return {
        items: rows.map((row) => ({
          id: row.id,
          name: row.name,
          created_at: row.createdAt.toISOString(),
          last_used_at: row.lastUsedAt ? row.lastUsedAt.toISOString() : null,
        })),
      };
    },

    async rename(userId: string, id: string, input: unknown): Promise<void> {
      const data = renamePasskeySchema.parse(input);
      const row = await creds.findById(id);
      if (!row || row.userId !== userId) {
        throw new HTTPException(404, { message: "not found" });
      }
      if (!(await creds.updateName(id, data.name))) {
        throw new HTTPException(404, { message: "not found" });
      }
    },

    async remove(userId: string, id: string, input: unknown): Promise<void> {
      const data = disablePasskeySchema.parse(input);
      const user = await users.findById(userId);
      const row = await creds.findById(id);
      if (!user || !row || row.userId !== userId) {
        throw new HTTPException(404, { message: "not found" });
      }
      if (!(await verifyPassword(data.current_password, user.password))) {
        throw new HTTPException(401, { message: "invalid password" });
      }
      await assertLastFactor(userId);
      await creds.delete(id);
    },

    async authenticationOptions() {
      const rp = relyingParty();
      const options = await generateAuthenticationOptions({
        rpID: rp.rpID,
        allowCredentials: [],
        userVerification: "preferred",
      });
      const challenge_id = await putWebauthnAuthChallenge(env, options.challenge);
      return { ...options, challenge_id };
    },

    async authenticate(input: unknown, userAgent: string | null): Promise<PublicSession> {
      const data = assertPasskeySchema.parse(input);
      const expectedChallenge = await peekWebauthnAuthChallenge(env, data.challenge_id);
      const response = asAuthenticationResponse(data.response);
      const stored = await creds.findByCredentialId(response.id);
      if (!stored) {
        throw new HTTPException(401, { message: "invalid challenge" });
      }
      const user = await users.findById(stored.userId);
      if (!user || user.suspendedAt || !user.emailVerifiedAt) {
        throw new HTTPException(401, { message: "invalid challenge" });
      }
      const rp = relyingParty();
      const publicKey = isoBase64URL.toBuffer(stored.publicKey);
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge,
        expectedOrigin: rp.expectedOrigins,
        expectedRPID: rp.rpID,
        credential: {
          id: stored.credentialId,
          publicKey,
          counter: stored.counter,
          transports: asTransports(stored.transports) as AuthenticatorTransportFuture[] | undefined,
        },
        requireUserVerification: false,
      });
      if (!verification.verified) {
        throw new HTTPException(401, { message: "invalid challenge" });
      }
      await dropWebauthnAuthChallenge(env, data.challenge_id);
      await creds.updateCounter(stored.id, verification.authenticationInfo.newCounter);
      return createSessionService(env).create({ userId: user.id, kind: "full" }, userAgent);
    },
  };
}
