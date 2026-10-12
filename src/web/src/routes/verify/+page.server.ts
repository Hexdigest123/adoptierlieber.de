import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { safeNextPath } from "$lib/server/safe-next";

export const load: PageServerLoad = async ({ url }) => {
	return {
		email: url.searchParams.get("email") ?? "",
		verifySuccess: url.searchParams.get("ok") === "1",
		next: safeNextPath(url.searchParams.get("next")) ?? "",
	};
};

export const actions: Actions = {
	default: async ({ request, fetch, url }) => {
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

		const next = safeNextPath(url.searchParams.get("next"));
		redirect(303, next ? `/verify?ok=1&next=${encodeURIComponent(next)}` : "/verify?ok=1");
	},
};
