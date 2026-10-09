<script lang="ts">
	import { untrack } from "svelte";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import Checkbox from "$lib/components/ui/Checkbox.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import Select from "$lib/components/ui/Select.svelte";
	import AnimalCard from "$lib/components/app/AnimalCard.svelte";
	import { speciesQuery } from "$lib/app/filters.svelte";
	import { sexOptions, sizeOptions } from "$lib/app/format";
	import type { ListEnvelope, PublicAnimal } from "$lib/types/catalog";
	import { listItems } from "$lib/types/catalog";

	const user = $derived(page.data.user);

	const COLOR_OPTIONS = ["schwarz", "weiß", "braun", "grau", "getigert", "mehrfarbig"] as const;

	let q = $state("");
	let breed = $state("");
	let breedHits = $state<string[]>([]);
	/** "" means no restriction. */
	let sex = $state("");
	let size = $state("");
	let minAge = $state("");
	let maxAge = $state("");
	let goodWith = $state<string[]>([]);
	let colors = $state<string[]>([]);
	let specialNeeds = $state<"include" | "only" | "exclude">("include");
	/** One of best, distance, new. */
	let sort = $state("best");
	let animals = $state<PublicAnimal[]>([]);
	let loading = $state(false);
	let searched = $state(false);
	let error = $state(false);

	function selectOption(option: { id: string; label: string }) {
		return { value: option.id, label: option.label };
	}

	function sexSelectOptions() {
		return [{ value: "", label: m.app_search_all() }, ...sexOptions().map(selectOption)];
	}

	function sizeSelectOptions() {
		return [{ value: "", label: m.app_search_all() }, ...sizeOptions().map(selectOption)];
	}

	function specialOptions() {
		return [
			{ id: "include" as const, label: m.app_search_special_include() },
			{ id: "only" as const, label: m.app_search_special_only() },
			{ id: "exclude" as const, label: m.app_search_special_exclude() },
		];
	}

	function sortOptions() {
		return [
			{ value: "best", label: m.app_search_sort_best() },
			{ value: "distance", label: m.app_search_sort_distance() },
			{ value: "new", label: m.app_search_sort_new() },
		];
	}

	function toggleGood(tag: string) {
		goodWith = goodWith.includes(tag) ? goodWith.filter((v) => v !== tag) : [...goodWith, tag];
	}

	function toggleColor(tag: string) {
		colors = colors.includes(tag) ? colors.filter((v) => v !== tag) : [...colors, tag];
	}

	async function suggestBreeds() {
		const qBreed = breed.trim();
		if (qBreed.length < 2) {
			breedHits = [];
			return;
		}
		const params = new URLSearchParams({ q: qBreed });
		const species = speciesQuery();
		if (species && !species.includes(",")) params.set("species", species);
		try {
			const res = await fetch(`/api/animals/breeds?${params}`);
			if (!res.ok) return;
			const body = (await res.json()) as { items?: string[] };
			breedHits = listItems(body);
		} catch {
			breedHits = [];
		}
	}

	async function search() {
		loading = true;
		searched = true;
		error = false;
		const params = new URLSearchParams({
			mode: "search",
			sort,
			per_page: "24",
		});
		if (q.trim()) params.set("q", q.trim());
		const species = speciesQuery();
		if (species) params.set("species", species);
		if (sex) params.set("sex", sex);
		if (size) params.set("size", size);
		if (minAge) params.set("min_age", minAge);
		if (maxAge) params.set("max_age", maxAge);
		if (goodWith.length) params.set("good_with", goodWith.join(","));
		if (colors.length) params.set("colors", colors.join(","));
		if (specialNeeds !== "include") params.set("special_needs", specialNeeds);
		if (breed.trim()) params.set("breed", breed.trim());
		try {
			const res = await fetch(`/api/animals?${params}`);
			if (!res.ok) {
				error = true;
				return;
			}
			const body = (await res.json()) as ListEnvelope<PublicAnimal>;
			animals = listItems(body);
			error = false;
		} catch {
			error = true;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void speciesQuery();
		void user?.max_range_km;
		if (searched) {
			untrack(() => {
				void search();
			});
		}
	});
</script>

