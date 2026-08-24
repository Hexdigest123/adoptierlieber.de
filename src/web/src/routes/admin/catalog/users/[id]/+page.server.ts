import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { adminFetch } from "$lib/admin/api";
import { adminMutate } from "$lib/admin/mutate";
import type { AdminUserDetail } from "$lib/admin/types";

export const load: PageServerLoad = async ({ params, fetch }) => {
	const user = await adminFetch<AdminUserDetail>(fetch, `/api/admin/users/${params.id}`);
	return { target: user };
};

export const actions: Actions = {
	suspend: async ({ params, fetch }) => {
		const result = await adminMutate(fetch, `/api/admin/users/${params.id}/suspension`, "POST", {});
		if (!("ok" in result)) return result;
		return { ok: true };
	},
	unsuspend: async ({ params, fetch }) => {
		const result = await adminMutate(fetch, `/api/admin/users/${params.id}/suspension`, "DELETE");
		if (!("ok" in result)) return result;
		return { ok: true };
	},
	delete: async ({ request, params, fetch }) => {
		const data = await request.formData();
		const confirm = String(data.get("confirm") ?? "")
			.trim()
			.toLowerCase();
		const current = await adminFetch<AdminUserDetail>(fetch, `/api/admin/users/${params.id}`);
		if (confirm !== current.email.toLowerCase()) {
			return fail(400, { adminError: "generic" as const });
		}
		const result = await adminMutate(fetch, `/api/admin/users/${params.id}`, "DELETE");
		if (!("ok" in result)) return result;
		redirect(303, "/admin/catalog?type=users&deleted=1");
	},
	ban: async ({ request, params, fetch }) => {
		const data = await request.formData();
		const confirm = String(data.get("confirm") ?? "")
			.trim()
			.toLowerCase();
		const reason = String(data.get("reason") ?? "").trim();
		const current = await adminFetch<AdminUserDetail>(fetch, `/api/admin/users/${params.id}`);
		if (confirm !== current.email.toLowerCase() || !reason) {
			return fail(400, { adminError: "generic" as const });
		}
		const result = await adminMutate(fetch, `/api/admin/users/${params.id}/ban`, "POST", {
			reason,
		});
		if (!("ok" in result)) return result;
		redirect(303, "/admin/catalog?type=users&banned=1");
	},
};
