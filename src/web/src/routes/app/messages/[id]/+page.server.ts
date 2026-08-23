import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { ChatMessage, ChatThreadDetail } from "$lib/types/shelter";

export const load: PageServerLoad = async ({ fetch, params, parent }) => {
	const { user } = await parent();
	const [threadRes, messagesRes] = await Promise.all([
		fetch(`/api/chats/${params.id}`),
		fetch(`/api/chats/${params.id}/messages`),
	]);
	if (!threadRes.ok) error(threadRes.status === 404 ? 404 : 502, "thread");
	const thread = (await threadRes.json()) as ChatThreadDetail;
	if (thread.adopter_user_id !== user.id) error(404, "thread");
	const messages = messagesRes.ok
		? ((await messagesRes.json()) as { items: ChatMessage[] }).items
		: [];
	await fetch(`/api/chats/${params.id}/read`, { method: "POST" });
	return { thread, messages };
};
