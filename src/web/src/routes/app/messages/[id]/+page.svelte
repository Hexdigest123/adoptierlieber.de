<script lang="ts">
	import type { PageProps } from "./$types";
	import { onMount, tick } from "svelte";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import { connectThread } from "$lib/chat/live";
	import { dayKey, formatDay, formatTime } from "$lib/datetime";
	import Button from "$lib/components/ui/Button.svelte";
	import type { ChatMessage } from "$lib/types/shelter";

	let { data }: PageProps = $props();

	let messages = $state<ChatMessage[]>(data.messages);
	let draft = $state("");
	let sending = $state(false);
	let sendError = $state(false);

	$effect(() => {
		messages = data.messages;
	});

	const closed = $derived(data.thread.animal_status === "found_home");
	const today = dayKey(new Date());
	const yesterday = dayKey(new Date(Date.now() - 86_400_000));

	function dayLabel(iso: string): string {
		const key = dayKey(iso);
		if (key === today) return m.app_messages_today();
		if (key === yesterday) return m.app_messages_yesterday();
		return formatDay(iso);
	}

	function nearEnd(): boolean {
		const doc = document.documentElement;
		return window.innerHeight + window.scrollY >= doc.scrollHeight - 160;
	}

	function scrollToEnd() {
		window.scrollTo({ top: document.documentElement.scrollHeight });
	}

	/** Append rows; follow them down unless the reader scrolled up to older messages. */
	async function append(rows: ChatMessage[], follow = nearEnd()) {
		messages = [...messages, ...rows];
		await tick();
		if (follow) scrollToEnd();
	}

	function systemLabel(body: string): string {
		if (body === "opened") return m.shelter_sys_opened();
		if (body === "found_home") return m.shelter_sys_home();
		return body;
	}

	async function send() {
		const body = draft.trim();
		if (!body || closed) return;
		sending = true;
		sendError = false;
		try {
			const response = await fetch(`/api/chats/${data.thread.id}/messages`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ body }),
			});
			if (!response.ok) {
				sendError = true;
				return;
			}
			const row = (await response.json()) as ChatMessage;
			draft = "";
			await append([row], true);
		} catch {
			sendError = true;
		} finally {
			sending = false;
		}
	}

	function merge(row: ChatMessage) {
		if (messages.some((item) => item.id === row.id)) return;
		void append([row]);
	}

	onMount(() => {
		scrollToEnd();
		const stop = connectThread(data.thread.id, { onmessage: merge });
		const timer = setInterval(async () => {
			const last = messages.at(-1)?.id;
			const qs = last ? `?after=${last}` : "";
			const response = await fetch(`/api/chats/${data.thread.id}/messages${qs}`);
			if (!response.ok) return;
			const body = (await response.json()) as { items?: ChatMessage[] };
			const items = body.items ?? [];
			if (items.length) {
				const known = new Set(messages.map((row) => row.id));
				const extra = items.filter((row) => !known.has(row.id));
				if (extra.length) void append(extra);
			}
		}, 8000);
		return () => {
			stop();
			clearInterval(timer);
		};
	});
</script>

<div class="mx-auto flex w-full max-w-2xl min-w-0 flex-col {closed ? '' : 'pb-20'}">
	<a
		href={resolve("/app/messages")}
		class="mb-3 inline-flex w-fit text-sm font-medium text-sand-700 focus-ring hover:text-coral-700"
	>
		{m.app_messages_back()}
	</a>

	<header>
		<h1 class="text-xl font-black text-sand-950">
			<a href={resolve(`/app/animals/${data.thread.animal_id}`)} class="focus-ring">
				{data.thread.animal_name}
			</a>
		</h1>
		<p class="text-sm font-medium text-coral-700">{data.thread.shelter_name}</p>
		{#if data.thread.animal_status === "found_home"}
			<p class="mt-1 text-xs font-medium text-sand-600">{m.shelter_status_home()}</p>
		{/if}
	</header>

	<ul class="mt-4 flex w-full min-w-0 flex-col gap-2" aria-live="polite">
		{#each messages as message, index (message.id)}
			{#if index === 0 || dayKey(messages[index - 1].created_at) !== dayKey(message.created_at)}
				<li class="mt-2 self-center text-xs font-medium text-sand-600">
					{dayLabel(message.created_at)}
				</li>
			{/if}
			<li
				class="max-w-[85%] min-w-0 overflow-hidden rounded-2xl px-3 py-2 text-sm [overflow-wrap:anywhere] {message.kind ===
				'system'
					? 'self-center bg-sand-200 text-sand-700'
					: message.author_user_id === data.user.id
						? 'self-end bg-coral-200 text-coral-950'
						: 'self-start bg-white'}"
			>
				<p class="whitespace-pre-wrap">
					{message.kind === "system" ? systemLabel(message.body) : message.body}
				</p>
				<time datetime={message.created_at} class="mt-0.5 block text-right text-xs opacity-70"
					>{formatTime(message.created_at)}</time
				>
			</li>
		{/each}
	</ul>

	{#if closed}
		{#if sendError}
			<p class="mt-4 text-sm text-coral-700">{m.error_generic()}</p>
		{/if}
		<p class="mt-4 text-sm text-sand-600">{m.shelter_composer_closed()}</p>
	{:else}
		<!-- Pinned above the bottom nav (mobile) like the animal detail action bar. -->
		<form
			class="fixed inset-x-0 bottom-14 z-30 border-t border-sand-200 bg-white px-4 py-3 md:bottom-0"
			onsubmit={(event) => {
				event.preventDefault();
				void send();
			}}
		>
			<div class="mx-auto flex max-w-2xl flex-col gap-2">
				{#if sendError}
					<p class="text-sm text-coral-700">{m.error_generic()}</p>
				{/if}
				<div class="flex items-end gap-2">
					<textarea
						bind:value={draft}
						rows={2}
						maxlength={2000}
						aria-label={m.shelter_composer_placeholder()}
						class="min-h-11 min-w-0 flex-1 resize-y rounded-xl border border-sand-300 bg-white px-3.5 py-2.5 focus-ring"
						placeholder={m.shelter_composer_placeholder()}
						onkeydown={(event) => {
							if (event.key === "Enter" && !event.shiftKey) {
								event.preventDefault();
								void send();
							}
						}}></textarea>
					<Button type="submit" loading={sending}>{m.shelter_send()}</Button>
				</div>
			</div>
		</form>
	{/if}
</div>
