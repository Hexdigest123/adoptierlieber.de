<script lang="ts">
	import { resolve } from "$app/paths";
	import { untrack } from "svelte";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import AnimalCard from "$lib/components/app/AnimalCard.svelte";
	import { speciesQuery } from "$lib/app/filters.svelte";
	import type { ListEnvelope, PublicAnimal } from "$lib/types/catalog";
	import { listItems } from "$lib/types/catalog";

	let animals = $state<PublicAnimal[]>([]);
	let loading = $state(true);
	let error = $state(false);
	let toast = $state("");
	let sort = $state<"recent" | "distance" | "name">("recent");

	async function load() {
		loading = true;
		error = false;
		const params = new URLSearchParams({ per_page: "50", sort });
		const species = speciesQuery();
		if (species) params.set("species", species);
		try {
			const res = await fetch(`/api/likes?${params}`);
			if (!res.ok) {
				error = true;
				return;
			}
			const body = (await res.json()) as ListEnvelope<PublicAnimal>;
			animals = listItems(body);
		} catch {
			error = true;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void sort;
		void speciesQuery();
		untrack(() => {
			void load();
		});
	});

	async function unlike(id: string) {
		const prev = animals;
		animals = animals.filter((row) => row.id !== id);
		toast = m.app_likes_unliked();
		const res = await fetch(`/api/animals/${id}/like`, { method: "DELETE" });
		if (!res.ok) animals = prev;
		setTimeout(() => {
			if (toast === m.app_likes_unliked()) toast = "";
		}, 4000);
	}
</script>

<div class="flex flex-col gap-4">
	<div
		class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between sm:gap-3"
	>
		<h1 class="text-2xl font-black text-sand-950">{m.app_likes_title()}</h1>
		<div class="flex flex-wrap gap-1" role="group" aria-label={m.app_search_sort()}>
			{#each [{ id: "recent", label: m.app_likes_sort_recent() }, { id: "distance", label: m.app_likes_sort_distance() }, { id: "name", label: m.app_likes_sort_name() }] as option (option.id)}
				<button
					type="button"
					aria-pressed={sort === option.id}
					class="rounded-full px-3 py-1.5 text-sm font-semibold focus-ring {sort === option.id
						? 'bg-coral-600 text-white'
						: 'text-sand-700 hover:bg-peach-100'}"
					onclick={() => (sort = option.id as typeof sort)}
				>
					{option.label}
				</button>
			{/each}
		</div>
	</div>

	{#if toast}
		<p class="text-sm font-semibold text-sand-800" role="status">{toast}</p>
	{/if}

	{#if loading}
		<p class="text-sm text-sand-600">…</p>
	{:else if error}
		<p class="text-sm text-coral-700">{m.app_empty_error_text()}</p>
		<Button variant="outline" size="sm" onclick={() => void load()}>{m.app_retry()}</Button>
	{:else if animals.length === 0}
		<div class="rounded-3xl border-2 border-dashed border-sand-300 bg-white p-8 text-center">
			<p class="text-xl font-bold text-sand-900">{m.app_likes_empty_title()}</p>
			<p class="mt-2 text-sm text-sand-700">{m.app_likes_empty_text()}</p>
			<div class="mt-4">
				<Button href={resolve("/app")}>{m.app_tab_discover()}</Button>
			</div>
		</div>
	{:else}
		<ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each animals as animal (animal.id)}
				<li>
					<AnimalCard {animal} from="likes" onunlike={unlike} />
				</li>
			{/each}
		</ul>
	{/if}
</div>
