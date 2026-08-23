import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { createSessionService } from "../services/session.service";

export const sessionValidation: MiddlewareHandler = async (c, next) => {
  const sessionToken = getCookie(c, "sessionToken");
  if (!sessionToken) {
    return c.json({ error: "invalid session" }, 401);
  }
  const session = await createSessionService(c.env).validate(sessionToken);
  if (!session) {
    return c.json({ error: "invalid session" }, 401);
  }
  c.set("userId", session.userId);
  c.set("sessionToken", sessionToken);

  await next();
};
