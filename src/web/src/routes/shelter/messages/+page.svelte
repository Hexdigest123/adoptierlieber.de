<script lang="ts">
	import type { PageProps } from "./$types";
	import { m } from "$lib/paraglide/messages";
	import { photoUrl } from "$lib/types/shelter";

	let { data }: PageProps = $props();

	let query = $state("");

	const rows = $derived.by(() => {
		const q = query.trim().toLowerCase();
		if (!q) return data.threads;
		return data.threads.filter(
			(row) =>
				row.adopter_name.toLowerCase().includes(q) || row.animal_name.toLowerCase().includes(q),
		);
	});

	function timeLabel(iso: string): string {
		return new Date(iso).toLocaleString();
	}
</script>

<h1 class="text-2xl font-black tracking-tight text-sand-950">{m.shelter_messages_title()}</h1>

<div class="mt-4 flex flex-wrap gap-2">
	<a
		href="/shelter/messages"
		class="inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold focus-ring {data.filter ===
			'all' && !data.animalId
			? 'bg-coral-600 text-white'
			: 'bg-white text-sand-700'}"
	>
		{m.shelter_filter_all()}
	</a>
	<a
		href="/shelter/messages?filter=unread"
		class="inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold focus-ring {data.filter ===
		'unread'
			? 'bg-coral-600 text-white'
			: 'bg-white text-sand-700'}"
	>
		{m.shelter_filter_unread()}
	</a>
	<a
		href="/shelter/messages?filter=mine"
		class="inline-flex h-11 items-center rounded-full px-3 text-sm font-semibold focus-ring {data.filter ===
		'mine'
			? 'bg-coral-600 text-white'
			: 'bg-white text-sand-700'}"
	>
		{m.shelter_mine()}
	</a>
	<label class="sr-only" for="shelter-messages-animal">{m.shelter_filter_animal()}</label>
	<select
		id="shelter-messages-animal"
		class="h-11 rounded-full border border-sand-300 bg-white px-3 text-sm font-semibold focus-ring"
		onchange={(event) => {
			const value = event.currentTarget.value;
			location.href = value ? `/shelter/messages?animal=${value}` : "/shelter/messages";
		}}
	>
		<option value="">{m.shelter_filter_animal()}</option>
		{#each data.animals as animal (animal.id)}
			<option value={animal.id} selected={data.animalId === animal.id}>{animal.name}</option>
		{/each}
	</select>
	<label class="sr-only" for="shelter-messages-q">{m.shelter_messages_search()}</label>
	<input
		id="shelter-messages-q"
		type="search"
		bind:value={query}
		placeholder={m.shelter_messages_search()}
		class="h-11 min-w-40 flex-1 rounded-full border border-sand-300 bg-white px-3 text-sm focus-ring"
	/>
</div>

{#if rows.length === 0}
	<p class="mt-8 text-sm text-sand-600">{m.shelter_messages_empty()}</p>
{:else}
	<ul class="mt-6 flex flex-col gap-2">
		{#each rows as thread (thread.id)}
			<li>
				<a
					href="/shelter/messages/{thread.id}"
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
						<p class="text-xs text-sand-500">{timeLabel(thread.last_message_at)}</p>
					</div>
					{#if thread.unread_for_me}
						<span class="size-2.5 shrink-0 rounded-full bg-coral-600" aria-hidden="true"></span>
					{/if}
				</a>
			</li>
		{/each}
	</ul>
{/if}
