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
		const resetToken = String(data.get("resetToken") ?? "").trim();
		const newPassword = String(data.get("newPassword") ?? "");

		if (!email || !resetToken) {
			return fail(400, { resetError: "invalid" as const, email });
		}
		if (
			newPassword.length < 8 ||
			newPassword.length > 128 ||
			!/[A-Za-z]/.test(newPassword) ||
			!/\d/.test(newPassword)
		) {
			return fail(400, { resetError: "password" as const, email });
		}

		const response = await fetch("/api/users/reset", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, resetToken, newPassword }),
		});

		if (!response.ok) {
			if (response.status === 429) return fail(429, { resetError: "rate_limited" as const, email });
			if (response.status >= 500) return fail(400, { resetError: "generic" as const, email });
			const body = (await response.json().catch(() => null)) as { error?: string } | null;
			const error = body?.error;
			return fail(400, {
				resetError: error === "invalid reset token" ? ("link" as const) : ("invalid" as const),
				email,
			});
		}

		return { resetSuccess: true };
	},
};
