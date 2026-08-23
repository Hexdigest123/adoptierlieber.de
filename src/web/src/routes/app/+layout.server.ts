import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { setLastHomeCookie } from "$lib/server/session-cookie";

export const load: LayoutServerLoad = async ({ locals, url, cookies }) => {
	if (!locals.user) {
		redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	}
	setLastHomeCookie(cookies, "/app");
	return { user: locals.user };
};
