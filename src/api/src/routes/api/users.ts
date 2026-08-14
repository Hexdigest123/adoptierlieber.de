import { Hono } from "hono";
import { createUserService } from "../../services/user.service";
import type { AppEnv } from "../../types";

export const users = new Hono<AppEnv>();

users.get("/", async (c) => {
  const service = createUserService(c.env);
  return c.json(await service.list());
});

users.post("/", async (c) => {
  const input = await c.req.json();
  const user = await createUserService(c.env).create(input);
  return c.json(user, 201);
});
