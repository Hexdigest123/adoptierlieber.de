import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { superAdminAllowlist } from "../lib/create-account";
import { isPlatformAdmin } from "../lib/roles";
import { createUserRepo } from "../repositories/user.repo";

export const requirePlatformAdmin: MiddlewareHandler = async (c, next) => {
  const user = await createUserRepo(c.env).findById(c.get("userId"));
  if (!user || !isPlatformAdmin(user, superAdminAllowlist(c.env))) {
    throw new HTTPException(404, { message: "not found" });
  }
  await next();
};