<div class="flex flex-col gap-5">
	<h1 class="text-2xl font-black text-sand-950">{m.app_search_title()}</h1>

	<form
		class="flex flex-col gap-4 pb-8"
		onsubmit={(event) => {
			event.preventDefault();
			void search();
		}}
	>
		<Input id="search-q" label={m.app_search_query()} bind:value={q} />
		<div>
			<Input
				id="search-breed"
				label={m.app_search_breed()}
				bind:value={breed}
				oninput={() => void suggestBreeds()}
				autocomplete="off"
			/>
			{#if breedHits.length > 0}
				<ul class="mt-1 rounded-xl border border-sand-200 bg-white">
					{#each breedHits as hit (hit)}
						<li>
							<button
								type="button"
								class="w-full px-3 py-2 text-left text-sm hover:bg-peach-100"
								onclick={() => {
									breed = hit;
									breedHits = [];
								}}
							>
								{hit}
							</button>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<div class="grid grid-cols-2 gap-3">
			<Select
				id="search-sex"
				label={m.app_search_sex()}
				options={sexSelectOptions()}
				bind:value={sex}
			/>
			<Select
				id="search-size"
				label={m.app_search_size()}
				options={sizeSelectOptions()}
				bind:value={size}
			/>
		</div>

		<fieldset>
			<legend class="mb-2 text-sm font-semibold text-sand-900">{m.app_search_age()}</legend>
			<div class="grid grid-cols-2 gap-3">
				<Input
					id="age-min"
					type="number"
					min="0"
					max="360"
					label={m.app_search_age_min()}
					bind:value={minAge}
				/>
				<Input
					id="age-max"
					type="number"
					min="0"
					max="360"
					label={m.app_search_age_max()}
					bind:value={maxAge}
				/>
			</div>
		</fieldset>

		<fieldset>
			<legend class="mb-2 text-sm font-semibold text-sand-900">{m.app_search_colors()}</legend>
			<div class="flex flex-wrap gap-2">
				{#each COLOR_OPTIONS as option (option)}
					<button
						type="button"
						aria-pressed={colors.includes(option)}
						class="min-h-11 cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold focus-ring {colors.includes(
							option,
						)
							? 'border-coral-600 bg-coral-600 text-white'
							: 'border-sand-200 text-sand-800'}"
						onclick={() => toggleColor(option)}
					>
						{option}
					</button>
				{/each}
			</div>
		</fieldset>

		<fieldset>
			<legend class="text-sm font-semibold text-sand-900">{m.app_search_special()}</legend>
			<div class="flex flex-wrap gap-x-6">
				{#each specialOptions() as option (option.id)}
					<label class="flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-sand-800">
						<input
							type="radio"
							name="special-needs"
							value={option.id}
							bind:group={specialNeeds}
							class="size-5 shrink-0 cursor-pointer accent-coral-600 focus-ring"
						/>
						{option.label}
					</label>
				{/each}
			</div>
		</fieldset>

		<fieldset>
			<legend class="mb-2 text-sm font-semibold text-sand-900">{m.app_search_good_with()}</legend>
			<div class="flex flex-wrap gap-x-6 gap-y-3">
				<Checkbox
					id="search-good-dogs"
					checked={goodWith.includes("dogs")}
					onchange={() => toggleGood("dogs")}
				>
					{m.app_prefs_with_dog()}
				</Checkbox>
				<Checkbox
					id="search-good-cats"
					checked={goodWith.includes("cats")}
					onchange={() => toggleGood("cats")}
				>
					{m.app_prefs_with_cat()}
				</Checkbox>
			</div>
		</fieldset>

		<Select
			id="search-sort"
			label={m.app_search_sort()}
			options={sortOptions()}
			bind:value={sort}
		/>

		<Button type="submit" {loading}>{m.app_search_submit()}</Button>
	</form>

	{#if searched && !loading && error}
		<p class="text-sm text-coral-700">{m.error_generic()}</p>
	{:else if searched && !loading && animals.length === 0}
		<p class="text-sm text-sand-700">{m.app_search_empty()}</p>
	{:else if animals.length > 0}
		<ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each animals as animal (animal.id)}
				<li><AnimalCard {animal} from="search" /></li>
			{/each}
		</ul>
	{/if}
</div>
