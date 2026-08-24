import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import type { AppEnv } from "../../types";
import { rateLimitByIp } from "../../middlewares/rate-limit";
import { createAdminService } from "../../services/admin.service";
import { createSessionService } from "../../services/session.service";

export const invites = new Hono<AppEnv>();

invites.get("/:token", rateLimitByIp("invite-lookup", 20), async (c) => {
  return c.json(await createAdminService(c.env).getInvite(c.req.param("token")));
});

invites.post("/:token/acceptance", rateLimitByIp("invite-accept", 10), async (c) => {
  let sessionUserId: string | null = null;
  const sessionToken = getCookie(c, "sessionToken");
  if (sessionToken) {
    try {
      const session = await createSessionService(c.env).validate(sessionToken);
      sessionUserId = session.userId;
    } catch {
      sessionUserId = null;
    }
  }
  let input: unknown = {};
  const contentType = c.req.header("content-type") ?? "";
  if (contentType.includes("application/json")) {
    input = await c.req.json();
  }
  const result = await createAdminService(c.env).acceptInvite(
    c.req.param("token"),
    input,
    sessionUserId,
  );
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
