import { env } from "$env/dynamic/public";
import type { RequestHandler } from "./$types";

const HOP_BY_HOP = new Set([
	"connection",
	"keep-alive",
	"proxy-authenticate",
	"proxy-authorization",
	"te",
	"trailer",
	"transfer-encoding",
	"upgrade",
	"host",
	"content-length",
	"accept-encoding",
]);

/**
 * Proxy all /api/* requests to the backend so the frontend stays same-origin
 * (no CORS in production) and httpOnly cookies keep working.
 *
 * Forwards the browser IP so the API KV limiter keys on the client, not this
 * worker. Drops inbound X-Forwarded-For so browsers cannot pick their own key.
 */
const proxy: RequestHandler = async ({ params, request, fetch, getClientAddress }) => {
	const path = params.path ?? "";

	const base = env.PUBLIC_API_URL;
	if (!base) {
		return new Response("PUBLIC_API_URL is not configured", { status: 500 });
	}

	const url = new URL(request.url);
	const target = `${base}/api/${path}${url.search}`;
	const ip = request.headers.get("cf-connecting-ip") ?? getClientAddress();

	const upgrade = request.headers.get("upgrade")?.toLowerCase() === "websocket";
	const headers = new Headers();
	for (const [key, value] of request.headers) {
		const name = key.toLowerCase();
		if (name === "x-forwarded-for") continue;
		if (
			upgrade &&
			(name === "upgrade" || name === "connection" || name.startsWith("sec-websocket"))
		) {
			headers.set(key, value);
			continue;
		}
		if (!HOP_BY_HOP.has(name)) {
			headers.set(key, value);
		}
	}
	headers.set("x-forwarded-for", ip);

	const response = await fetch(target, {
		method: request.method,
		headers,
		body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
		// @ts-expect-error -- required by undici for streaming request bodies
		duplex: "half",
	});

	if (upgrade && (response.status === 101 || "webSocket" in response)) {
		return response;
	}

	const responseHeaders = new Headers();
	for (const [key, value] of response.headers) {
		const name = key.toLowerCase();
		// fetch already decoded the body; forwarding content-encoding breaks the browser.
		if (!HOP_BY_HOP.has(name) && name !== "content-encoding") {
			responseHeaders.set(key, value);
		}
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
