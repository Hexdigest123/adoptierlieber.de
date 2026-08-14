import type { Handle } from '@sveltejs/kit';
import { getTextDirection } from '$lib/paraglide/runtime';
import { paraglideMiddleware } from '$lib/paraglide/server';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		event.request = request;

		return resolve(event, {
			transformPageChunk: ({ html }) =>
				html
					.replace('%paraglide.lang%', locale)
					.replace('%paraglide.dir%', getTextDirection(locale))
		});
	});

export const handle: Handle = async ({ event, resolve }) => {
	const { BASIC_AUTH_USER, BASIC_AUTH_PASSWORD } = event.platform?.env ?? {};
	if (BASIC_AUTH_USER && BASIC_AUTH_PASSWORD) {
		const expected = 'Basic ' + btoa(`${BASIC_AUTH_USER}:${BASIC_AUTH_PASSWORD}`);
		if (event.request.headers.get('authorization') !== expected) {
			return new Response('Unauthorized', {
				status: 401,
				headers: { 'WWW-Authenticate': 'Basic realm="staging"' }
			});
		}
	}
	return handleParaglide({ event, resolve });
};
