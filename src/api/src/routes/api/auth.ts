import { Hono } from "hono";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { createTotpService } from "../../services/totp.service";
import type { AppEnv } from "../../types";

export const auth = new Hono<AppEnv>();

auth.post("/totp", rateLimitByIp("auth-totp", 10), async (c) => {
  const input = await c.req.json();
  const userAgent = c.req.header("User-Agent") ?? null;
  const session = await createTotpService(c.env).verifyLogin(input, userAgent);
  return c.json(session, 200);
});
