import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import { banEmailHash, banFingerprint } from "./ban";
import { registrationAttemptTemplate, verifyEmailTemplate } from "./email-templates";
import { generateToken } from "./hashing";
import { sendMail } from "./mail";
import { takeMailSlot } from "./mail-throttle";
import {
  isBreakGlassEmail,
  parseSuperAdminEmails,
  passwordSetAfterVerification,
  PLATFORM_ROLE,
} from "./roles";
import type { AuditAction } from "./zod";
import { createAdminRepo } from "../repositories/admin.repo";
import { createBanRepo } from "../repositories/ban.repo";
import { createUserRepo, type CreateUserInput } from "../repositories/user.repo";
import type { User } from "../types";

export function isUniqueConstraint(error: unknown): boolean {
  // D1 errors arrive wrapped (DrizzleQueryError -> D1_ERROR), so walk the causes.
  for (let current = error, depth = 0; current && depth < 5; depth++) {
    const message = current instanceof Error ? current.message : String(current);
    if (/UNIQUE constraint failed/i.test(message)) return true;
    current = current instanceof Error ? current.cause : undefined;
  }
  return false;
}

export async function assertRegistrationAllowed(
  env: Env,
  input: { name: string; street: string; zip: string; city: string; email: string },
): Promise<void> {
  const bans = createBanRepo(env);
  const [byPerson, byEmail] = await Promise.all([
    banFingerprint(input).then((hash) => bans.findByHash(hash)),
    banEmailHash(input.email).then((hash) => bans.findByEmailHash(hash)),
  ]);
  if (byPerson || byEmail) {
    throw new HTTPException(409, { message: "registration not allowed" });
  }
}

const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * Signup with a taken address answers like a fresh signup; the owner gets a
 * short notice instead (at most one a day), so the response reveals nothing.
 * A still unverified account gets a fresh verification link in its place, so
 * a lost first mail is no dead end until the unverified purge.
 */
export async function notifyRegistrationAttempt(env: Env, email: string): Promise<void> {
  try {
    const slot = await takeMailSlot(env, "register-notice", email, {
      limit: 1,
      windowSeconds: 24 * 60 * 60,
    });
    if (!slot) return;
    const repo = createUserRepo(env);
    const user = await repo.findByEmail(email);
    if (user && !user.emailVerifiedAt && !user.suspendedAt) {
      // The account keeps its first password; the mail says so.
      const { token, hashedToken } = await generateToken();
      const expiresAt = new Date(Date.now() + VERIFY_TTL_MS);
      if (await repo.renewVerificationToken(user.id, hashedToken, expiresAt)) {
        await sendMail(verifyEmailTemplate({ to: user.email, token, repeated: true }));
        return;
      }
    }
    await sendMail(registrationAttemptTemplate({ to: email }));
  } catch (e: unknown) {
    console.error(e);
  }
}

export function superAdminAllowlist(env: Env): string[] {
  return parseSuperAdminEmails(env.SUPER_ADMIN_EMAIL ?? process.env.SUPER_ADMIN_EMAIL);
}

/**
 * Persist SUPER_ADMIN for an allowlisted mail whose password was set after
 * verification (see passwordSetAfterVerification). Unique-index race stays USER.
 */
export async function grantSuperAdminIfAllowlisted(env: Env, user: User): Promise<User> {
  const allowlist = superAdminAllowlist(env);
  if (user.platformRole === PLATFORM_ROLE.SUPER_ADMIN || !passwordSetAfterVerification(user)) {
    return user;
  }
  if (!isBreakGlassEmail(user.email, allowlist)) {
    return user;
  }
  let updated: User | undefined;
  try {
    updated = await createUserRepo(env).updatePlatformRole(user.id, PLATFORM_ROLE.SUPER_ADMIN);
  } catch (error: unknown) {
    if (isUniqueConstraint(error)) return user;
    throw error;
  }
  if (!updated) return user;
  const action: AuditAction = "grant_super_admin";
  await createAdminRepo(env).insertAudit({
    action,
    actorId: updated.id,
    actorName: updated.name,
    actorEmail: updated.email,
    targetType: "user",
    targetId: updated.id,
    targetLabel: updated.email,
    reason: "SUPER_ADMIN_EMAIL",
  });
  return updated;
}

/** Insert a user. Register never assigns SUPER_ADMIN. */
export async function insertRegisteredUser(
  env: Env,
  input: Omit<CreateUserInput, "platformRole"> & { platformRole?: number },
): Promise<User> {
  const requested = input.platformRole;
  const platformRole =
    requested === undefined || requested === PLATFORM_ROLE.SUPER_ADMIN
      ? PLATFORM_ROLE.USER
      : requested;
  const row = await createUserRepo(env).create({
    ...input,
    platformRole,
  });
  if (!row) {
    throw new HTTPException(500, { message: "something wen't wrong" });
  }
  return row;
}
