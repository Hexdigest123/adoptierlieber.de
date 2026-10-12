import { Hono } from "hono";
import type { AppEnv } from "../../types";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { createAdminService } from "../../services/admin.service";
import { createSessionService } from "../../services/session.service";
import { readSessionCookie } from "../../middlewares/session";
import { inviteTokenSchema } from "../../lib/zod";

export const invites = new Hono<AppEnv>();

// Tokens are read from the JSON body: request paths end up in logs.
invites.post("/preview", rateLimitByIp("invite-lookup", 20, { failClosed: true }), async (c) => {
  const { token } = inviteTokenSchema.parse(await c.req.json());
  return c.json(await createAdminService(c.env).getInvite(token));
});

invites.post("/acceptance", rateLimitByIp("invite-accept", 10, { failClosed: true }), async (c) => {
  let sessionUserId: string | null = null;
  const sessionToken = readSessionCookie(c);
  if (sessionToken) {
    try {
      const session = await createSessionService(c.env).validate(sessionToken);
      sessionUserId = session.userId;
    } catch {
      sessionUserId = null;
    }
  }
  const body = (await c.req.json()) as Record<string, unknown>;
  const { token } = inviteTokenSchema.parse(body);
  const input = { ...body };
  delete input.token;
  const result = await createAdminService(c.env).acceptInvite(token, input, sessionUserId);
  if (result.sessionToken) {
    return c.json(
      {
        sessionToken: result.sessionToken,
        expiresAt: result.expiresAt,
        setup_required: result.setup_required === true,
      },
      201,
    );
  }
  return c.json({});
});
