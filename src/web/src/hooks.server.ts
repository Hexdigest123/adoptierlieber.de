import { sequence } from "@sveltejs/kit/hooks";
import type { Handle } from "@sveltejs/kit";
import { env } from "$env/dynamic/public";
import { getTextDirection } from "$lib/paraglide/runtime";
import { paraglideMiddleware } from "$lib/paraglide/server";

const handleBasicAuth: Handle = async ({ event, resolve }) => {
	const { BASIC_AUTH_USER, BASIC_AUTH_PASSWORD } = event.platform?.env ?? {};
	if (BASIC_AUTH_USER && BASIC_AUTH_PASSWORD) {
		const expected = "Basic " + btoa(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`);
		if (event.request.headers.get("authorization") !== expected) {
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

	const sessionToken = event.cookies.get("sessionToken");
	const apiUrl = env.PUBLIC_API_URL;
	if (sessionToken && apiUrl) {
		try {
			const response = await event.fetch(`${apiUrl}/api/sessions/me`, {
				headers: { cookie: `sessionToken=${sessionToken}` },
			});
			if (response.ok) {
				event.locals.user = await response.json();
			} else if (response.status === 401) {
				event.cookies.delete("sessionToken", { path: "/" });
			}
		} catch {
			// API unreachable — treat as logged out
		}
	}

	return resolve(event);
};

export const handle = sequence(handleBasicAuth, handleParaglide, handleSession);
