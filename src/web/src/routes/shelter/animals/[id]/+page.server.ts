import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { StaffAnimal } from "$lib/types/shelter";

export const load: PageServerLoad = async ({ parent, fetch, params }) => {
	const { current, shelter } = await parent();
	if (!current || !shelter) error(404, "not found");
	const [animalRes, listRes] = await Promise.all([
		fetch(`/api/shelters/${current.shelter_id}/animals/${params.id}`),
		fetch(`/api/shelters/${current.shelter_id}/animals`),
	]);
	if (!animalRes.ok) error(animalRes.status === 404 ? 404 : 502, "animal");
	const animal = (await animalRes.json()) as StaffAnimal;
	const animals = listRes.ok ? ((await listRes.json()) as { items: StaffAnimal[] }).items : [];
	return {
		animal,
		animals,
		readonly: shelter.verification_status === "rejected",
		verified: shelter.verification_status === "verified",
	};
};
