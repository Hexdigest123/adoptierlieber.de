import type { PageServerLoad } from "./$types";
import { adminFetch } from "$lib/admin/api";
import type { AdminShelterDetail } from "$lib/admin/types";

export const load: PageServerLoad = async ({ params, fetch }) => {
	const shelter = await adminFetch<AdminShelterDetail>(fetch, `/api/admin/shelters/${params.id}`);
	return { shelter };
};
