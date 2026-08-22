import { dev } from "$app/environment";
import type { Cookies } from "@sveltejs/kit";

export const SESSION_COOKIE = "sessionToken";

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
