import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { createUserRepo } from "../repositories/user.repo";
import { isPlatformAdmin } from "../lib/roles";

export const requirePlatformAdmin: MiddlewareHandler = async (c, next) => {
  const user = await createUserRepo(c.env).findById(c.get("userId"));
  if (!user || !isPlatformAdmin(user.platformRole)) {
    throw new HTTPException(404, { message: "not found" });
  }
  await next();
};
