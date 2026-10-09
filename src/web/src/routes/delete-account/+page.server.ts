import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { clearSessionCookie } from "$lib/server/session-cookie";

export const load: PageServerLoad = async ({ locals }) => {
	return {
		loggedIn: Boolean(locals.user),
	};
};

export const actions: Actions = {
	default: async ({ request, fetch, locals, cookies }) => {
		if (!locals.user) {
			redirect(303, `/login?next=${encodeURIComponent("/delete-account")}`);
		}

		const data = await request.formData();
		const deletionToken = String(data.get("deletionToken") ?? "").trim();

		if (!deletionToken) {
			return fail(400, { deleteError: "missing" as const });
		}

		const response = await fetch("/api/users/delete", {
			method: "DELETE",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ deletionToken }),
		});

		if (!response.ok) {
			if (response.status === 429) {
				return fail(429, { deleteError: "rate_limited" as const });
			}
			if (response.status === 400 || response.status === 401) {
				return fail(400, { deleteError: "token" as const });
			}
			return fail(502, { deleteError: "invalid" as const });
		}

		clearSessionCookie(cookies);
		redirect(303, "/");
	},
};
