import { Hono } from "hono";
import { createUserService } from "../../services/user.service";
import type { AppEnv } from "../../types";
import { sessionValidation } from "../../middlewares/session";

export const users = new Hono<AppEnv>();

users.use("/delete", sessionValidation);

/** Register as a new user. */
users.post("/", async (c) => {
  const input = await c.req.json();
  const user = await createUserService(c.env).create(input);
  return c.json(user, 201);
});

/** Delete an authenticated user. */
users.delete("/delete", async (c) => {
  const input = await c.req.json();
  await createUserService(c.env).delete(input, c.get("sessionToken"));
  return c.json({}, 200);
});

/** Reset the users password. */
users.post("/reset", async (c) => {
  const input = await c.req.json();
  await createUserService(c.env).reset(input);

  return c.json({}, 200);
});

/** Authenticate with email and password*/
users.post("/auth", async (c) => {
  const input = await c.req.json();
  const session = await createUserService(c.env).authenticate(input);
  return c.json(session, 200);
});
