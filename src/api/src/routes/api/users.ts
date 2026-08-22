import { Hono } from "hono";
import { createUserService } from "../../services/user.service";
import type { AppEnv } from "../../types";
import { sessionValidation } from "../../middlewares/session";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { sendMail } from "../../lib/mail";
import { verifyEmailTemplate } from "../../lib/email-templates";

export const users = new Hono<AppEnv>();

/** Register as a new user. */
users.post("/", rateLimitByIp("create-user", 5), async (c) => {
  const input = await c.req.json();
  const result = await createUserService(c.env).create(input);
  if (result && "verificationToken" in result) {
    c.executionCtx.waitUntil(
      sendMail(verifyEmailTemplate({ to: input.email, token: result.verificationToken })),
    );
  }
  return c.json({}, 201);
});

/** Verify the email of a user. */
users.post("/verify", rateLimitByIp("verify-email", 10), async (c) => {
  const input = await c.req.json();
  const verified = await createUserService(c.env).verifyEmail(input);
  if (!verified) {
    return c.json({ error: "invalid verification" }, 400);
  }
  return c.json({}, 200);
});

/** Delete an authenticated user. */
users.delete("/delete", sessionValidation, async (c) => {
  const input = await c.req.json();
  await createUserService(c.env).delete(input, c.get("sessionToken"));
  return c.json("", 200);
});

/** Reset the users password. */
users.post("/reset", rateLimitByIp("reset-password", 5), async (c) => {
  const input = await c.req.json();
  await createUserService(c.env).reset(input);

  return c.json("", 200);
});

/** Logout from a single session as the current user */
users.post("/logout", sessionValidation, async (c) => {
  await createUserService(c.env).logout(c.get("sessionToken"));
  return c.json("", 200);
});

/** Logout from a all sessions as the current user */
users.post("/logout-all", sessionValidation, async (c) => {
  await createUserService(c.env).logoutAll(c.get("userId"));
  return c.json("", 200);
});

/** Authenticate with email and password*/
users.post("/auth", rateLimitByIp("authenticate", 10), async (c) => {
  const input = await c.req.json();
  const userAgent = c.req.header("User-Agent") ?? null;
  const session = await createUserService(c.env).authenticate(input, userAgent);
  return c.json(session, 200);
});
