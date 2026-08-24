import { dev } from "$app/environment";
import type { Cookies } from "@sveltejs/kit";

export const SESSION_COOKIE = "sessionToken";
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
