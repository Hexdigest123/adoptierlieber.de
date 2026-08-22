import { fail } from "@sveltejs/kit";
import type { Actions } from "./$types";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function readApiError(
	response: Response,
): Promise<"email_taken" | "rate_limited" | "invalid" | "generic"> {
	if (response.status === 409) return "email_taken";
	if (response.status === 429) return "rate_limited";
	if (response.status === 400) return "invalid";
	try {
		const body = (await response.json()) as { error?: string };
		if (body.error === "email already registered") return "email_taken";
	} catch {
		// ignore parse errors
	}
	return "generic";
}

export const actions: Actions = {
	default: async ({ request, fetch }) => {
		const data = await request.formData();
		const accountType = data.get("accountType") === "shelter" ? "shelter" : "adopter";

		const name = String(data.get("name") ?? "").trim();
		const email = String(data.get("email") ?? "")
			.trim()
			.toLowerCase();
		const password = String(data.get("password") ?? "");

		const values = {
			accountType,
			name,
			email,
			orgName: String(data.get("orgName") ?? "").trim(),
			street: String(data.get("street") ?? "").trim(),
			zip: String(data.get("zip") ?? "").trim(),
			city: String(data.get("city") ?? "").trim(),
			website: String(data.get("website") ?? "").trim(),
			registrationNumber: String(data.get("registrationNumber") ?? "").trim(),
			description: String(data.get("description") ?? "").trim(),
		};

		// client-equivalent server validation so the flow works without JS
		if (
			!name ||
			!EMAIL_RE.test(email) ||
			password.length < 8 ||
			password.length > 128 ||
			!/[A-Za-z]/.test(password) ||
			!/\d/.test(password)
		) {
			return fail(400, { registerError: "invalid" as const, values });
		}
		if (
			accountType === "shelter" &&
			(!values.orgName || !values.street || !values.zip || !values.city)
		) {
			return fail(400, { registerError: "invalid" as const, values });
		}

		const endpoint = accountType === "shelter" ? "/api/shelters" : "/api/users";
		const payload =
			accountType === "shelter"
				? {
						name,
						email,
						password,
						orgName: values.orgName,
						street: values.street,
						zip: values.zip,
						city: values.city,
						...(values.website ? { website: values.website } : {}),
						...(values.registrationNumber ? { registrationNumber: values.registrationNumber } : {}),
						...(values.description ? { description: values.description } : {}),
					}
				: { name, email, password };

		const response = await fetch(endpoint, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload),
		});

		if (!response.ok) {
			return fail(response.status === 429 ? 429 : 400, {
				registerError: await readApiError(response),
				values,
			});
		}

		return { registerSuccess: true, accountType, email };
	},
};
