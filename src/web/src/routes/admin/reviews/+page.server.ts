import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { adminList } from "$lib/admin/api";
import { adminMutate } from "$lib/admin/mutate";
import type { AdminReviewRow } from "$lib/admin/types";

export const load: PageServerLoad = async ({ url, fetch }) => {
	const q = url.searchParams.get("q") ?? "";
	const status = url.searchParams.get("status") ?? "pending";
	const params = new URLSearchParams();
	params.set("page", "1");
	params.set("per_page", "24");
	if (status === "pending" || status === "approved") params.set("status", status);
	if (q) params.set("q", q);
	const list = await adminList<AdminReviewRow>(fetch, `/api/admin/reviews?${params}`);
	return { q, status, list };
};

export const actions: Actions = {
	approve: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = String(data.get("id") ?? "").trim();
		if (!id) {
			return fail(400, { adminError: "generic" as const });
		}
		const result = await adminMutate(fetch, `/api/admin/reviews/${id}/approval`, "POST", {});
		if (!("ok" in result)) return result;
		return { approved: true };
	},
	remove: async ({ request, fetch }) => {
		const data = await request.formData();
		const id = String(data.get("id") ?? "").trim();
		if (!id) {
			return fail(400, { adminError: "generic" as const });
		}
		const result = await adminMutate(fetch, `/api/admin/reviews/${id}`, "DELETE");
		if (!("ok" in result)) return result;
		return { deleted: true };
	},
};
