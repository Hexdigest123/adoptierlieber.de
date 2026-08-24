import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { adminFetch } from "$lib/admin/api";
import { adminMutate } from "$lib/admin/mutate";
import type { AdminTeam } from "$lib/admin/types";

export const load: PageServerLoad = async ({ fetch }) => {
	const team = await adminFetch<AdminTeam>(fetch, "/api/admin/admins");
	return { team };
};

export const actions: Actions = {
	invite: async ({ request, fetch }) => {
		const data = await request.formData();
		const email = String(data.get("email") ?? "")
			.trim()
			.toLowerCase();
		if (!email) {
			return fail(400, { adminError: "generic" as const });
		}
		const result = await adminMutate(fetch, "/api/admin/invites", "POST", { email });
		if (!("ok" in result)) return result;
		return { invited: true };
	},
	revoke: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = String(data.get("id") ?? "");
		if (!id) return fail(400, { adminError: "generic" as const });
		const result = await adminMutate(fetch, `/api/admin/invites/${id}`, "DELETE");
		if (!("ok" in result)) return result;
		return { revoked: true };
	},
	remove: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = String(data.get("id") ?? "");
		if (!id) return fail(400, { adminError: "generic" as const });
		const result = await adminMutate(fetch, `/api/admin/admins/${id}`, "DELETE");
		if (!("ok" in result)) return result;
		return { removed: true };
	},
};
