import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { checkAvatarFile } from "$lib/server/avatar";
import { clearSessionCookie } from "$lib/server/session-cookie";

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
		const street = String(data.get("street") ?? "").trim();
		const zip = String(data.get("zip") ?? "").trim();
		const city = String(data.get("city") ?? "").trim();

		if (!name || !street || !zip || !city) {
			return fail(400, { profileError: true, name, displayName, street, zip, city });
		}

		const response = await fetch("/api/users/me", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				name,
				displayName: displayName || null,
				street,
				zip,
				city,
			}),
		});

		if (!response.ok) {
			return fail(response.status === 400 ? 400 : 502, {
				profileError: true,
				name,
				displayName,
				street,
				zip,
				city,
			});
		}

		return { profileSuccess: true };
	},

	resetTaste: async ({ fetch, locals }) => {
		if (!locals.user) {
			redirect(303, "/login");
		}
		const response = await fetch("/api/users/me", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ taste_weights: null }),
		});
		if (!response.ok) {
			return fail(502, { tasteError: true });
		}
		return { tasteReset: true };
	},

	resetSeen: async ({ fetch, locals }) => {
		if (!locals.user) {
			redirect(303, "/login");
		}
		const response = await fetch("/api/swipes", { method: "DELETE" });
		if (!response.ok) {
			return fail(502, { seenError: true });
		}
		return { seenReset: true };
	},

	home: async ({ request, fetch, locals }) => {
		if (!locals.user) redirect(303, "/login");
		const data = await request.formData();
		const q = String(data.get("home_query") ?? "").trim();
		if (!q) return fail(400, { homeError: true });
		const geo = await fetch("/api/geo/search", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ q }),
		});
		if (!geo.ok) return fail(502, { homeError: true });
		const body = (await geo.json()) as {
			items: { lat: number; lng: number; label: string; country: string | null }[];
		};
		const hit = body.items[0];
		if (!hit) return fail(400, { homeError: true });
		const response = await fetch("/api/users/me", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				home_query: q,
				home_label: hit.label,
				home_country: hit.country,
				home_lat: hit.lat,
				home_lng: hit.lng,
				location_precision: "place",
			}),
		});
		if (!response.ok) return fail(502, { homeError: true });
		return { homeSuccess: true };
	},

	homeClear: async ({ fetch, locals }) => {
		if (!locals.user) redirect(303, "/login");
		const response = await fetch("/api/users/me", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				home_query: null,
				home_label: null,
				home_country: null,
				home_lat: null,
				home_lng: null,
				location_precision: null,
			}),
		});
		if (!response.ok) return fail(502, { homeError: true });
		return { homeSuccess: true };
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

	requestDeletion: async ({ fetch, locals }) => {
		if (!locals.user) {
			redirect(303, "/login");
		}

		const response = await fetch("/api/users/delete", {
			method: "DELETE",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({}),
		});

		if (!response.ok) {
			if (response.status === 429) {
				return fail(429, { deleteError: "rate_limited" as const });
			}
			if (response.status >= 500) {
				return fail(502, { deleteError: "mail" as const });
			}
			return fail(response.status === 400 ? 400 : 502, { deleteError: "invalid" as const });
		}

		return { deletionRequested: true };
	},

	confirmDeletion: async ({ request, fetch, locals, cookies }) => {
		if (!locals.user) {
			redirect(303, "/login");
		}

		const data = await request.formData();
		const deletionToken = String(data.get("deletionToken") ?? "").trim();

		if (!deletionToken) {
			return fail(400, { deleteError: "invalid" as const, deletionRequested: true });
		}

		const response = await fetch("/api/users/delete", {
			method: "DELETE",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ deletionToken }),
		});

		if (!response.ok) {
			if (response.status === 429) {
				return fail(429, { deleteError: "rate_limited" as const, deletionRequested: true });
			}
			if (response.status === 400 || response.status === 401) {
				return fail(400, { deleteError: "token" as const, deletionRequested: true });
			}
			if (response.status === 409) {
				return fail(409, { deleteError: "last_owner" as const, deletionRequested: true });
			}
			return fail(502, { deleteError: "invalid" as const, deletionRequested: true });
		}

		clearSessionCookie(cookies);
		redirect(303, "/");
	},
};
