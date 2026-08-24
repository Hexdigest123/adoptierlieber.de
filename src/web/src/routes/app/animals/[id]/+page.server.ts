import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { PublicAnimal } from "$lib/types/catalog";

export const load: PageServerLoad = async ({ fetch, params }) => {
	const response = await fetch(`/api/animals/${params.id}`);
	if (response.status === 404) {
		error(404, "animal not found");
	}
	if (!response.ok) {
		error(502, "animal unavailable");
	}
	const animal = (await response.json()) as PublicAnimal;
	return { animal };
};
