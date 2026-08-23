import { dev } from "$app/environment";
import type { Cookies } from "@sveltejs/kit";
import { deLocalizeUrl } from "$lib/paraglide/runtime";

export const CHROME_COOKIE = "chrome";

export type Chrome = "app" | "landing";

const cookieBase = {
	path: "/",
	httpOnly: true,
	secure: !dev,
	sameSite: "lax" as const,
};

function setChromeCookie(cookies: Cookies, chrome: Chrome) {
	if (chrome === "app") {
		cookies.set(CHROME_COOKIE, "app", cookieBase);
		return;
	}
	cookies.delete(CHROME_COOKIE, { path: "/", secure: !dev });
}

function isAppPath(pathname: string): boolean {
	return pathname === "/app" || pathname.startsWith("/app/");
}

function isProfilePath(pathname: string): boolean {
	return pathname === "/profile" || pathname.startsWith("/profile/");
}

function isLandingPath(pathname: string): boolean {
	return !isAppPath(pathname) && !isProfilePath(pathname);
}

function refererPath(referer: string | null, origin: string): string | null {
	if (!referer) return null;
	try {
		const url = new URL(referer);
		if (url.origin !== origin) return null;
		return deLocalizeUrl(url).pathname;
	} catch {
		return null;
	}
}

export function resolveChrome({
	cookies,
	origin,
	pathname,
	referer,
}: {
	cookies: Cookies;
	origin: string;
	pathname: string;
	referer: string | null;
}): Chrome {
	const path = deLocalizeUrl(new URL(pathname, origin)).pathname;

	if (isAppPath(path)) {
		setChromeCookie(cookies, "app");
		return "app";
	}

	if (isLandingPath(path)) {
		setChromeCookie(cookies, "landing");
		return "landing";
	}

	if (!isProfilePath(path)) {
		return "landing";
	}

	const from = refererPath(referer, origin);
	if (from && isAppPath(from)) {
		setChromeCookie(cookies, "app");
		return "app";
	}
	if (from && isLandingPath(from)) {
		setChromeCookie(cookies, "landing");
		return "landing";
	}

	return cookies.get(CHROME_COOKIE) === "app" ? "app" : "landing";
}
