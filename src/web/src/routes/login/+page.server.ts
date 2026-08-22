import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { setSessionCookie } from "$lib/server/session-cookie";

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) {
		redirect(303, "/");
	}
};

export const actions: Actions = {
	default: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const email = String(data.get("email") ?? "")
			.trim()
			.toLowerCase();
		const password = String(data.get("password") ?? "");

		const response = await fetch("/api/users/auth", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, password }),
		});

		if (!response.ok) {
			const status = response.status === 429 ? 429 : 401;
			return fail(status, {
				loginError: response.status === 429 ? ("rate_limited" as const) : ("credentials" as const),
				email,
			});
		}

		const session = (await response.json()) as { sessionToken: string; expiresAt: string };
		setSessionCookie(cookies, session.sessionToken, new Date(session.expiresAt));

		redirect(303, "/");
	},
};
