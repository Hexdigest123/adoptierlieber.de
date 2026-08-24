import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { loginHomePath } from "$lib/server/login-home";

export const load: PageServerLoad = async ({ locals, cookies }) => {
	if (!locals.user) {
		redirect(303, "/login");
	}
	if (locals.user.session_kind !== "setup") {
		redirect(303, loginHomePath(locals.user, cookies));
	}
	return { email: locals.user.email };
};

export const actions: Actions = {
	startTotp: async ({ fetch, locals }) => {
		if (!locals.user) redirect(303, "/login");
		const response = await fetch("/api/totp", { method: "POST" });
		if (!response.ok) {
			return fail(response.status === 429 ? 429 : 502, { totpStartError: true });
		}
		const body = (await response.json()) as { otpauth_uri: string; secret: string };
		return { totpUri: body.otpauth_uri, totpSecret: body.secret };
	},

	confirmTotp: async ({ request, fetch, locals, cookies }) => {
		if (!locals.user) redirect(303, "/login");
		const data = await request.formData();
		const code = String(data.get("code") ?? "").trim();
		const response = await fetch("/api/totp/confirmation", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ code }),
		});
		if (!response.ok) {
			return fail(response.status === 429 ? 429 : 400, {
				totpConfirmError: true,
				totpUri: String(data.get("totpUri") ?? ""),
				totpSecret: String(data.get("totpSecret") ?? ""),
			});
		}
		redirect(303, loginHomePath(locals.user, cookies));
	},

	passkey: async ({ request, fetch, locals, cookies }) => {
		if (!locals.user) redirect(303, "/login");
		const data = await request.formData();
		const name = String(data.get("name") ?? "").trim();
		const attestation = String(data.get("attestation") ?? "");
		let parsed: Record<string, unknown>;
		try {
			parsed = JSON.parse(attestation) as Record<string, unknown>;
		} catch {
			return fail(400, { passkeyError: true });
		}
		const response = await fetch("/api/passkeys/registrations", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name: name || "Passkey", response: parsed }),
		});
		if (!response.ok) {
			return fail(response.status === 429 ? 429 : 400, { passkeyError: true });
		}
		redirect(303, loginHomePath(locals.user, cookies));
	},
};
