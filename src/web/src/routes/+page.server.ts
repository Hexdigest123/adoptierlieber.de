import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions: Actions = {
	contact: async ({ request, fetch }) => {
		const data = await request.formData();
		const name = String(data.get("name") ?? "").trim();
		const email = String(data.get("email") ?? "").trim();
		const message = String(data.get("message") ?? "").trim();
		const website = String(data.get("website") ?? "").trim();
		const privacy = data.get("privacy") === "on";

		const values = { name, email, message };

		// privacy consent is mandatory (DSGVO); honeypot is forwarded as-is (API drops bots)
		if (!name || !email || !message || !privacy) {
			return fail(400, { contactError: true, contactValues: values });
		}

		const response = await fetch("/api/contact", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name, email, message, website }),
		});

		if (!response.ok) {
			return fail(response.status === 429 ? 429 : 502, {
				contactError: true,
				contactValues: values,
			});
		}

		return { contactSuccess: true };
	},
};
