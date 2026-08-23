import type { PageServerLoad } from "./$types";
import { adminFetch } from "$lib/admin/api";
import type { AdminAnimalDetail } from "$lib/admin/types";

export const load: PageServerLoad = async ({ params, fetch }) => {
	const animal = await adminFetch<AdminAnimalDetail>(fetch, `/api/admin/animals/${params.id}`);
	return { animal };
};
