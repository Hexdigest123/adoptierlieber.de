import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { ChatThread, StaffAnimal } from "$lib/types/shelter";

export const load: PageServerLoad = async ({ parent, fetch, url, locals }) => {
	const { current } = await parent();
	if (!current) error(404, "not found");
	const filter = url.searchParams.get("filter");
	const animalId = url.searchParams.get("animal");
	const response = await fetch(`/api/chats?shelter_id=${current.shelter_id}&archived=0`);
	if (!response.ok) error(502, "messages");
	const body = (await response.json()) as { items: ChatThread[] };
	let items = body.items;
	if (filter === "new") {
		const week = Date.now() - 7 * 24 * 60 * 60 * 1000;
		items = items.filter((row) => new Date(row.created_at).getTime() >= week);
	} else if (filter === "unread") {
		items = items.filter((row) => row.unread_for_me);
	} else if (filter === "mine") {
		items = items.filter((row) => row.assigned_user_id === locals.user?.id);
	}
	if (animalId) {
		items = items.filter((row) => row.animal_id === animalId);
	}
	const animalsRes = await fetch(`/api/shelters/${current.shelter_id}/animals`);
	const animals = animalsRes.ok
		? ((await animalsRes.json()) as { items: StaffAnimal[] }).items
		: [];
	return { threads: items, animals, filter: filter ?? "all", animalId };
};
