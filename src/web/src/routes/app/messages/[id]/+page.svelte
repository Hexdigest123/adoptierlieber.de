<script lang="ts">
	import type { PageProps } from "./$types";
	import { onMount } from "svelte";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import { connectThread } from "$lib/chat/live";
	import Button from "$lib/components/ui/Button.svelte";
	import type { ChatMessage } from "$lib/types/shelter";

	let { data }: PageProps = $props();

	let messages = $state<ChatMessage[]>(data.messages);
	let draft = $state("");
	let sending = $state(false);

	$effect(() => {
		messages = data.messages;
	});

	const closed = $derived(data.thread.animal_status === "found_home");

	function systemLabel(body: string): string {
		if (body === "opened") return m.shelter_sys_opened();
		if (body === "found_home") return m.shelter_sys_home();
		return body;
	}

	async function send() {
		const body = draft.trim();
		if (!body || closed) return;
		sending = true;
		const response = await fetch(`/api/chats/${data.thread.id}/messages`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ body }),
		});
		sending = false;
		if (response.ok) {
			const row = (await response.json()) as ChatMessage;
			messages = [...messages, row];
			draft = "";
		}
	}

	function merge(row: ChatMessage) {
		if (messages.some((item) => item.id === row.id)) return;
		messages = [...messages, row];
	}

	onMount(() => {
		const stop = connectThread(data.thread.id, { onmessage: merge });
		const timer = setInterval(async () => {
			const last = messages.at(-1)?.id;
			const qs = last ? `?after=${last}` : "";
			const response = await fetch(`/api/chats/${data.thread.id}/messages${qs}`);
			if (!response.ok) return;
			const body = (await response.json()) as { items: ChatMessage[] };
			if (body.items.length) {
				const known = new Set(messages.map((row) => row.id));
				const extra = body.items.filter((row) => !known.has(row.id));
				if (extra.length) messages = [...messages, ...extra];
			}
		}, 8000);
		return () => {
			stop();
			clearInterval(timer);
		};
	});
</script>

<div class="mx-auto flex w-full max-w-2xl flex-col">
	<a
		href={resolve("/app/messages")}
		class="mb-3 inline-flex w-fit text-sm font-semibold text-sand-700 focus-ring hover:text-coral-700"
	>
		{m.app_messages_back()}
	</a>

	<header>
		<h1 class="text-xl font-black text-sand-950">
			<a href={resolve(`/app/animals/${data.thread.animal_id}`)} class="focus-ring">
				{data.thread.animal_name}
			</a>
		</h1>
		<p class="text-sm font-semibold text-coral-700">{data.thread.shelter_name}</p>
		{#if data.thread.animal_status === "found_home"}
			<p class="mt-1 text-xs font-semibold text-sand-600">{m.shelter_status_home()}</p>
		{/if}
	</header>

	<ul class="mt-4 flex flex-col gap-2" aria-live="polite">
		{#each messages as message (message.id)}
			<li
				class="max-w-[85%] rounded-2xl px-3 py-2 text-sm {message.kind === 'system'
					? 'self-center bg-sand-100 text-sand-600'
					: message.author_user_id === data.user.id
						? 'self-end bg-coral-50 text-coral-950'
						: 'self-start bg-white'}"
			>
				{message.kind === "system" ? systemLabel(message.body) : message.body}
			</li>
		{/each}
	</ul>

	{#if closed}
		<p class="mt-4 text-sm text-sand-600">{m.shelter_composer_closed()}</p>
	{:else}
		<form
			class="mt-4 flex gap-2"
			onsubmit={(event) => {
				event.preventDefault();
				void send();
			}}
		>
			<input
				bind:value={draft}
				class="h-11 flex-1 rounded-xl border border-sand-300 bg-white px-3.5 focus-ring"
				placeholder={m.shelter_composer_placeholder()}
			/>
			<Button type="submit" loading={sending}>{m.shelter_send()}</Button>
		</form>
	{/if}
</div>
