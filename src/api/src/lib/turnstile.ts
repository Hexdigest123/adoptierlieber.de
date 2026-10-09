import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { clientIp } from "../middlewares/rate-limit";
import type { AppEnv } from "../types";

const SITEVERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const VERIFY_TIMEOUT_MS = 4000;
// Siteverify's own limit; anything longer is not a token.
const MAX_TOKEN_LENGTH = 2048;

/** Must match the `action` the web form renders its widget with. */
export type TurnstileAction = "register" | "contact" | "reset";

type SiteverifyResult = {
  success?: boolean;
  action?: string;
  "error-codes"?: string[];
};

let warnedNoSecret = false;

function rejected() {
  return new HTTPException(403, { message: "captcha failed" });
}

/**
 * Throws 403 "captcha failed" unless `token` (the widget's
 * cf-turnstile-response, sent by the web as `turnstileToken`) passes Siteverify.
 *
 * Off until SECRET_TURNSTILE_SECRET is set. If Siteverify cannot be reached or reports
 * an internal error the request passes: a Cloudflare hiccup must not block
 * signups, and the IP rate limits and per-address mail throttles still apply.
 */
export async function requireTurnstile(
  c: Context<AppEnv>,
  token: unknown,
  action: TurnstileAction,
): Promise<void> {
  const secret = (
    c.env.SECRET_TURNSTILE_SECRET ??
    process.env.SECRET_TURNSTILE_SECRET ??
    ""
  ).trim();
  if (!secret) {
    if (!warnedNoSecret) {
      warnedNoSecret = true;
      console.warn("SECRET_TURNSTILE_SECRET is not set; Turnstile verification is skipped");
    }
    return;
  }
  if (typeof token !== "string" || !token || token.length > MAX_TOKEN_LENGTH) {
    throw rejected();
  }

  const body = new URLSearchParams({ secret, response: token });
  const ip = clientIp(c);
  if (ip !== "unknown") body.set("remoteip", ip);

  let result: SiteverifyResult;
  try {
    const response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      body,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`siteverify answered ${response.status}`);
    result = (await response.json()) as SiteverifyResult;
  } catch (e: unknown) {
    console.error(`turnstile ${action}: siteverify unreachable, failing open`, e);
    return;
  }

  if (result.success !== true) {
    const codes = result["error-codes"] ?? [];
    if (codes.includes("internal-error")) {
      console.error(`turnstile ${action}: siteverify internal error, failing open`);
      return;
    }
    if (codes.some((code) => code.endsWith("-input-secret"))) {
      // A wrong secret rejects everyone; fail closed, but say why.
      console.error(`turnstile ${action}: siteverify rejected SECRET_TURNSTILE_SECRET`, codes);
    }
    throw rejected();
  }
  // Testing keys answer without an action; real tokens carry the widget's.
  if (result.action !== undefined && result.action !== action) {
    throw rejected();
  }
}
