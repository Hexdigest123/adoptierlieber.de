<script lang="ts">
	import type { PageProps } from "./$types";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import { followThread } from "$lib/chat/live";
	import Button from "$lib/components/ui/Button.svelte";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import Select from "$lib/components/ui/Select.svelte";
	import Textarea from "$lib/components/ui/Textarea.svelte";
	import { dialog } from "$lib/dialog";
	import type { ChatMessage } from "$lib/types/shelter";

	let { data }: PageProps = $props();

	let messages = $derived<ChatMessage[]>(data.messages);
	let draft = $state("");
	let sending = $state(false);
	let sendError = $state(false);
	let showProfile = $state(false);
	let assigned = $derived(data.thread.assigned_user_id ?? "");

	const assignOptions = $derived([
		{ value: "", label: m.shelter_assign_none() },
		...data.members.map((member) => ({
			value: member.user_id,
			label: member.display_name || member.name,
		})),
	]);

	const closed = $derived(
		data.thread.animal_status === "found_home" || data.shelter?.verification_status === "rejected",
	);

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
			messages = [...messages, row];
			draft = "";
		} catch {
			sendError = true;
		} finally {
			sending = false;
		}
	}

	async function archive() {
		const response = await fetch(`/api/chats/${data.thread.id}/archive`, { method: "POST" });
		if (!response.ok) {
			sendError = true;
			return;
		}
		await goto(resolve("/shelter/messages"));
	}

	async function assign() {
		const response = await fetch(`/api/chats/${data.thread.id}/assignment`, {
			method: "PUT",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ user_id: assigned || null }),
		});
		if (!response.ok) sendError = true;
	}

	// Keyed on the thread: SvelteKit reuses this page when opening another thread.
	$effect(() =>
		followThread(
			data.thread.id,
			() => messages,
			(rows) => (messages = [...messages, ...rows]),
		),
	);
</script>

