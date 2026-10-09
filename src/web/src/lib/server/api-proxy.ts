import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";

/** Proves to the API that X-Forwarded-For came from this worker (API rate-limit.ts). */
export const PROXY_SECRET_HEADER = "x-proxy-secret";

let warnedNoSecret = false;

/** Browser IP of the top-level request; internal event.fetch calls inherit it. */
export function clientAddress(getClientAddress: () => string): string | null {
	try {
		return getClientAddress() || null;
	} catch {
		return null;
	}
}

/**
 * Stamp the client IP and the shared PROXY_SECRET (worker secret in
 * production, repo-root .env in dev) on a request bound for the API.
 */
export function stampApiHeaders(headers: Headers, ip: string | null) {
	const secret = env.PROXY_SECRET;
	headers.delete(PROXY_SECRET_HEADER);
	headers.delete("x-forwarded-for");
	if (ip) headers.set("x-forwarded-for", ip);
	if (secret) {
		headers.set(PROXY_SECRET_HEADER, secret);
	} else if (!dev && !warnedNoSecret) {
		warnedNoSecret = true;
		console.warn(
			"PROXY_SECRET is not set; the API cannot tell proxied client IPs from spoofed ones",
		);
	}
}
