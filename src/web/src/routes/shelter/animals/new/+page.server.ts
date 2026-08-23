import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { StaffAnimal } from "$lib/types/shelter";

export const load: PageServerLoad = async ({ parent, fetch, url }) => {
	const { current, shelter } = await parent();
	if (!current || !shelter) error(404, "not found");
	const response = await fetch(`/api/shelters/${current.shelter_id}/animals`);
	const animals = response.ok ? ((await response.json()) as { items: StaffAnimal[] }).items : [];
	return {
		animals,
		startAsPair: url.searchParams.get("pair") === "1",
		readonly: shelter.verification_status === "rejected",
		verified: shelter.verification_status === "verified",
	};
};
