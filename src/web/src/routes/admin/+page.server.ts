import type { PageServerLoad } from "./$types";
import { adminFetch } from "$lib/admin/api";
import type { AdminOverview, AdminShelterCard, ListEnvelope } from "$lib/admin/types";

export const load: PageServerLoad = async ({ fetch }) => {
	const [overview, pending] = await Promise.all([
		adminFetch<AdminOverview>(fetch, "/api/admin/overview"),
		adminFetch<ListEnvelope<AdminShelterCard>>(
			fetch,
			"/api/admin/applications?verification_status=pending&per_page=6",
		),
	]);
	return { overview, pending };
};
