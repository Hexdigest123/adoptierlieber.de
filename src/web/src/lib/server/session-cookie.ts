import { dev } from "$app/environment";
import type { Cookies } from "@sveltejs/kit";

/**
 * `__Host-` keeps sibling subdomains from planting a Domain= session cookie.
 * Browsers only accept it with Secure, which dev (plain http) does not set.
 */
export const SESSION_COOKIE = dev ? "sessionToken" : "__Host-sessionToken";
/** Pre-rename production name; migrated in hooks.server.ts. */
export const LEGACY_SESSION_COOKIE = "sessionToken";
export const LAST_HOME_COOKIE = "lastHome";

const base = {
	path: "/",
	httpOnly: true,
	secure: !dev,
	sameSite: "lax" as const,
};

export function setSessionCookie(cookies: Cookies, token: string, expires: Date) {
	cookies.set(SESSION_COOKIE, token, { ...base, expires });
}

export function clearSessionCookie(cookies: Cookies) {
	cookies.delete(SESSION_COOKIE, { path: "/", secure: !dev });
	if (LEGACY_SESSION_COOKIE !== SESSION_COOKIE && cookies.get(LEGACY_SESSION_COOKIE)) {
		cookies.delete(LEGACY_SESSION_COOKIE, { path: "/", secure: !dev });
	}
}

/**
 * Move a pre-rename session cookie to the `__Host-` name so existing logins
 * survive the rename. The old cookie's expiry is not readable, so the new one
 * gets the 7-day session lifetime; the API still enforces the real expiry.
 * Transitional: drop this (and the API's plain-name fallback) once sessions
 * issued before the rename have expired.
 */
export function migrateLegacySessionCookie(cookies: Cookies) {
	if (LEGACY_SESSION_COOKIE === SESSION_COOKIE) return;
	const legacy = cookies.get(LEGACY_SESSION_COOKIE);
	if (!legacy) return;
	if (!cookies.get(SESSION_COOKIE)) {
		cookies.set(SESSION_COOKIE, legacy, { ...base, maxAge: 60 * 60 * 24 * 7 });
	}
	cookies.delete(LEGACY_SESSION_COOKIE, { path: "/", secure: !dev });
}

export function setLastHomeCookie(cookies: Cookies, home: "/app" | "/shelter") {
	cookies.set(LAST_HOME_COOKIE, home, {
		path: "/",
		httpOnly: true,
		secure: !dev,
		sameSite: "lax",
		maxAge: 60 * 60 * 24 * 365,
	});
}

export function getLastHomeCookie(cookies: Cookies): "/app" | "/shelter" | null {
	const value = cookies.get(LAST_HOME_COOKIE);
	return value === "/app" || value === "/shelter" ? value : null;
}
