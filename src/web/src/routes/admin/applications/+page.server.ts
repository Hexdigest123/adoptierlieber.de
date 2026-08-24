import type { PageServerLoad } from "./$types";
import { adminList } from "$lib/admin/api";
import type { AdminShelterCard } from "$lib/admin/types";

export const load: PageServerLoad = async ({ url, fetch }) => {
	const q = url.searchParams.get("q") ?? "";
	const status = url.searchParams.get("status") ?? "pending";
	const params = new URLSearchParams();
	params.set("page", "1");
	params.set("per_page", "24");
	params.set("verification_status", status);
	if (q) params.set("q", q);
	const list = await adminList<AdminShelterCard>(fetch, `/api/admin/applications?${params}`);
	return { q, status, list };
};
