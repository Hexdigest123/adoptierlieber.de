import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { setCurrentShelterCookie } from "$lib/server/shelter-cookie";

export const load: PageServerLoad = async ({ url, locals }) => {
	const token = url.searchParams.get("token") ?? "";
	if (!locals.user) {
		redirect(303, `/login?next=${encodeURIComponent(`/shelter/invite?token=${token}`)}`);
	}
	return { token };
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
		if (!response.ok) {
			return fail(400, { error: true });
		}
		const body = (await response.json()) as { shelter_id: string };
		setCurrentShelterCookie(cookies, body.shelter_id);
		redirect(303, "/shelter");
	},
};
