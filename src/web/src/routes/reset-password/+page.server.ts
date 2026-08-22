import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ url }) => {
	return { email: url.searchParams.get("email") ?? "" };
};

export const actions: Actions = {
	default: async ({ request, fetch }) => {
		const data = await request.formData();
		const email = String(data.get("email") ?? "")
			.trim()
			.toLowerCase();
		const resetToken = String(data.get("resetToken") ?? "").trim();
		const newPassword = String(data.get("newPassword") ?? "");

		if (
			!email ||
			!resetToken ||
			newPassword.length < 8 ||
			newPassword.length > 128 ||
			!/[A-Za-z]/.test(newPassword) ||
			!/\d/.test(newPassword)
		) {
			return fail(400, { resetError: true, email });
		}

		const response = await fetch("/api/users/reset", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, resetToken, newPassword }),
		});

		if (!response.ok) {
			return fail(response.status === 429 ? 429 : 400, { resetError: true, email });
		}

		return { resetSuccess: true };
	},
};
