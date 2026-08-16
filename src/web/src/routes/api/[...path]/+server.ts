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
 */
const proxy: RequestHandler = async ({ params, request, fetch }) => {
	const base = env.PUBLIC_API_URL;
	if (!base) {
		return new Response("PUBLIC_API_URL is not configured", { status: 500 });
	}

	const url = new URL(request.url);
	const target = `${base}/api/${params.path ?? ""}${url.search}`;

	const headers = new Headers();
	for (const [key, value] of request.headers) {
		if (!HOP_BY_HOP.has(key.toLowerCase())) {
			headers.set(key, value);
		}
	}

	const response = await fetch(target, {
		method: request.method,
		headers,
		body: request.method === "GET" || request.method === "HEAD" ? undefined : request.body,
		// @ts-expect-error -- required by undici for streaming request bodies
		duplex: "half",
	});

	const responseHeaders = new Headers();
	for (const [key, value] of response.headers) {
		if (!HOP_BY_HOP.has(key.toLowerCase())) {
			responseHeaders.set(key, value);
		}
	}

	return new Response(response.body, {
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
