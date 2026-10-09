import { redirect } from "@sveltejs/kit";
import { sequence } from "@sveltejs/kit/hooks";
import type { Handle, HandleFetch } from "@sveltejs/kit";
import { dev } from "$app/environment";
import { env } from "$env/dynamic/public";
import { getTextDirection } from "$lib/paraglide/runtime";
import { paraglideMiddleware } from "$lib/paraglide/server";
import { isMfaSetupRequired, MFA_SETUP_PATH } from "$lib/mfa-setup";
import { clientAddress, stampApiHeaders } from "$lib/server/api-proxy";
import {
	clearSessionCookie,
	migrateLegacySessionCookie,
	SESSION_COOKIE,
} from "$lib/server/session-cookie";

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
};

const handleSecurityHeaders: Handle = async ({ event, resolve }) => {
	const response = await resolve(event);
	// The proxied chat socket handshake; headers are meaningless there.
	if (response.status === 101) return response;
	for (const [key, value] of Object.entries(SECURITY_HEADERS)) {
		response.headers.set(key, value);
	}
	// Pages carry the full kit.csp policy (vite.config.ts); everything else
	// (endpoints, proxied API responses) at least refuses framing.
	if (!response.headers.has("Content-Security-Policy")) {
		response.headers.set("Content-Security-Policy", "frame-ancestors 'none'");
	}
	if (!dev) {
		response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
	}
	return response;
};

const handleBasicAuth: Handle = async ({ event, resolve }) => {
	const { BASIC_AUTH_USER, BASIC_AUTH_PASSWORD } = event.platform?.env ?? {};
	if (BASIC_AUTH_USER && !BASIC_AUTH_PASSWORD) {
		// Fail closed: a missing password secret must not publish staging.
		console.error("BASIC_AUTH_USER is set without BASIC_AUTH_PASSWORD; refusing requests");
		return new Response("Service Unavailable", { status: 503 });
	}
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

// Avatars are capped at 2 MB (lib/server/avatar.ts); leave room for the other fields.
const MAX_BODY_BYTES = 3 * 1024 * 1024;

function capBody(body: ReadableStream<Uint8Array>, max: number) {
	let seen = 0;
	return body.pipeThrough(
		new TransformStream<Uint8Array, Uint8Array>({
			transform(chunk, controller) {
				seen += chunk.byteLength;
				if (seen > max) controller.error(new Error("request body too large"));
				else controller.enqueue(chunk);
			},
		}),
	);
}

/**
 * Form actions buffer the whole body (request.formData()) before any field
 * check. Refuse oversized bodies up front. Bodies without Content-Length
 * (chunked; browsers always send a length for forms) are capped while
 * streaming, so the action fails instead of buffering more than the cap.
 * /api bodies stream through the proxy; the API enforces its own limits.
 */
const handleBodySize: Handle = async ({ event, resolve }) => {
	const { request } = event;
	if (request.method === "GET" || request.method === "HEAD" || !request.body) {
		return resolve(event);
	}
	const length = request.headers.get("content-length");
	if (length !== null) {
		if (Number(length) > MAX_BODY_BYTES) {
			return new Response("Payload Too Large", { status: 413 });
		}
		return resolve(event);
	}
	const path = event.url.pathname;
	if (path !== "/api" && !path.startsWith("/api/")) {
		event.request = new Request(request, {
			body: capBody(request.body, MAX_BODY_BYTES),
			duplex: "half",
		} as RequestInit);
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

/** Validate the session cookie against the API and expose the user via locals. */
const handleSession: Handle = async ({ event, resolve }) => {
	event.locals.user = null;

	// Proxy hops do not read locals.user; the API re-checks the cookie.
	// This early return also keeps the /api/sessions/me call below from recursing.
	const path = event.url.pathname;
	if (path === "/api" || path.startsWith("/api/")) {
		return resolve(event);
	}

	migrateLegacySessionCookie(event.cookies);
	const sessionToken = event.cookies.get(SESSION_COOKIE);
	if (sessionToken) {
		try {
			// Relative, through the /api proxy: SvelteKit forwards the cookies and
			// the staging basic-auth header, and the proxy stamps the client IP.
			const response = await event.fetch("/api/sessions/me");
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

function apiOrigin(): string | null {
	try {
		return env.PUBLIC_API_URL ? new URL(env.PUBLIC_API_URL).origin : null;
	} catch {
		return null;
	}
}

/**
 * Every server-side call straight to the API (the /api proxy's own hop
 * included) carries the browser IP and the shared PROXY_SECRET. Relative
 * fetch("/api/…") calls run through the proxy, which reads the IP from
 * getClientAddress(); internal requests inherit the page request's.
 */
export const handleFetch: HandleFetch = async ({ event, request, fetch }) => {
	if (new URL(request.url).origin === apiOrigin()) {
		const headers = new Headers(request.headers);
		stampApiHeaders(headers, clientAddress(event.getClientAddress));
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
	handleBodySize,
	handleParaglide,
	handleSession,
);
