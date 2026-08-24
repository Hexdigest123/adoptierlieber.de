import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { adminFetch } from "$lib/admin/api";
import { adminMutate } from "$lib/admin/mutate";
import type { AdminNote, AdminShelterDetail } from "$lib/admin/types";

export const load: PageServerLoad = async ({ params, fetch }) => {
	const [application, notes] = await Promise.all([
		adminFetch<AdminShelterDetail>(fetch, `/api/admin/applications/${params.id}`),
		adminFetch<{ items: AdminNote[] }>(fetch, `/api/admin/applications/${params.id}/notes`),
	]);
	return { application, notes: notes.items };
};

export const actions: Actions = {
	approve: async ({ params, fetch }) => {
		const result = await adminMutate(
			fetch,
			`/api/admin/applications/${params.id}/approval`,
			"POST",
			{},
		);
		if (!("ok" in result)) return result;
		return { approved: true };
	},
	deny: async ({ request, params, fetch }) => {
		const data = await request.formData();
		const reason = String(data.get("reason") ?? "").trim();
		if (!reason) {
			return fail(400, { adminError: "generic" as const });
		}
		const result = await adminMutate(
			fetch,
			`/api/admin/applications/${params.id}/rejection`,
			"POST",
			{ reason },
		);
		if (!("ok" in result)) return result;
		return { denied: true };
	},
	note: async ({ request, params, fetch }) => {
		const data = await request.formData();
		const body = String(data.get("body") ?? "").trim();
		if (!body) {
			return fail(400, { adminError: "generic" as const });
		}
		const result = await adminMutate(fetch, `/api/admin/applications/${params.id}/notes`, "POST", {
			body,
		});
		if (!("ok" in result)) return result;
		return { noted: true };
	},
};
