<script lang="ts">
	import type { PageProps } from "./$types";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Input from "$lib/components/ui/Input.svelte";
	import Select from "$lib/components/ui/Select.svelte";
	import { photoUrl } from "$lib/types/shelter";
	import { formatDateTime } from "$lib/datetime";

	let { data }: PageProps = $props();

	let query = $state("");

	const animalOptions = $derived([
		{ value: "", label: m.shelter_filter_animal() },
		...data.animals.map((animal) => ({ value: animal.id, label: animal.name })),
	]);

	function onAnimal(event: Event & { currentTarget: HTMLSelectElement }) {
		const id = event.currentTarget.value;
		void goto(
			resolve(id ? `/shelter/messages?animal=${encodeURIComponent(id)}` : "/shelter/messages"),
		);
	}

	const rows = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return data.threads;
		return data.threads.filter(
			(row) =>
				row.adopter_name.toLowerCase().includes(q) || row.animal_name.toLowerCase().includes(q),
		);
	});
</script>

<h1 class="text-2xl font-black tracking-tight text-sand-950">{m.shelter_messages_title()}</h1>

<div class="mt-4 flex flex-wrap gap-2">
	<a
		href={resolve("/shelter/messages")}
		aria-current={data.filter === "all" && !data.animalId ? "page" : undefined}
		class="inline-flex h-11 items-center rounded-full px-3 text-sm font-medium focus-ring {data.filter ===
			'all' && !data.animalId
			? 'bg-coral-50 text-coral-800'
			: 'bg-white text-sand-700 hover:bg-peach-100'}"
	>
		{m.shelter_filter_all()}
	</a>
	<a
		href={resolve("/shelter/messages?filter=unread")}
		aria-current={data.filter === "unread" ? "page" : undefined}
		class="inline-flex h-11 items-center rounded-full px-3 text-sm font-medium focus-ring {data.filter ===
		'unread'
			? 'bg-coral-50 text-coral-800'
			: 'bg-white text-sand-700 hover:bg-peach-100'}"
	>
		{m.shelter_filter_unread()}
	</a>
	<a
		href={resolve("/shelter/messages?filter=mine")}
		aria-current={data.filter === "mine" ? "page" : undefined}
		class="inline-flex h-11 items-center rounded-full px-3 text-sm font-medium focus-ring {data.filter ===
		'mine'
			? 'bg-coral-50 text-coral-800'
			: 'bg-white text-sand-700 hover:bg-peach-100'}"
	>
		{m.shelter_mine()}
	</a>
	<Select
		id="shelter-messages-animal"
		label={m.shelter_filter_animal()}
		hideLabel
		options={animalOptions}
		value={data.animalId ?? ""}
		onchange={onAnimal}
	/>
	<Input
		id="shelter-messages-q"
		class="min-w-40 flex-1"
		type="search"
		label={m.shelter_messages_search()}
		hideLabel
		bind:value={query}
		placeholder={m.shelter_messages_search()}
	/>
</div>

{#if rows.length === 0}
	<p class="mt-8 text-sm text-sand-600">{m.shelter_messages_empty()}</p>
{:else}
	<ul class="mt-6 flex flex-col gap-2">
		{#each rows as thread (thread.id)}
			<li>
				<a
					href={resolve("/shelter/messages/[id]", { id: thread.id })}
					class="flex items-center gap-3 rounded-xl border border-sand-200 bg-white px-3 py-3 focus-ring hover:bg-peach-50"
				>
					{#if thread.animal_photo && data.current}
						<img
							src={photoUrl(data.current.shelter_id, thread.animal_id, thread.animal_photo)}
							alt=""
							class="size-12 rounded-lg object-cover"
						/>
					{:else}
						<div class="size-12 rounded-lg bg-peach-200"></div>
					{/if}
					<div class="min-w-0 flex-1">
						<p class="truncate font-semibold text-sand-950">
							{thread.adopter_name}
							<span class="font-normal text-sand-600"> {thread.animal_name}</span>
						</p>
						<p class="truncate text-sm text-sand-600">{thread.last_preview ?? ""}</p>
						{#if thread.assigned_name}
							<p class="text-xs text-sand-500">{m.shelter_assign()}: {thread.assigned_name}</p>
						{/if}
						<p class="text-xs text-sand-500">{formatDateTime(thread.last_message_at)}</p>
					</div>
					{#if thread.unread_for_me}
						<span class="size-2.5 shrink-0 rounded-full bg-coral-600" aria-hidden="true"></span>
						<span class="sr-only">{m.shelter_filter_unread()}</span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}
