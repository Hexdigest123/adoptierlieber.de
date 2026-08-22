import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { createUserService } from "../../services/user.service";
import { sessionValidation } from "../../middlewares/session";
import { createSessionService } from "../../services/session.service";

export const sessions = new Hono<AppEnv>();

sessions.use("*", sessionValidation);

sessions.get("/me", async (c) => {
  const user = await createUserService(c.env).getById(c.get("userId"));
  return c.json(user, 200);
});

sessions.get("/refresh", async (c) => {
  if (!(await createSessionService(c.env).refreshExpiresAtWithToken(c.get("sessionToken")))) {
    return c.json({ error: "something wen't wrong" }, 500);
  }
  return c.json({ status: "ok" }, 200);
});
