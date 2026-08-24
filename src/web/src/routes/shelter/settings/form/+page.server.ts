import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { ApplicationField } from "$lib/types/shelter";

export const load: PageServerLoad = async ({ parent, fetch }) => {
	const { current, shelter } = await parent();
	if (!current) error(404, "not found");
	const response = await fetch(`/api/shelters/${current.shelter_id}/form`);
	const fields = response.ok
		? ((await response.json()) as { fields: ApplicationField[] }).fields
		: (shelter?.application_form ?? []);
	return {
		fields,
		isOwner: current.role === 1,
		readonly: shelter?.verification_status === "rejected",
	};
};
