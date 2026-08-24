import { redirect } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import type { Handle, HandleFetch } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";
import { getTextDirection } from "$lib/paraglide/runtime";
import { paraglideMiddleware } from "$lib/paraglide/server";
import { isMfaSetupRequired, MFA_SETUP_PATH } from "$lib/mfa-setup";
import { clearSessionCookie, SESSION_COOKIE } from "$lib/server/session-cookie";

function secretsEqual(a: string, b: string) {
	const left = new TextEncoder().encode(a);
	const right = new TextEncoder().encode(b);
	if (left.length !== right.length) return false;
	let diff = 0;
	for (let i = 0; i < left.length; i++) diff |= left[i] ^ right[i];
	return diff === 0;
}

const SECURITY_HEADERS: Record<string, string> = {
	"X-Content-Type-Options": "nosniff",
	"X-Frame-Options": "DENY",
	"Referrer-Policy": "strict-origin-when-cross-origin",
	"Permissions-Policy":
		"camera=(), microphone=(), geolocation=(self), publickey-credentials-get=(self), publickey-credentials-create=(self)",
	"Content-Security-Policy": "frame-ancestors 'none'",
};

const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		response.headers.set(key, value);
	}
	return response;
};

const handleBasicAuth: Handle = async ({ event, resolve }) => {
	const { BASIC_AUTH_USER, BASIC_AUTH_PASSWORD } = event.platform?.env ?? {};
	if (BASIC_AUTH_USER && BASIC_AUTH_PASSWORD) {
		const expected = "Basic " + btoa(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`);
		if (!secretsEqual(event.request.headers.get("authorization") ?? "", expected)) {
			return new Response("Unauthorized", {
				status: 401,
				headers: { "WWW-Authenticate": 'Basic realm="staging"' },
			});
		}
	}
	return resolve(event);
};

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace("%paraglide.lang%", locale)
					.replace("%paraglide.dir%", getTextDirection(locale)),
		});
	});

/** Validate the sessionToken cookie against the API and expose the user via locals. */
const handleSession: Handle = async ({ event, resolve }) => {
	event.locals.user = null;

	// Proxy hops do not read locals.user; the API re-checks the cookie.
	const path = event.url.pathname;
	if (path === "/api" || path.startsWith("/api/")) {
		return resolve(event);
	}

	const sessionToken = event.cookies.get(SESSION_COOKIE);
	const apiUrl = env.PUBLIC_API_URL;
	if (sessionToken && apiUrl) {
		try {
			const response = await event.fetch(`${apiUrl}/api/sessions/me`, {
				headers: { cookie: `${SESSION_COOKIE}=${sessionToken}` },
			});
			if (response.ok) {
				event.locals.user = await response.json();
			} else if (response.status === 401) {
				clearSessionCookie(event.cookies);
			}
		} catch {
			// API unreachable — treat as logged out
		}
	}

	const user = event.locals.user;
	if (user?.session_kind === "setup") {
		const allowed =
			path === MFA_SETUP_PATH ||
			path === "/logout" ||
			path === "/login" ||
			path.startsWith(`${MFA_SETUP_PATH}/`);
		if (!allowed) {
			return new Response(null, {
				status: 303,
				headers: { location: MFA_SETUP_PATH },
			});
		}
	}

	return resolve(event);
};

/** Internal action fetch("/api/…") has no CF IP. Stamp the page request's. */
export const handleFetch: HandleFetch = async ({ event, request, fetch }) => {
	const url = new URL(request.url);
	if (url.origin === event.url.origin && url.pathname.startsWith("/api/")) {
		const ip = event.request.headers.get("cf-connecting-ip") ?? event.getClientAddress();
		const headers = new Headers(request.headers);
		headers.set("cf-connecting-ip", ip);
		request = new Request(request, { headers });
	}

	const response = await fetch(request);
	const path = event.url.pathname;
	const skip =
		path === "/api" ||
		path.startsWith("/api/") ||
		path === MFA_SETUP_PATH ||
		path === "/logout" ||
		path.startsWith(`${MFA_SETUP_PATH}/`);
	if (!skip && (await isMfaSetupRequired(response))) {
		redirect(303, MFA_SETUP_PATH);
	}
	return response;
};

export const handle = sequence(
	handleSecurityHeaders,
	handleBasicAuth,
	handleParaglide,
	handleSession,
);
