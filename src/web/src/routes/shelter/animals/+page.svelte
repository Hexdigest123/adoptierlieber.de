<script lang="ts">
	import type { PageProps } from "./$types";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import Card from "$lib/components/ui/Card.svelte";
	import { photoUrl, type AnimalStatus, type StaffAnimal } from "$lib/types/shelter";

	let { data }: PageProps = $props();

	let query = $state("");
	let sort = $state<"updated" | "name" | "impressions" | "likes">("updated");

	const tabs: { id: "all" | AnimalStatus; label: () => string }[] = [
		{ id: "all", label: () => m.shelter_animals_all() },
		{ id: "draft", label: () => m.shelter_status_draft() },
		{ id: "live", label: () => m.shelter_status_live() },
		{ id: "found_home", label: () => m.shelter_status_home() },
	];

	const filtered = $derived.by(() => {
		const q = query.trim().toLowerCase();
		const rows = q
			? data.animals.filter((row) => row.name.toLowerCase().includes(q))
			: [...data.animals];
		rows.sort((a, b) => {
			if (sort === "name") return a.name.localeCompare(b.name);
			if (sort === "impressions") return b.impression_count - a.impression_count;
			if (sort === "likes") return b.like_count - a.like_count;
			return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
		});
		return rows;
	});

	function speciesLabel(animal: StaffAnimal): string {
		switch (animal.species) {
			case "cat":
				return m.species_cat();
			case "dog":
				return m.species_dog();
			case "rabbit":
				return m.species_rabbit();
			case "guinea_pig":
				return m.species_guinea_pig();
			case "bird":
				return m.shelter_species_bird();
			case "reptile":
				return m.shelter_species_reptile();
			default:
				return m.shelter_species_other();
		}
	}

	function statusLabel(status: AnimalStatus): string {
		if (status === "live") return m.shelter_status_live();
		if (status === "found_home") return m.shelter_status_home();
		return m.shelter_status_draft();
	}

	const hasAnimals = $derived(data.hasAnimals || data.animals.length > 0);
	const newLabel = $derived(hasAnimals ? m.shelter_animal_add() : m.shelter_animal_new());
</script>

<div class="flex flex-wrap items-end justify-between gap-3">
	<h1 class="text-2xl font-black tracking-tight text-sand-950">{m.shelter_animals_title()}</h1>
	<div class="flex flex-wrap gap-2">
		<Button href="/shelter/animals/new" size="sm">{newLabel}</Button>
	</div>
</div>

<div class="mt-4 flex flex-wrap gap-2" role="tablist">
	{#each tabs as tab (tab.id)}
		<a
			href={tab.id === "all" ? "/shelter/animals" : `/shelter/animals?status=${tab.id}`}
			class="rounded-full px-3 py-1.5 text-sm font-semibold focus-ring {data.status === tab.id
				? 'bg-coral-600 text-white'
				: 'bg-white text-sand-700 hover:bg-peach-100'}"
		>
			{tab.label()}
		</a>
	{/each}
</div>

<div class="mt-4 flex flex-wrap gap-3">
	<label class="sr-only" for="shelter-animals-q">{m.shelter_animals_search()}</label>
	<input
		id="shelter-animals-q"
		type="search"
		bind:value={query}
		placeholder={m.shelter_animals_search()}
		class="h-11 min-w-48 flex-1 rounded-xl border border-sand-300 bg-white px-3.5 text-base focus-ring"
	/>
	<label class="sr-only" for="shelter-animals-sort">{m.app_search_sort()}</label>
	<select
		id="shelter-animals-sort"
		bind:value={sort}
		class="h-11 rounded-xl border border-sand-300 bg-white px-3 text-sm font-semibold focus-ring"
	>
		<option value="updated">{m.shelter_sort_updated()}</option>
		<option value="name">{m.shelter_sort_name()}</option>
		<option value="impressions">{m.shelter_sort_impressions()}</option>
		<option value="likes">{m.shelter_sort_likes()}</option>
	</select>
</div>

{#if filtered.length === 0}
	<Card class="mt-8 text-center">
		<p class="font-semibold text-sand-900">{m.shelter_animals_empty()}</p>
		<div class="mt-4">
			<Button href="/shelter/animals/new">{newLabel}</Button>
		</div>
	</Card>
{:else}
	<ul class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each filtered as animal (animal.id)}
			<li>
				<a href="/shelter/animals/{animal.id}" class="block">
					<Card focusable padding="none" class="overflow-hidden">
						{#if animal.photos[0] && data.current}
							<img
								src={photoUrl(data.current.shelter_id, animal.id, animal.photos[0])}
								alt=""
								class="aspect-[4/3] w-full object-cover"
							/>
						{:else}
							<div class="flex aspect-[4/3] items-center justify-center bg-peach-100 text-sand-400">
								{m.shelter_no_photo()}
							</div>
						{/if}
						<div class="p-4">
							<div class="flex items-start justify-between gap-2">
								<div>
									<p class="font-bold text-sand-950">{animal.name}</p>
									<p class="text-sm text-sand-600">{speciesLabel(animal)}</p>
								</div>
								<span
									class="rounded-full px-2 py-0.5 text-xs font-semibold {animal.status === 'live'
										? 'bg-emerald-50 text-emerald-800'
										: animal.status === 'found_home'
											? 'bg-sand-100 text-sand-700'
											: 'bg-peach-100 text-coral-800'}"
								>
									{statusLabel(animal.status)}
								</span>
							</div>
							<p class="mt-2 text-xs text-sand-600">
								♥ {animal.like_count} 👁 {animal.impression_count}
								{#if animal.unread_threads}
									{m.shelter_unread_badge({ count: String(animal.unread_threads) })}
								{/if}
							</p>
						</div>
					</Card>
				</a>
			</li>
		{/each}
	</ul>
{/if}
