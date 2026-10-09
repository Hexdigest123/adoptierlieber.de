import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { setSessionCookie } from "$lib/server/session-cookie";

// The invite token comes from the URL fragment; the page previews it in the browser.
export const actions: Actions = {
	accept: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const token = String(data.get("token") ?? "");
		if (!token) {
			return fail(400, { inviteError: "invalid" as const });
		}

		const payload: Record<string, string> = { token };
		for (const key of ["name", "displayName", "password", "street", "zip", "city", "lat", "lng"]) {
			const value = String(data.get(key) ?? "").trim();
			if (value) payload[key] = value;
		}

		const response = await fetch("/api/invites/acceptance", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (response.status === 401) {
			redirect(303, `/login?next=${encodeURIComponent("/invite")}`);
		}
		if (response.status === 409) {
			return fail(409, { inviteError: "wrong_email" as const });
		}
		if (!response.ok) {
			if (response.status === 404) {
				return fail(404, { inviteError: "invalid" as const });
			}
			return fail(response.status === 400 ? 400 : 502, { inviteError: "generic" as const });
		}

		if (response.status === 201) {
			const session = (await response.json()) as {
				sessionToken: string;
				expiresAt: string;
				setup_required?: boolean;
			};
			setSessionCookie(cookies, session.sessionToken, new Date(session.expiresAt));
			if (session.setup_required) {
				redirect(303, "/mfa/setup");
			}
		}

		redirect(303, "/admin");
	},
};
