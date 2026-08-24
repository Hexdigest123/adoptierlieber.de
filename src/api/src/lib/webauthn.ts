import type { AuthenticatorTransportFuture } from "@simplewebauthn/server";
import { siteUrl } from "./email-templates";

export function relyingParty() {
  const origin = siteUrl();
  const url = new URL(origin.includes("://") ? origin : `https://${origin}`);
  const host = url.hostname.replace(/^www\./, "");
  const origins = new Set<string>([`${url.protocol}//${url.host}`]);
  if (host !== "localhost" && host !== "127.0.0.1") {
    origins.add(`${url.protocol}//${host}`);
    origins.add(`${url.protocol}//www.${host}`);
  }
  return {
    rpName: "Adoptier Lieber",
    rpID: host === "127.0.0.1" ? "localhost" : host,
    expectedOrigins: [...origins],
  };
}

export function asTransports(
  value: string[] | null | undefined,
): AuthenticatorTransportFuture[] | undefined {
  if (!value || value.length === 0) return undefined;
  return value as AuthenticatorTransportFuture[];
}
