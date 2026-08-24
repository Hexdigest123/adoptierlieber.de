import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { setSessionCookie } from "$lib/server/session-cookie";
import { safeNextPath } from "$lib/server/safe-next";
import { loginHomePath } from "$lib/server/login-home";
import type { SessionUser } from "$lib/types/session";

type AuthBody = {
	sessionToken?: string;
	expiresAt?: string;
	setup_required?: boolean;
	mfa_required?: boolean;
	mfa_token?: string;
};

export const load: PageServerLoad = async ({ locals, url, cookies }) => {
	const next = safeNextPath(url.searchParams.get("next"));
	if (locals.user?.session_kind === "setup") {
		redirect(303, "/mfa/setup");
	}
	if (locals.user) {
		redirect(303, next ?? loginHomePath(locals.user, cookies));
	}
	return { next: next ?? "" };
};

export const actions: Actions = {
	password: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const email = String(data.get("email") ?? "")
			.trim()
			.toLowerCase();
		const password = String(data.get("password") ?? "");
		const next = safeNextPath(String(data.get("next") ?? ""));

		const response = await fetch("/api/users/auth", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, password }),
		});

		if (!response.ok) {
			const status = response.status === 429 ? 429 : 401;
			return fail(status, {
				loginError: response.status === 429 ? ("rate_limited" as const) : ("credentials" as const),
				email,
				next: next ?? "",
			});
		}

		const body = (await response.json()) as AuthBody;
		if (body.mfa_required && body.mfa_token) {
			return {
				mfaRequired: true as const,
				mfaToken: body.mfa_token,
				email,
				next: next ?? "",
			};
		}

		if (body.sessionToken && body.expiresAt) {
			setSessionCookie(cookies, body.sessionToken, new Date(body.expiresAt));
			if (body.setup_required) redirect(303, "/mfa/setup");
			if (next) redirect(303, next);
			const me = await fetch("/api/sessions/me");
			if (me.ok) {
				const user = (await me.json()) as SessionUser;
				if (user.session_kind === "setup") redirect(303, "/mfa/setup");
				redirect(303, loginHomePath(user, cookies));
			}
			redirect(303, "/app");
		}

		return fail(401, { loginError: "credentials" as const, email, next: next ?? "" });
	},

	totp: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const code = String(data.get("code") ?? "").trim();
		const mfaToken = String(data.get("mfaToken") ?? "");
		const email = String(data.get("email") ?? "");
		const next = safeNextPath(String(data.get("next") ?? ""));

		const response = await fetch("/api/auth/totp", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ mfa_token: mfaToken, code }),
		});

		if (!response.ok) {
			const status = response.status === 429 ? 429 : 401;
			return fail(status, {
				mfaRequired: true as const,
				mfaToken,
				email,
				next: next ?? "",
				totpError: response.status === 429 ? ("rate_limited" as const) : ("invalid" as const),
			});
		}

		const session = (await response.json()) as AuthBody;
		if (!session.sessionToken || !session.expiresAt) {
			return fail(401, {
				mfaRequired: true as const,
				mfaToken,
				email,
				next: next ?? "",
				totpError: "invalid" as const,
			});
		}
		setSessionCookie(cookies, session.sessionToken, new Date(session.expiresAt));
		if (next) redirect(303, next);
		const me = await fetch("/api/sessions/me");
		if (me.ok) {
			redirect(303, loginHomePath((await me.json()) as SessionUser, cookies));
		}
		redirect(303, "/app");
	},

	passkey: async ({ request, fetch, cookies }) => {
		const data = await request.formData();
		const next = safeNextPath(String(data.get("next") ?? ""));
		const challengeId = String(data.get("challengeId") ?? "");
		const assertion = String(data.get("assertion") ?? "");
		let parsed: Record<string, unknown>;
		try {
			parsed = JSON.parse(assertion) as Record<string, unknown>;
		} catch {
			return fail(400, { passkeyError: true, next: next ?? "" });
		}

		const response = await fetch("/api/passkeys/assertions", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ challenge_id: challengeId, response: parsed }),
		});
		if (!response.ok) {
			return fail(response.status === 429 ? 429 : 401, {
				passkeyError: true,
				next: next ?? "",
			});
		}
		const session = (await response.json()) as AuthBody;
		if (!session.sessionToken || !session.expiresAt) {
			return fail(401, { passkeyError: true, next: next ?? "" });
		}
		setSessionCookie(cookies, session.sessionToken, new Date(session.expiresAt));
		if (next) redirect(303, next);
		const me = await fetch("/api/sessions/me");
		if (me.ok) {
			redirect(303, loginHomePath((await me.json()) as SessionUser, cookies));
		}
		redirect(303, "/app");
	},
};
