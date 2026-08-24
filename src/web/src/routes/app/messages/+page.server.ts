import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { ChatThread } from "$lib/types/shelter";

export const load: PageServerLoad = async ({ fetch }) => {
	const response = await fetch("/api/chats");
	if (!response.ok) error(502, "messages");
	const body = (await response.json()) as { items: ChatThread[] };
	return { threads: body.items };
};
