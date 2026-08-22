import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
	return {
		email: url.searchParams.get("email") ?? "",
	};
};

export const actions: Actions = {
	default: async ({ request, fetch }) => {
		const data = await request.formData();
		const email = String(data.get("email") ?? "")
			.trim()
			.toLowerCase();
		const token = String(data.get("token") ?? "").trim();

		if (!email || !token) {
			return fail(400, { verifyError: true, email });
		}

		const response = await fetch("/api/users/verify", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, token }),
		});

		if (!response.ok) {
			return fail(response.status === 429 ? 429 : 400, { verifyError: true, email });
		}

		return { verifySuccess: true };
	},
};
