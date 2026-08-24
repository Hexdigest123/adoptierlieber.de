import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ parent, fetch }) => {
	const { current, shelter } = await parent();
	if (!current || !shelter) error(404, "not found");
	const response = await fetch(`/api/shelters/${current.shelter_id}/snippets`);
	const items = response.ok
		? ((await response.json()) as { items: { id: string; title: string; body: string }[] }).items
		: [];
	return {
		snippets: items,
		readonly: shelter.verification_status === "rejected",
	};
};
