import type { Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { fail } from "@sveltejs/kit";
import { isTurnstileRejection, TURNSTILE_FIELD } from "$lib/turnstile";

export const load: PageServerLoad = async ({ url }) => {
	return { email: url.searchParams.get("email") ?? "" };
};

export const actions: Actions = {
	default: async ({ request, fetch }) => {
		const data = await request.formData();
		const email = String(data.get("email") ?? "")
			.trim()
			.toLowerCase();

		if (!email) {
			return fail(400, { forgotError: true, email });
		}

		const response = await fetch("/api/users/reset", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, turnstileToken: String(data.get(TURNSTILE_FIELD) ?? "") }),
		});

		if (await isTurnstileRejection(response)) {
			return fail(403, { forgotError: "captcha" as const, email });
		}
		if (!response.ok && response.status !== 200) {
			// the API is intentionally silent about unknown emails; only surface real failures
			if (response.status >= 500) {
				return fail(502, { forgotError: true, email });
			}
		}

		return { forgotSuccess: true, email };
	},
};
