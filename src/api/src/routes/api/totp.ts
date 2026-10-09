import { Hono } from "hono";
import { rateLimitByUser } from "../../middlewares/rate-limit";
import { sessionValidation } from "../../middlewares/session";
import { createTotpService } from "../../services/totp.service";
import type { AppEnv } from "../../types";

export const totp = new Hono<AppEnv>();

totp.use("*", sessionValidation);

/** Start (or replace) TOTP. Body `{ current_password, code? }` unless first factor in setup. */
totp.post("/", rateLimitByUser("totp-enroll", 5), async (c) => {
  const input = await c.req.json().catch(() => ({}));
  const result = await createTotpService(c.env).startEnroll(
    c.get("userId"),
    c.get("sessionKind"),
    input,
  );
  return c.json(result, 200);
});

totp.post("/confirmation", rateLimitByUser("totp-confirm", 10, { failClosed: true }), async (c) => {
  const input = await c.req.json();
  await createTotpService(c.env).confirmEnroll(c.get("userId"), c.get("sessionToken"), input);
  return c.json({}, 200);
});

totp.post("/disable", rateLimitByUser("totp-disable", 5, { failClosed: true }), async (c) => {
  const input = await c.req.json();
  await createTotpService(c.env).disable(c.get("userId"), input);
  return c.json({}, 200);
});
