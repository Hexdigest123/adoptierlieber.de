<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import { untrack } from "svelte";
	import { SvelteURLSearchParams } from "svelte/reactivity";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import Select from "$lib/components/ui/Select.svelte";
	import Spinner from "$lib/components/ui/Spinner.svelte";
	import AnimalCard from "$lib/components/app/AnimalCard.svelte";
	import { selectedSpecies, setSelectedSpecies, speciesQuery } from "$lib/app/filters.svelte";
	import { sexOptions, sizeOptions } from "$lib/app/format";
	import type { ListEnvelope, PublicAnimal } from "$lib/types/catalog";
	import { listItems } from "$lib/types/catalog";
	import { RANGE_STOPS } from "$lib/types/catalog";

	let q = $state("");
	/** "" means no restriction. */
	let sex = $state("");
	let size = $state("");
	/** One of best, distance, new. */
	let sort = $state("best");
	let animals = $state<PublicAnimal[]>([]);
	let pageNo = $state(1);
	let total = $state(0);
	let inRange = $state(0);
	let outsideRange = $state(0);
	let loading = $state(true);
	let error = $state(false);
	let requestId = 0;
	let sentinel: HTMLDivElement | undefined = $state();

	const user = $derived(page.data.user);
	const rangeLabel = $derived(
		user?.max_range_km == null
			? m.app_range_unlimited()
			: m.app_range_km({ count: user.max_range_km }),
	);
	const hasMore = $derived(animals.length < total);
	const hasExtraFilters = $derived(
		Boolean(q.trim() || sex || size || selectedSpecies().length > 0),
	);

	async function load(reset: boolean) {
		if (!reset && (loading || !hasMore)) return;
		const id = ++requestId;
		loading = true;
		error = false;
		const nextPage = reset ? 1 : pageNo;
		const params = new SvelteURLSearchParams({
			mode: "search",
			page: String(nextPage),
			per_page: "24",
			sort,
		});
		if (q.trim()) params.set("q", q.trim());
		const species = speciesQuery();
		if (species) params.set("species", species);
		if (sex) params.set("sex", sex);
		if (size) params.set("size", size);
		try {
			const res = await fetch(`/api/animals?${params}`);
			if (id !== requestId) return;
			if (!res.ok) {
				error = true;
				return;
			}
			const body = (await res.json()) as ListEnvelope<PublicAnimal>;
			const items = listItems(body);
			total = body.total;
			inRange = body.in_range ?? body.total;
			outsideRange = body.outside_range ?? 0;
			if (reset) {
				animals = items;
				pageNo = 2;
			} else {
				const seen = new Set(animals.map((row) => row.id));
				animals = [...animals, ...items.filter((row) => !seen.has(row.id))];
				pageNo = nextPage + 1;
			}
		} catch {
			if (id !== requestId) return;
			error = true;
		} finally {
			if (id === requestId) loading = false;
		}
	}

	$effect(() => {
		void user?.max_range_km;
		void user?.home_lat;
		void user?.home_lng;
		void speciesQuery();
		void sex;
		void size;
		void sort;
		void q;
		untrack(() => {
			void load(true);
		});
	});

	$effect(() => {
		if (!sentinel) return;
		const node = sentinel;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting) && hasMore && !loading) {
					void load(false);
				}
			},
			{ rootMargin: "240px" },
		);
		observer.observe(node);
		return () => observer.disconnect();
	});

	async function widen() {
		const current = user?.max_range_km ?? 25;
		const next = RANGE_STOPS.find((stop) => stop > current) ?? null;
		await fetch("/api/users/me", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ max_range_km: next }),
		});
		await invalidateAll();
	}

	function selectOption(option: { id: string; label: string }) {
		return { value: option.id, label: option.label };
	}

	function sexSelectOptions() {
		return [{ value: "", label: m.app_search_all() }, ...sexOptions().map(selectOption)];
	}

	function sizeSelectOptions() {
		return [{ value: "", label: m.app_search_all() }, ...sizeOptions().map(selectOption)];
	}

	function sortOptions() {
		return [
			{ value: "best", label: m.app_search_sort_best() },
			{ value: "distance", label: m.app_search_sort_distance() },
			{ value: "new", label: m.app_search_sort_new() },
		];
	}

	function clearFilters() {
		q = "";
		sex = "";
		size = "";
		setSelectedSpecies([]);
	}
</script>

<div class="flex flex-col gap-4">
	<h1 class="text-2xl font-black tracking-tight text-sand-950">{m.app_catalog_title()}</h1>

	<form
		class="grid gap-4 sm:grid-cols-2 xl:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))] xl:items-end"
		onsubmit={(event) => {
			event.preventDefault();
			void load(true);
		}}
	>
		<Input
			id="catalog-q"
			label={m.app_search_query()}
			bind:value={q}
			class="sm:col-span-2 xl:col-span-1"
		/>
		<Select
			id="catalog-sex"
			label={m.app_search_sex()}
			options={sexSelectOptions()}
			bind:value={sex}
		/>
		<Select
			id="catalog-size"
			label={m.app_search_size()}
			options={sizeSelectOptions()}
			bind:value={size}
		/>
		<Select
			id="catalog-sort"
			label={m.app_search_sort()}
			options={sortOptions()}
			bind:value={sort}
		/>
	</form>

	{#if error}
		<p class="text-sm text-coral-700">{m.app_empty_error_text()}</p>
		<Button variant="outline" size="sm" onclick={() => void load(true)}>{m.app_retry()}</Button>
	{:else if !loading && animals.length === 0}
		<div class="rounded-3xl border-2 border-dashed border-sand-300 bg-white p-8 text-center">
			{#if hasExtraFilters}
				<p class="text-xl font-bold text-sand-900">{m.app_empty_filters_title()}</p>
				<p class="mt-2 text-sm text-sand-700">{m.app_empty_filters_text({ range: rangeLabel })}</p>
				<div class="mt-4 flex flex-wrap justify-center gap-2">
					<Button variant="outline" size="sm" onclick={() => void widen()}
						>{m.app_widen_range()}</Button
					>
					<Button variant="ghost" size="sm" onclick={clearFilters}>{m.app_clear_species()}</Button>
				</div>
			{:else if total === 0 && inRange === 0 && outsideRange === 0}
				<p class="text-xl font-bold text-sand-900">{m.app_empty_catalog_title()}</p>
				<p class="mt-2 text-sm text-sand-700">{m.app_empty_catalog_text()}</p>
			{:else}
				<p class="text-xl font-bold text-sand-900">{m.app_empty_filters_title()}</p>
				<p class="mt-2 text-sm text-sand-700">{m.app_empty_filters_text({ range: rangeLabel })}</p>
				<div class="mt-4">
					<Button variant="outline" size="sm" onclick={() => void widen()}
						>{m.app_widen_range()}</Button
					>
				</div>
			{/if}
		</div>
	{:else}
		<div class="text-sm text-sand-600 tabular-nums">
			{m.app_catalog_count({ shown: String(animals.length), total: String(total) })}
		</div>
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{#each animals as animal (animal.id)}
				<AnimalCard {animal} from="catalog" />
			{/each}
		</div>
		{#if hasMore}
			<div bind:this={sentinel} class="flex justify-center py-6">
				{#if loading}
					<Spinner class="size-6 text-coral-600" />
				{/if}
			</div>
		{/if}
	{/if}
</div>
