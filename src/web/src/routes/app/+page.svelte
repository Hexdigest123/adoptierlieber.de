<script lang="ts">
	import { invalidateAll, goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { untrack } from "svelte";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import AppSwipeDeck from "$lib/components/app/AppSwipeDeck.svelte";
	import AnimalDetail from "$lib/components/app/AnimalDetail.svelte";
	import { selectedSpecies, setSelectedSpecies, speciesQuery } from "$lib/app/filters.svelte";
	import type { ListEnvelope, PublicAnimal } from "$lib/types/catalog";
	import { listItems } from "$lib/types/catalog";
	import { RANGE_STOPS } from "$lib/types/catalog";

	let animals = $state<PublicAnimal[]>([]);
	let pageNo = $state(1);
	let total = $state(0);
	let inRange = $state(0);
	let loading = $state(true);
	let error = $state(false);
	let exhausted = $state(false);
	let focused = $state<PublicAnimal | null>(null);

	const user = $derived(page.data.user);
	const rangeLabel = $derived(
		user?.max_range_km == null
			? m.app_range_unlimited()
			: m.app_range_km({ count: user.max_range_km }),
	);

	const emptyKind = $derived.by(() => {
		if (animals.length > 0) return null;
		if (error) return "error" as const;
		if (loading) return null;
		if (total === 0 && selectedSpecies().length > 0) return "filters" as const;
		if (total === 0 && inRange === 0) return "catalog" as const;
		return "caught_up" as const;
	});

	async function load(reset: boolean) {
		if (reset) {
			pageNo = 1;
			exhausted = false;
			animals = [];
		}
		if (exhausted && !reset) return;
		loading = true;
		error = false;
		const params = new URLSearchParams({
			mode: "deck",
			page: String(pageNo),
			per_page: "15",
			sort: "best",
		});
		const species = speciesQuery();
		if (species) params.set("species", species);
		try {
			const res = await fetch(`/api/animals?${params}`);
			if (!res.ok) {
				error = true;
				return;
			}
			const body = (await res.json()) as ListEnvelope<PublicAnimal>;
			const items = listItems(body);
			total = body.total;
			inRange = body.in_range ?? body.total;
			const seen = new Set(animals.map((row) => row.id));
			const next = items.filter((row) => !seen.has(row.id));
			animals = reset ? items : [...animals, ...next];
			if (items.length < body.per_page) exhausted = true;
			else pageNo += 1;
		} catch {
			error = true;
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		void user?.max_range_km;
		void user?.home_lat;
		void user?.home_lng;
		void speciesQuery();
		untrack(() => {
			void load(true);
		});
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

	async function resetSeen() {
		const res = await fetch("/api/swipes", { method: "DELETE" });
		if (!res.ok) return;
		await load(true);
	}
</script>

<h1 class="sr-only">{m.app_tab_discover()}</h1>
<div class="flex min-h-0 w-full flex-1 items-center justify-center gap-6">
	<AppSwipeDeck
		bind:animals
		{emptyKind}
		{rangeLabel}
		onneedmore={() => void load(false)}
		onretry={() => void load(true)}
		onwiden={() => void widen()}
		onresetseen={() => void resetSeen()}
		onclear={() => {
			setSelectedSpecies([]);
			void load(true);
		}}
		onfocus={(animal) => {
			if (window.matchMedia("(min-width: 1024px)").matches) focused = animal;
			else void goto(resolve(`/app/animals/${animal.id}`));
		}}
	/>
	{#if focused}
		<div class="hidden max-h-[calc(100dvh-8rem)] w-full max-w-md overflow-y-auto lg:block">
			<AnimalDetail bind:animal={focused} {user} compact showBack={false} />
		</div>
	{/if}
</div>
