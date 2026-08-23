import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { AnimalStatus, StaffAnimal } from "$lib/types/shelter";

export const load: PageServerLoad = async ({ parent, fetch, url }) => {
	const { current } = await parent();
	if (!current) error(404, "not found");
	const raw = url.searchParams.get("status");
	const status: AnimalStatus | "all" =
		raw === "draft" || raw === "live" || raw === "found_home" ? raw : "all";
	const qs = status === "all" ? "" : `?status=${status}`;
	const response = await fetch(`/api/shelters/${current.shelter_id}/animals${qs}`);
	if (!response.ok) error(502, "animals");
	const body = (await response.json()) as { items: StaffAnimal[] };
	return { animals: body.items, status };
};
