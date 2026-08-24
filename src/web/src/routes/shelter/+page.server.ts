import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { ShelterDashboard } from "$lib/types/shelter";

export const load: PageServerLoad = async ({ parent, fetch }) => {
	const { current } = await parent();
	if (!current) {
		error(404, "not found");
	}
	const response = await fetch(`/api/shelters/${current.shelter_id}/dashboard`);
	if (!response.ok) {
		error(response.status === 403 ? 403 : 502, "dashboard");
	}
	const dashboard = (await response.json()) as ShelterDashboard;
	return { dashboard };
};