<div class="flex flex-col gap-4 lg:flex-row">
	<div class="min-w-0 flex-1">
		<header class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<h1 class="text-xl font-black text-sand-950">{data.thread.adopter_name}</h1>
				<a
					href={resolve("/shelter/animals/[id]", { id: data.thread.animal_id })}
					class="text-sm font-medium text-coral-700"
				>
					{data.thread.animal_name}
				</a>
				{#if data.thread.animal_status === "found_home"}
					<p class="mt-1 text-xs font-medium text-sand-600">{m.shelter_status_home()}</p>
				{/if}
			</div>
			<div class="flex flex-wrap gap-2">
				<div class="flex items-center gap-2 text-sm font-medium text-sand-800">
					<span aria-hidden="true">{m.shelter_assign()}</span>
					<Select
						id="thread-assign"
						label={m.shelter_assign()}
						hideLabel
						options={assignOptions}
						bind:value={assigned}
						onchange={() => void assign()}
					/>
				</div>
				<Button variant="ghost" size="sm" class="lg:hidden" onclick={() => (showProfile = true)}>
					{m.shelter_profile_open()}
				</Button>
				<Button variant="outline" size="sm" onclick={archive}>{m.shelter_archive()}</Button>
			</div>
		</header>

		{#if data.thread.prior.length}
			<ul class="mt-3 flex flex-wrap gap-x-4 gap-y-1">
				{#each data.thread.prior as prior (prior.id)}
					<li>
						<a
							href={resolve("/shelter/messages/[id]", { id: prior.id })}
							class="text-sm font-medium text-coral-700 underline underline-offset-2 focus-ring"
						>
							{m.shelter_also({ animal: prior.animal_name })}
						</a>
					</li>
				{/each}
			</ul>
		{/if}

		{#if data.application.answers.length}
			<section class="mt-4 rounded-xl border border-sand-200 bg-sand-50 p-4">
				<p class="text-sm font-medium text-sand-600">
					{m.shelter_app_internal()}
				</p>
				<dl class="mt-2 grid gap-2">
					{#each data.application.answers as answer (answer.field_id)}
						<div>
							<dt class="text-xs text-sand-500">{answer.label}</dt>
							<dd class="text-sm text-sand-900">{answer.value || "–"}</dd>
						</div>
					{/each}
				</dl>
			</section>
		{/if}

		<ul class="mt-4 flex w-full min-w-0 flex-col gap-2" aria-live="polite">
			{#each messages as message (message.id)}
				<li
					class="max-w-[85%] min-w-0 overflow-hidden rounded-2xl px-3 py-2 text-sm [overflow-wrap:anywhere] whitespace-pre-wrap {message.kind ===
					'system'
						? 'self-center bg-sand-200 text-sand-700'
						: message.author_user_id === data.thread.adopter_user_id
							? 'self-start bg-white'
							: 'self-end bg-coral-200 text-coral-950'}"
				>
					{message.kind === "system" ? systemLabel(message.body) : message.body}
				</li>
			{/each}
		</ul>

		{#if sendError}
			<p class="mt-4 text-sm text-coral-700">{m.error_generic()}</p>
		{/if}
		{#if closed}
			<p class="mt-4 text-sm text-sand-600">{m.shelter_composer_closed()}</p>
		{:else}
			{#if data.snippets.length}
				<div class="mt-4 flex flex-wrap gap-2">
					{#each data.snippets as snippet (snippet.id)}
						<Button
							type="button"
							variant="outline"
							size="sm"
							onclick={() => (draft = snippet.body)}
						>
							{m.shelter_snippet_insert()}: {snippet.title}
						</Button>
					{/each}
				</div>
			{/if}
			<form
				class="mt-4 flex items-end gap-2"
				onsubmit={(event) => {
					event.preventDefault();
					void send();
				}}
			>
				<Textarea
					id="thread-composer"
					class="min-w-0 flex-1"
					label={m.shelter_composer_placeholder()}
					hideLabel
					bind:value={draft}
					rows={3}
					maxlength={2000}
					placeholder={m.shelter_composer_placeholder()}
					onkeydown={(event) => {
						if (event.key === "Enter" && !event.shiftKey) {
							event.preventDefault();
							void send();
						}
					}}
				/>
				<Button type="submit" loading={sending}>{m.shelter_send()}</Button>
			</form>
		{/if}
	</div>

	<aside class="hidden w-72 shrink-0 lg:block">
		{@render profile()}
	</aside>
</div>

{#if showProfile}
	<div class="fixed inset-0 z-50 flex items-end bg-sand-950/40 lg:hidden">
		<div
			class="max-h-[80dvh] w-full overflow-y-auto rounded-t-2xl bg-white p-5"
			role="dialog"
			aria-modal="true"
			aria-label={data.thread.adopter_name}
			use:dialog={() => (showProfile = false)}
		>
			<div class="flex justify-end">
				<Button variant="ghost" size="sm" onclick={() => (showProfile = false)}
					>{m.shelter_interest_cancel()}</Button
				>
			</div>
			{@render profile()}
		</div>
	</div>
{/if}

{#snippet profile()}
	<div class="rounded-2xl border border-sand-200 bg-white p-4">
		<div class="flex items-center gap-3">
			<Avatar
				name={data.thread.adopter_name}
				userId={data.thread.adopter_user_id}
				hasAvatar={data.thread.adopter_has_avatar}
			/>
			<p class="font-bold text-sand-950">{data.thread.adopter_name}</p>
		</div>
		{#if data.thread.grant?.profile}
			<p class="mt-3 text-sm text-sand-700">
				{[data.thread.grant.profile.zip, data.thread.grant.profile.city]
					.filter(Boolean)
					.join(" ") || m.shelter_no_city()}
			</p>
		{/if}
		{#if data.thread.grant?.email}
			<a
				href="mailto:{data.thread.grant.email}"
				class="mt-2 block text-sm font-medium text-coral-700"
			>
				{data.thread.grant.email}
			</a>
		{:else}
			<p class="mt-2 text-sm text-sand-500">{m.shelter_email_hidden()}</p>
		{/if}
	</div>
{/snippet}
