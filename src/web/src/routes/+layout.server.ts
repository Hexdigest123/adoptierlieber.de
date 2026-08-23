import type { LayoutServerLoad } from "./$types";
import { resolveChrome } from "$lib/server/chrome";

export const load: LayoutServerLoad = async ({ locals, cookies, request, url }) => {
	const chrome = resolveChrome({
		cookies,
		origin: url.origin,
		pathname: url.pathname,
		referer: request.headers.get("referer"),
	});
	return { user: locals.user, chrome };
};
