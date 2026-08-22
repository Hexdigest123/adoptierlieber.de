import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { checkAvatarFile } from "$lib/server/avatar";

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user) {
		redirect(303, "/login");
	}
	return { user: locals.user };
};

export const actions: Actions = {
	profile: async ({ request, fetch, locals }) => {
		if (!locals.user) {
			redirect(303, "/login");
		}

		const data = await request.formData();
		const name = String(data.get("name") ?? "").trim();
		const displayName = String(data.get("displayName") ?? "").trim();

		if (!name) {
			return fail(400, { profileError: true, name, displayName });
		}

		const response = await fetch("/api/users/me", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name, displayName: displayName || null }),
		});

		if (!response.ok) {
			return fail(response.status === 400 ? 400 : 502, { profileError: true, name, displayName });
		}

		return { profileSuccess: true };
	},

	avatar: async ({ request, fetch, locals }) => {
		if (!locals.user) {
			redirect(303, "/login");
		}

		const data = await request.formData();
		const file = data.get("avatar");
		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { avatarError: true });
		}

		const check = await checkAvatarFile(file);
		if (!check.ok) {
			return fail(400, { avatarError: true });
		}

		const body = new FormData();
		body.set("avatar", file);

		const response = await fetch("/api/users/me/avatar", {
			method: "PUT",
			body,
		});

		if (!response.ok) {
			return fail(response.status === 400 ? 400 : 502, { avatarError: true });
		}

		return { avatarSuccess: true };
	},

	removeAvatar: async ({ fetch, locals }) => {
		if (!locals.user) {
			redirect(303, "/login");
		}

		const response = await fetch("/api/users/me/avatar", { method: "DELETE" });
		if (!response.ok && response.status !== 404) {
			return fail(502, { avatarError: true });
		}

		return { avatarRemoved: true };
	},

	password: async ({ request, fetch, locals }) => {
		if (!locals.user) {
			redirect(303, "/login");
		}

		const data = await request.formData();
		const currentPassword = String(data.get("currentPassword") ?? "");
		const newPassword = String(data.get("newPassword") ?? "");

		if (
			currentPassword.length < 8 ||
			currentPassword.length > 128 ||
			newPassword.length < 8 ||
			newPassword.length > 128 ||
			!/[A-Za-z]/.test(newPassword) ||
			!/\d/.test(newPassword)
		) {
			return fail(400, { passwordError: "invalid" as const });
		}

		const response = await fetch("/api/users/me/password", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				current_password: currentPassword,
				new_password: newPassword,
			}),
		});

		if (!response.ok) {
			if (response.status === 401) {
				return fail(401, { passwordError: "current" as const });
			}
			if (response.status === 429) {
				return fail(429, { passwordError: "rate_limited" as const });
			}
			return fail(response.status === 400 ? 400 : 502, { passwordError: "invalid" as const });
		}

		return { passwordSuccess: true };
	},
};
