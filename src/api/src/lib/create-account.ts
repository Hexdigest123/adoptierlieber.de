import { HTTPException } from "hono/http-exception";
import type { Env } from "../config/env";
import { banFingerprint } from "./ban";
import { PLATFORM_ROLE } from "./roles";
import { createBanRepo } from "../repositories/ban.repo";
import { createUserRepo, type CreateUserInput } from "../repositories/user.repo";
import type { User } from "../types";

function isUniqueConstraint(error: unknown): boolean {
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

/** Insert a user. First account ever becomes SUPER_ADMIN. Race retries as USER. */
export async function insertRegisteredUser(
  env: Env,
  input: Omit<CreateUserInput, "platformRole"> & { platformRole?: number },
): Promise<User> {
  const repo = createUserRepo(env);
  const requested = input.platformRole;
  const trySuper = requested === undefined && !(await repo.hasSuperAdmin());
  const firstRole = requested ?? (trySuper ? PLATFORM_ROLE.SUPER_ADMIN : PLATFORM_ROLE.USER);

  try {
    const row = await repo.create({ ...input, platformRole: firstRole });
    if (!row) {
      throw new HTTPException(500, { message: "something wen't wrong" });
    }
    return row;
  } catch (error: unknown) {
    if (firstRole === PLATFORM_ROLE.SUPER_ADMIN && isUniqueConstraint(error)) {
      const row = await repo.create({ ...input, platformRole: PLATFORM_ROLE.USER });
      if (!row) {
        throw new HTTPException(500, { message: "something wen't wrong" });
      }
      return row;
    }
    throw error;
  }
}
