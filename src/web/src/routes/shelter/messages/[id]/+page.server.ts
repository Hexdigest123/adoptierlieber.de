import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import type { ChatMessage, ChatThreadDetail, ShelterMemberRow } from "$lib/types/shelter";

export const load: PageServerLoad = async ({ parent, fetch, params }) => {
	const { current } = await parent();
	if (!current) error(404, "not found");
	const [threadRes, messagesRes, appRes, membersRes, snippetsRes] = await Promise.all([
		fetch(`/api/chats/${params.id}`),
		fetch(`/api/chats/${params.id}/messages`),
		fetch(`/api/chats/${params.id}/application`),
		fetch(`/api/shelters/${current.shelter_id}/members`),
		fetch(`/api/shelters/${current.shelter_id}/snippets`),
	]);
	if (!threadRes.ok) error(threadRes.status === 404 ? 404 : 502, "thread");
	const thread = (await threadRes.json()) as ChatThreadDetail;
	if (thread.shelter_id !== current.shelter_id) error(404, "thread");
	const messages = messagesRes.ok
		? ((await messagesRes.json()) as { items: ChatMessage[] }).items
		: [];
	const application = appRes.ok
		? ((await appRes.json()) as {
				answers: { field_id: string; label: string; type: string; value: string }[];
				granted_at: string | null;
			})
		: { answers: [], granted_at: null };
	const members = membersRes.ok
		? ((await membersRes.json()) as { members: ShelterMemberRow[] }).members
		: [];
	const snippets = snippetsRes.ok
		? ((await snippetsRes.json()) as { items: { id: string; title: string; body: string }[] }).items
		: [];
	await fetch(`/api/chats/${params.id}/read`, { method: "POST" });
	return { thread, messages, application, members, snippets };
};
