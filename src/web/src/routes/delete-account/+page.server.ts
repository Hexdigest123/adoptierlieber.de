import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { clearSessionCookie } from "$lib/server/session-cookie";

export const load: PageServerLoad = async ({ locals, url }) => {
	const token = url.searchParams.get("token")?.trim() ?? "";
	return {
		loggedIn: Boolean(locals.user),
		token,
	};
};

export const actions: Actions = {
	default: async ({ request, fetch, locals, cookies }) => {
		if (!locals.user) {
			const data = await request.formData();
			const token = String(data.get("deletionToken") ?? "").trim();
			const next = token ? `/delete-account?token=${encodeURIComponent(token)}` : "/delete-account";
			redirect(303, `/login?next=${encodeURIComponent(next)}`);
		}

		const data = await request.formData();
		const deletionToken = String(data.get("deletionToken") ?? "").trim();

		if (!deletionToken) {
			return fail(400, { deleteError: "missing" as const, token: "" });
		}

		const response = await fetch("/api/users/delete", {
			method: "DELETE",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ deletionToken }),
		});

		if (!response.ok) {
			if (response.status === 429) {
				return fail(429, { deleteError: "rate_limited" as const, token: deletionToken });
			}
			if (response.status === 400 || response.status === 401) {
				return fail(400, { deleteError: "token" as const, token: deletionToken });
			}
			return fail(502, { deleteError: "invalid" as const, token: deletionToken });
		}

		clearSessionCookie(cookies);
		redirect(303, "/");
	},
};
