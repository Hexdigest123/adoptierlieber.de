import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { clearSessionCookie, SESSION_COOKIE } from "$lib/server/session-cookie";

export const load: PageServerLoad = async () => {
	redirect(303, "/");
};

export const actions: Actions = {
	default: async ({ cookies, fetch }) => {
		const sessionToken = cookies.get(SESSION_COOKIE);
		if (sessionToken) {
			// best-effort: invalidate the session server-side, then drop the cookie either way
			await fetch("/api/users/logout", {
				method: "POST",
				headers: { cookie: `${SESSION_COOKIE}=${sessionToken}` },
			}).catch(() => {});
			clearSessionCookie(cookies);
		}
		// actions invalidate all loaded data, so the header drops the user state
		redirect(303, "/");
	},
};
