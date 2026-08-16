import { redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async () => {
	redirect(303, "/");
};

export const actions: Actions = {
	default: async ({ cookies, fetch }) => {
		const sessionToken = cookies.get("sessionToken");
		if (sessionToken) {
			// best-effort: invalidate the session server-side, then drop the cookie either way
			await fetch("/api/users/logout", {
				headers: { cookie: `sessionToken=${sessionToken}` },
			}).catch(() => {});
			cookies.delete("sessionToken", { path: "/" });
		}
		// actions invalidate all loaded data, so the header drops the user state
		redirect(303, "/");
	},
};
