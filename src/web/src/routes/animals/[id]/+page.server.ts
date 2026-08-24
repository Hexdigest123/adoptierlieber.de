import { error, redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { PublicAnimal } from "$lib/types/catalog";

export const load: PageServerLoad = async ({ fetch, params, locals }) => {
	if (locals.user) {
		redirect(303, `/app/animals/${params.id}`);
	}
	const response = await fetch(`/api/animals/${params.id}`);
	if (response.status === 404) {
		error(404, "animal not found");
	}
	if (!response.ok) {
		error(502, "animal unavailable");
	}
	const animal = (await response.json()) as PublicAnimal;
	if (animal.status === "draft") {
		error(404, "animal not found");
	}
	return { animal };
};
