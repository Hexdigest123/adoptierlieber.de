import type { MiddlewareHandler } from "hono";
import { getCookie } from "hono/cookie";
import { HTTPException } from "hono/http-exception";
import { createSessionService } from "../services/session.service";
import { createUserRepo } from "../repositories/user.repo";
import { createWebauthnRepo } from "../repositories/webauthn.repo";
import { effectiveSessionKind } from "../lib/mfa";

function setupAllowed(method: string, path: string): boolean {
  if (path === "/api/sessions/me" || path === "/api/sessions/refresh") return true;
  if (method === "POST" && path === "/api/users/logout") return true;
  if (method === "POST" && path === "/api/users/logout-all") return true;
  if (method === "POST" && path === "/api/totp") return true;
  if (method === "POST" && path === "/api/totp/confirmation") return true;
  if (method === "POST" && path === "/api/passkeys/registrations/options") return true;
  if (method === "POST" && path === "/api/passkeys/registrations") return true;
  if (method === "GET" && path === "/api/passkeys") return true;
  return false;
}

export const sessionValidation: MiddlewareHandler = async (c, next) => {
  const sessionToken = getCookie(c, "sessionToken");
  if (!sessionToken) {
    return c.json({ error: "invalid session" }, 401);
  }
  const session = await createSessionService(c.env).validate(sessionToken);
  if (!session) {
    return c.json({ error: "invalid session" }, 401);
  }
  const user = await createUserRepo(c.env).findById(session.userId);
  const passkeys = user ? await createWebauthnRepo(c.env).countByUserId(user.id) : { n: 0 };
  const kind = user
    ? effectiveSessionKind(session.kind ?? "full", user, passkeys?.n ?? 0, c.env)
    : (session.kind ?? "full");
  c.set("userId", session.userId);
  c.set("sessionToken", sessionToken);
  c.set("sessionKind", kind);

  if (kind === "setup" && !setupAllowed(c.req.method, new URL(c.req.url).pathname)) {
    throw new HTTPException(403, { message: "mfa setup required" });
  }

  await next();
};

export const requireFullSession: MiddlewareHandler = async (c, next) => {
  if (c.get("sessionKind") !== "full") {
    throw new HTTPException(403, { message: "mfa setup required" });
  }
  await next();
};
