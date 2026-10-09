import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { setCurrentShelterCookie } from "$lib/server/shelter-cookie";

// The invite token comes from the URL fragment; the page previews it in the browser.
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
