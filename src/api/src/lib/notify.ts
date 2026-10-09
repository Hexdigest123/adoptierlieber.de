import type { Context } from "hono";
import type { AppEnv } from "../types";
import { sendMail, type MailOptions } from "./mail";

const DEFAULT_NOTIFY_TO = "pierre@adoptierlieber.de";

export function notifyRecipient(): string | null {
  const configured = process.env.SECRET_NOTIFY_TO;
  // unset: default inbox, set but empty: disabled
  if (configured === undefined) return DEFAULT_NOTIFY_TO;
  return configured.trim() || null;
}

export function notifyInBackground(c: Context<AppEnv>, build: (to: string) => MailOptions): void {
  try {
    const to = notifyRecipient();
    if (!to) return;
    c.executionCtx.waitUntil(
      sendMail(build(to)).catch((error: unknown) => console.error("notify mail failed", error)),
    );
  } catch (error: unknown) {
    console.error("notify mail failed", error);
  }
}
