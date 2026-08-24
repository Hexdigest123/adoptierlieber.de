import { Hono } from "hono";
import { createUserService } from "../../services/user.service";
import type { AppEnv } from "../../types";
import { sessionValidation } from "../../middlewares/session";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { sendMail } from "../../lib/mail";
import { verifyEmailTemplate } from "../../lib/email-templates";
import { readCreateBody } from "../../lib/avatar";

export const users = new Hono<AppEnv>();

/** Register as a new user. */
users.post("/", rateLimitByIp("create-user", 5), async (c) => {
  const { fields, avatar } = await readCreateBody(c.req.raw);
  const result = await createUserService(c.env).create(fields, avatar);
  if (result && "verificationToken" in result) {
    const email = typeof fields.email === "string" ? fields.email : "";
    c.executionCtx.waitUntil(
      sendMail(verifyEmailTemplate({ to: email, token: result.verificationToken })),
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

/** Update the authenticated user's name or display name. */
users.patch("/me", sessionValidation, async (c) => {
  const input = await c.req.json();
  await createUserService(c.env).updateProfile(c.get("userId"), input);
  return c.json({}, 200);
});

/** Change the authenticated user's password. */
users.patch("/me/password", sessionValidation, rateLimitByIp("change-password", 5), async (c) => {
  const input = await c.req.json();
  await createUserService(c.env).changePassword(c.get("userId"), c.get("sessionToken"), input);
  return c.json({}, 200);
});

function avatarResponse(object: {
  body: ReadableStream | null;
  httpMetadata?: { contentType?: string };
  httpEtag?: string;
}) {
  const headers = new Headers();
  headers.set("content-type", object.httpMetadata?.contentType ?? "application/octet-stream");
  headers.set("cache-control", "private, no-cache");
  if (object.httpEtag) {
    headers.set("etag", object.httpEtag);
  }
  return new Response(object.body, { status: 200, headers });
}

/** Stream the authenticated user's avatar from R2. */
users.get("/me/avatar", sessionValidation, async (c) => {
  const object = await createUserService(c.env).getAvatar(c.get("userId"));
  if (!object) {
    return c.json({ error: "avatar not found" }, 404);
  }
  return avatarResponse(object);
});

/** Stream another user's avatar when the viewer shares a thread or shelter. */
users.get("/:id/avatar", sessionValidation, async (c) => {
  const object = await createUserService(c.env).getAvatarForViewer(c.get("userId"), c.req.param("id"));
  if (!object) {
    return c.json({ error: "avatar not found" }, 404);
  }
  return avatarResponse(object);
});

/** Replace the authenticated user's avatar. */
users.put("/me/avatar", sessionValidation, async (c) => {
  const form = await c.req.formData();
  const file = form.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return c.json({ error: "missing avatar" }, 400);
  }
  await createUserService(c.env).putAvatar(c.get("userId"), file);
  return c.json({}, 200);
});

/** Remove the authenticated user's avatar. */
users.delete("/me/avatar", sessionValidation, async (c) => {
  await createUserService(c.env).deleteAvatar(c.get("userId"));
  return c.json({}, 200);
});

/** Delete an authenticated user. */
users.delete("/delete", sessionValidation, rateLimitByIp("delete-user", 5), async (c) => {
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
