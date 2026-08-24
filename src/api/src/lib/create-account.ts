import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import { banFingerprint } from "./ban";
import { isBreakGlassEmail, parseSuperAdminEmails, PLATFORM_ROLE } from "./roles";
import { createBanRepo } from "../repositories/ban.repo";
import { createUserRepo, type CreateUserInput } from "../repositories/user.repo";
import type { User } from "../types";

export function isUniqueConstraint(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /UNIQUE constraint failed/i.test(message);
}

export async function assertRegistrationAllowed(
  env: Env,
  input: { name: string; street: string; zip: string; city: string },
): Promise<void> {
  const hash = await banFingerprint(input);
  if (await createBanRepo(env).findByHash(hash)) {
    throw new HTTPException(409, { message: "registration not allowed" });
  }
}

export function superAdminAllowlist(env: Env): string[] {
  return parseSuperAdminEmails(env.SUPER_ADMIN_EMAIL ?? process.env.SUPER_ADMIN_EMAIL);
}

/** Persist SUPER_ADMIN after verified allowlist mail. Unique-index race stays USER. */
export async function grantSuperAdminIfAllowlisted(env: Env, user: User): Promise<User> {
  const allowlist = superAdminAllowlist(env);
  if (!user.emailVerifiedAt || user.platformRole === PLATFORM_ROLE.SUPER_ADMIN) {
    return user;
  }
  if (!isBreakGlassEmail(user.email, allowlist)) {
    return user;
  }
  try {
    const updated = await createUserRepo(env).updatePlatformRole(
      user.id,
      PLATFORM_ROLE.SUPER_ADMIN,
    );
    return updated ?? user;
  } catch (error: unknown) {
    if (isUniqueConstraint(error)) return user;
    throw error;
  }
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
