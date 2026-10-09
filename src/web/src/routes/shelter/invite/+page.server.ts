import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { setCurrentShelterCookie } from "$lib/server/shelter-cookie";

type ShelterInvitePreview = {
	org_name: string;
	role: number;
	email_matches: boolean;
};

export const load: PageServerLoad = async ({ url, locals, fetch }) => {
	const token = url.searchParams.get("token") ?? "";
	if (!locals.user) {
		redirect(303, `/login?next=${encodeURIComponent(`/shelter/invite?token=${token}`)}`);
	}
	if (!token) {
		return { token, invite: null as ShelterInvitePreview | null };
	}
	// Show who is inviting before anything happens: joining needs an explicit accept.
	const response = await fetch("/api/shelters/invites/preview", {
		method: "POST",
		headers: { "content-type": "application/json" },
		body: JSON.stringify({ token }),
	});
	const invite = response.ok ? ((await response.json()) as ShelterInvitePreview) : null;
	return { token, invite };
};

export const actions: Actions = {
	default: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const token = String(data.get("token") ?? "");
		const response = await fetch("/api/shelters/invites/accept", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ token }),
		});
		if (response.status === 403) {
			return fail(403, { wrongEmail: true });
		}
		if (!response.ok) {
			return fail(400, { error: true });
		}
		const body = (await response.json()) as { shelter_id: string };
		setCurrentShelterCookie(cookies, body.shelter_id);
		redirect(303, "/shelter");
	},
};
