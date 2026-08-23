import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { setSessionCookie } from "$lib/server/session-cookie";
import type { InvitePreview } from "$lib/admin/types";

export const load: PageServerLoad = async ({ url, fetch, locals }) => {
	const token = url.searchParams.get("token") ?? "";
	if (!token) {
		return { invite: null as InvitePreview | null, token: "" };
	}
	const response = await fetch(`/api/invites/${encodeURIComponent(token)}`);
	if (!response.ok) {
		return { invite: null as InvitePreview | null, token };
	}
	const invite = (await response.json()) as InvitePreview;
	return { invite, token };
};

export const actions: Actions = {
	accept: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const token = String(data.get("token") ?? "");
		if (!token) {
			return fail(400, { inviteError: "invalid" as const });
		}

		const payload: Record<string, string> = {};
		for (const key of ["name", "displayName", "password", "street", "zip", "city", "lat", "lng"]) {
			const value = String(data.get(key) ?? "").trim();
			if (value) payload[key] = value;
		}

		const response = await fetch(`/api/invites/${encodeURIComponent(token)}/acceptance`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (response.status === 401) {
			redirect(303, `/login?next=${encodeURIComponent(`/invite?token=${token}`)}`);
		}
		if (response.status === 409) {
			return fail(409, { inviteError: "wrong_email" as const, token });
		}
		if (!response.ok) {
			if (response.status === 404) {
				return fail(404, { inviteError: "invalid" as const, token });
			}
			return fail(response.status === 400 ? 400 : 502, { inviteError: "generic" as const, token });
		}

		if (response.status === 201) {
			const session = (await response.json()) as { sessionToken: string; expiresAt: string };
			setSessionCookie(cookies, session.sessionToken, new Date(session.expiresAt));
		}

		redirect(303, "/admin");
	},
};
