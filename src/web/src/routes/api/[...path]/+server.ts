import { env } from "$env/dynamic/public";
import { clientAddress, stampApiHeaders } from "$lib/server/api-proxy";
import type { RequestHandler } from "./$types";

/**
 * Request headers the API needs. An allowlist, so client-sent X-Forwarded-For,
 * CF-Connecting-IP or the proxy secret never reach the API as if we set them.
 */
const FORWARD_HEADERS = [
	"accept",
	"accept-language",
	"authorization", // staging basic auth
	"content-type",
	"cookie",
	"if-none-match",
	"user-agent",
];
const WEBSOCKET_HEADERS = [
	"connection",
	"upgrade",
	"sec-websocket-extensions",
	"sec-websocket-key",
	"sec-websocket-protocol",
	"sec-websocket-version",
];

const HOP_BY_HOP = new Set([
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
	"content-length",
	// fetch already decoded the body; forwarding content-encoding breaks the browser.
	"content-encoding",
]);

/**
 * Cookies are SameSite=Lax, but sibling subdomains count as same-site. State
 * changes and socket upgrades must come from this origin. Server-side
 * event.fetch from form actions sends this origin or no Origin at all.
 */
function crossOrigin(request: Request, origin: string, upgrade: boolean): boolean {
	if (!upgrade && (request.method === "GET" || request.method === "HEAD")) return false;
	const sent = request.headers.get("origin");
	if (sent && sent !== origin) return true;
	const site = request.headers.get("sec-fetch-site");
	return site !== null && site !== "same-origin";
}

/**
 * Proxy all /api/* requests to the backend so the frontend stays same-origin
 * (no CORS in production) and httpOnly cookies keep working.
 *
 * Forwards the browser IP plus the shared PROXY_SECRET so the API KV limiter
 * keys on the client, not this worker, and can tell our hop from a spoofed one.
 */
const proxy: RequestHandler = async ({ request, fetch, getClientAddress }) => {
	const base = env.PUBLIC_API_URL;
	if (!base) {
		return new Response("PUBLIC_API_URL is not configured", { status: 500 });
	}

	const url = new URL(request.url);
	const upgrade = request.headers.get("upgrade")?.toLowerCase() === "websocket";
	if (crossOrigin(request, url.origin, upgrade)) {
		return new Response("Forbidden", { status: 403 });
	}

	// The raw pathname keeps %2F etc. encoded. params.path is decoded, so
	// "/api/animals/..%2Fsessions%2Fme" would turn into "/api/sessions/me".
	const target = `${base}${url.pathname}${url.search}`;
	const headers = new Headers();
	for (const name of upgrade ? [...FORWARD_HEADERS, ...WEBSOCKET_HEADERS] : FORWARD_HEADERS) {
		const value = request.headers.get(name);
		if (value !== null) headers.set(name, value);
	}
	stampApiHeaders(headers, clientAddress(getClientAddress));

	const response = await fetch(target, {
		method: request.method,
		headers,
		body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
		// @ts-expect-error -- required by undici for streaming request bodies
		duplex: "half",
	});

	// Workers fetch responses have immutable headers; hooks add security headers
	// afterwards. Re-wrap the 101 so the socket survives with mutable headers.
	const webSocket = (response as { webSocket?: WebSocket | null }).webSocket;
	if (upgrade && webSocket) {
		return new Response(null, { status: 101, webSocket } as ResponseInit);
	}

	const responseHeaders = new Headers();
	for (const [key, value] of response.headers) {
		if (!HOP_BY_HOP.has(key.toLowerCase())) {
			responseHeaders.set(key, value);
		}
	}
	// API JSON is per-user; never let a browser or the adapter's edge cache keep it.
	if (!responseHeaders.has("cache-control")) {
		responseHeaders.set("cache-control", "private, no-store");
	}

	// Buffer so SvelteKit can clone the response for the load cache.
	// A streamed body is one-shot and throws "Body has already been read".
	return new Response(await response.arrayBuffer(), {
		status: response.status,
		statusText: response.statusText,
		headers: responseHeaders,
	});
};

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
