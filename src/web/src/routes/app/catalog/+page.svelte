<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import { untrack } from "svelte";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import Spinner from "$lib/components/ui/Spinner.svelte";
	import AnimalCard from "$lib/components/app/AnimalCard.svelte";
	import { selectedSpecies, setSelectedSpecies, speciesQuery } from "$lib/app/filters.svelte";
	import type { AnimalSex, AnimalSize, ListEnvelope, PublicAnimal } from "$lib/types/catalog";
	import { RANGE_STOPS } from "$lib/types/catalog";

	let q = $state("");
	let sex = $state<AnimalSex>(null);
	let size = $state<AnimalSize>(null);
	let sort = $state<"best" | "distance" | "new">("best");
	let animals = $state<PublicAnimal[]>([]);
	let pageNo = $state(1);
	let total = $state(0);
	let inRange = $state(0);
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
		const params = new URLSearchParams({
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
			total = body.total;
			inRange = body.in_range ?? body.total;
			if (reset) {
				animals = body.items;
				pageNo = 2;
			} else {
				const seen = new Set(animals.map((row) => row.id));
				animals = [...animals, ...body.items.filter((row) => !seen.has(row.id))];
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

	function clearFilters() {
		q = "";
		sex = null;
		size = null;
		setSelectedSpecies([]);
	}
</script>

<div class="flex flex-col gap-4">
	<h1 class="text-2xl font-black tracking-tight text-sand-950">{m.app_catalog_title()}</h1>

	<form
		class="grid items-end gap-3 sm:grid-cols-2 lg:grid-cols-4"
		onsubmit={(event) => {
			event.preventDefault();
			void load(true);
		}}
	>
		<Input id="catalog-q" label={m.app_search_query()} bind:value={q} />
		<label class="flex flex-col gap-1.5 text-sm font-semibold text-sand-900">
			{m.app_search_sex()}
			<select
				value={sex ?? ""}
				class="h-11 rounded-xl border border-sand-300 bg-white px-3 text-base font-normal focus-ring"
				onchange={(event) => {
					const value = event.currentTarget.value;
					sex = value === "female" || value === "male" || value === "unknown" ? value : null;
				}}
			>
				<option value="">{m.app_search_all()}</option>
				<option value="female">{m.app_sex_female()}</option>
				<option value="male">{m.app_sex_male()}</option>
				<option value="unknown">{m.app_sex_unknown()}</option>
			</select>
		</label>
		<label class="flex flex-col gap-1.5 text-sm font-semibold text-sand-900">
			{m.app_search_size()}
			<select
				value={size ?? ""}
				class="h-11 rounded-xl border border-sand-300 bg-white px-3 text-base font-normal focus-ring"
				onchange={(event) => {
					const value = event.currentTarget.value;
					size = value === "s" || value === "m" || value === "l" || value === "xl" ? value : null;
				}}
			>
				<option value="">{m.app_search_all()}</option>
				<option value="s">{m.app_size_s()}</option>
				<option value="m">{m.app_size_m()}</option>
				<option value="l">{m.app_size_l()}</option>
				<option value="xl">{m.app_size_xl()}</option>
			</select>
		</label>
		<div
			class="flex min-h-11 flex-wrap items-center gap-1 sm:col-span-2 lg:col-span-4"
			role="group"
			aria-label={m.app_search_sort()}
		>
			{#each [{ id: "best" as const, label: m.app_search_sort_best() }, { id: "distance" as const, label: m.app_search_sort_distance() }, { id: "new" as const, label: m.app_search_sort_new() }] as option (option.id)}
				<button
					type="button"
					aria-pressed={sort === option.id}
					class="rounded-full px-3 py-1.5 text-sm font-semibold focus-ring {sort === option.id
						? 'bg-coral-600 text-white'
						: 'text-sand-700 hover:bg-peach-100'}"
					onclick={() => (sort = option.id)}
				>
					{option.label}
				</button>
			{/each}
		</div>
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
			{:else if total === 0 && inRange === 0}
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
