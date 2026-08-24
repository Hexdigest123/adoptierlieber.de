import { Hono } from "hono";
import { rateLimitByIp, rateLimitByUser } from "../../middlewares/rate-limit";
import { sessionValidation } from "../../middlewares/session";
import { createPasskeyService } from "../../services/passkey.service";
import type { AppEnv } from "../../types";

export const passkeys = new Hono<AppEnv>();

passkeys.post("/assertions/options", rateLimitByIp("passkey-assert-options", 20), async (c) => {
  const options = await createPasskeyService(c.env).authenticationOptions();
  return c.json(options, 200);
});

passkeys.post("/assertions", rateLimitByIp("passkey-assert", 10), async (c) => {
  const input = await c.req.json();
  const userAgent = c.req.header("User-Agent") ?? null;
  const session = await createPasskeyService(c.env).authenticate(input, userAgent);
  return c.json(session, 200);
});

passkeys.use("*", sessionValidation);

passkeys.post("/registrations/options", rateLimitByUser("passkey-reg-options", 10), async (c) => {
  const options = await createPasskeyService(c.env).registrationOptions(c.get("userId"));
  return c.json(options, 200);
});

passkeys.post("/registrations", rateLimitByUser("passkey-reg", 10), async (c) => {
  const input = await c.req.json();
  await createPasskeyService(c.env).register(c.get("userId"), c.get("sessionToken"), input);
  return c.json({}, 200);
});

passkeys.get("/", async (c) => {
  const result = await createPasskeyService(c.env).list(c.get("userId"));
  return c.json(result, 200);
});

passkeys.patch("/:id", async (c) => {
  const input = await c.req.json();
  await createPasskeyService(c.env).rename(c.get("userId"), c.req.param("id"), input);
  return c.json({}, 200);
});

passkeys.post("/:id/disable", rateLimitByUser("passkey-disable", 5), async (c) => {
  const input = await c.req.json();
  await createPasskeyService(c.env).remove(c.get("userId"), c.req.param("id"), input);
  return c.json({}, 200);
});
