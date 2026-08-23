import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { adminFetch, adminList } from "$lib/admin/api";
import { adminMutate } from "$lib/admin/mutate";
import type { AdminBanRow } from "$lib/admin/types";

export const load: PageServerLoad = async ({ url, fetch }) => {
	const q = url.searchParams.get("q") ?? "";
	const params = new URLSearchParams();
	params.set("page", "1");
	params.set("per_page", "24");
	if (q) params.set("q", q);
	const list = await adminList<AdminBanRow>(fetch, `/api/admin/bans?${params}`);
	return { q, list };
};

export const actions: Actions = {
	lookup: async ({ request, fetch }) => {
		const data = await request.formData();
		const payload = {
			name: String(data.get("name") ?? "").trim(),
			street: String(data.get("street") ?? "").trim(),
			zip: String(data.get("zip") ?? "").trim(),
			city: String(data.get("city") ?? "").trim(),
		};
		if (!payload.name || !payload.street || !payload.zip || !payload.city) {
			return fail(400, { adminError: "generic" as const });
		}
		const result = await adminMutate(fetch, "/api/admin/bans/lookup", "POST", payload);
		if (!("ok" in result)) return result;
		return { lookup: result.json };
	},
	drop: async ({ request, fetch }) => {
		const data = await request.formData();
		const hash = String(data.get("hash") ?? "").trim();
		const confirm = String(data.get("confirm") ?? "")
			.trim()
			.toLowerCase();
		if (!hash || confirm !== hash.slice(0, 8).toLowerCase()) {
			return fail(400, { adminError: "generic" as const });
		}
		const result = await adminMutate(fetch, `/api/admin/bans/${hash}`, "DELETE");
		if (!("ok" in result)) return result;
		return { dropped: true };
	},
};
