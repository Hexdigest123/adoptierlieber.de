import { Hono } from "hono";
import { rateLimitByUser } from "../../middlewares/rate-limit";
import { sessionValidation } from "../../middlewares/session";
import { createTotpService } from "../../services/totp.service";
import type { AppEnv } from "../../types";

export const totp = new Hono<AppEnv>();

totp.use("*", sessionValidation);

totp.post("/", rateLimitByUser("totp-enroll", 5), async (c) => {
  const result = await createTotpService(c.env).startEnroll(c.get("userId"));
  return c.json(result, 200);
});

totp.post("/confirmation", rateLimitByUser("totp-confirm", 10), async (c) => {
  const input = await c.req.json();
  await createTotpService(c.env).confirmEnroll(c.get("userId"), c.get("sessionToken"), input);
  return c.json({}, 200);
});

totp.post("/disable", rateLimitByUser("totp-disable", 5), async (c) => {
  const input = await c.req.json();
  await createTotpService(c.env).disable(c.get("userId"), input);
  return c.json({}, 200);
});
