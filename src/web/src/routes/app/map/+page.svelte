<script lang="ts">
	import { onMount, untrack } from "svelte";
	import type { Circle, LayerGroup, Map as LeafletMap } from "leaflet";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import { getLocale } from "$lib/paraglide/runtime";
	import { speciesQuery } from "$lib/app/filters.svelte";
	import { withFrom } from "$lib/app/return";
	import { ageLabel, coverPhoto, distanceLabel, speciesLabel } from "$lib/app/format";
	import type { ListEnvelope, PublicAnimal } from "$lib/types/catalog";
	import { listItems } from "$lib/types/catalog";
	import AnimalPhoto from "$lib/components/app/AnimalPhoto.svelte";
	import "leaflet/dist/leaflet.css";

	type LeafletApi = typeof import("leaflet");

	const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
	const TILE_ATTRIBUTION =
		'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

	let container: HTMLDivElement | undefined = $state();
	let map = $state<LeafletMap | undefined>(undefined);
	let leaflet = $state<LeafletApi | undefined>(undefined);
	let markers = $state<LayerGroup | undefined>(undefined);
	let circle = $state<Circle | undefined>(undefined);
	let animals = $state<PublicAnimal[]>([]);
	let viewport = $state<PublicAnimal[]>([]);
	let loading = $state(true);
	let error = $state(false);

	const user = $derived(page.data.user);
	const locale = $derived(getLocale());
	const origin = $derived(
		user?.home_lat != null && user?.home_lng != null
			? { lat: user.home_lat, lng: user.home_lng }
			: null,
	);

	function escapeHtml(value: string): string {
		return value
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;");
	}

	async function loadAnimals() {
		loading = true;
		const params = new URLSearchParams({ mode: "map", per_page: "50", sort: "distance" });
		const species = speciesQuery();
		if (species) params.set("species", species);
		error = false;
		try {
			const res = await fetch(`/api/animals?${params}`);
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
			placeMarkers();
			updateViewport();
		}
	}

	function popupHtml(animal: PublicAnimal): string {
		const photo = coverPhoto(animal.photos) ?? "";
		const href = withFrom(resolve(`/app/animals/${animal.id}`), "map");
		return `<div class="shelter-map-popup shelter-map-popup-animal">
			${photo ? `<img src="${escapeHtml(photo)}" alt="" width="224" height="144" />` : ""}
			<div class="shelter-map-popup-body">
				<p class="shelter-map-popup-title">${escapeHtml(animal.name)}<span>, ${escapeHtml(ageLabel(animal.age_months, animal.age_unknown))}</span></p>
				<p class="shelter-map-popup-meta">${escapeHtml(speciesLabel(animal.species))} ${escapeHtml(distanceLabel(animal.distance_km, animal.shelter.city))}</p>
				<p class="shelter-map-popup-names">${escapeHtml(m.app_detail_at_shelter({ shelter: animal.shelter.org_name }))}</p>
				<a class="shelter-map-popup-cta" href="${escapeHtml(href)}">${escapeHtml(m.app_map_details())}</a>
			</div>
		</div>`;
	}

	function groupPopupHtml(group: PublicAnimal[]): string {
		const shelter = group[0].shelter;
		const items = group
			.map((animal) => {
				const photo = coverPhoto(animal.photos) ?? "";
				const href = withFrom(resolve(`/app/animals/${animal.id}`), "map");
				return `<li>
					<a class="shelter-map-popup-row" href="${escapeHtml(href)}">
						${photo ? `<img src="${escapeHtml(photo)}" alt="" width="40" height="40" />` : `<span class="shelter-map-popup-row-ph"></span>`}
						<span>
							<span class="shelter-map-popup-row-name">${escapeHtml(animal.name)}</span>
							<span class="shelter-map-popup-row-meta">${escapeHtml(speciesLabel(animal.species))} · ${escapeHtml(ageLabel(animal.age_months, animal.age_unknown))}</span>
						</span>
					</a>
				</li>`;
			})
			.join("");
		return `<div class="shelter-map-popup shelter-map-popup-group">
			<div class="shelter-map-popup-body">
				<p class="shelter-map-popup-title">${escapeHtml(shelter.org_name)}</p>
				<p class="shelter-map-popup-meta">${escapeHtml(m.showcase_map_animal_count({ count: group.length }))}</p>
				<ul class="shelter-map-popup-list">${items}</ul>
			</div>
		</div>`;
	}

	function placeMarkers() {
		if (!map || !leaflet || !markers) return;
		const L = leaflet;
		markers.clearLayers();
		if (circle) {
			circle.remove();
			circle = undefined;
		}

		const groups = new Map<string, PublicAnimal[]>();
		for (const animal of animals) {
			if (animal.lat == null || animal.lng == null) continue;
			const key = animal.shelter.id || `${animal.lat.toFixed(5)},${animal.lng.toFixed(5)}`;
			const bucket = groups.get(key) ?? [];
			bucket.push(animal);
			groups.set(key, bucket);
		}

		for (const group of groups.values()) {
			const base = group[0];
			if (base.lat == null || base.lng == null) continue;
			const photo = coverPhoto(base.photos);
			const title = group.length > 1 ? `${base.shelter.org_name} (${group.length})` : base.name;
			const icon = L.divIcon({
				className: "shelter-map-pin",
				html: `<span class="shelter-map-animal" title="${escapeHtml(title)}">${
					photo
						? `<img src="${escapeHtml(photo)}" alt="" width="44" height="44" />`
						: `<span class="sr-only">${escapeHtml(title)}</span>`
				}${group.length > 1 ? `<span class="shelter-map-count">${group.length}</span>` : ""}</span>`,
				iconSize: [48, 48],
				iconAnchor: [24, 24],
				popupAnchor: [0, -26],
			});
			L.marker([base.lat, base.lng], {
				icon,
				title,
				alt: title,
				zIndexOffset: 400,
			})
				.bindPopup(group.length === 1 ? popupHtml(base) : groupPopupHtml(group), {
					maxWidth: group.length === 1 ? 240 : 260,
				})
				.addTo(markers);
		}

		if (origin && user?.max_range_km != null) {
			circle = L.circle([origin.lat, origin.lng], {
				radius: user.max_range_km * 1000,
				color: "#c74626",
				weight: 2,
				fillColor: "#c74626",
				fillOpacity: 0.08,
			}).addTo(map);
		}

		if (origin) {
			L.circleMarker([origin.lat, origin.lng], {
				radius: 7,
				color: "#27211d",
				weight: 2,
				fillColor: "#fff",
				fillOpacity: 1,
			})
				.bindPopup(m.app_map_you())
				.addTo(markers);
		}

		const pts = animals
			.filter((a) => a.lat != null && a.lng != null)
			.map((a) => [a.lat as number, a.lng as number] as [number, number]);
		if (pts.length > 0) {
			map.fitBounds(pts, { padding: [40, 40], maxZoom: 12 });
		} else if (origin) {
			map.setView([origin.lat, origin.lng], 9);
		} else {
			map.setView([51.16, 10.45], 4);
		}
	}

	function updateViewport() {
		if (!map) {
			viewport = animals;
			return;
		}
		const bounds = map.getBounds();
		viewport = animals.filter(
			(animal) =>
				animal.lat != null && animal.lng != null && bounds.contains([animal.lat, animal.lng]),
		);
	}

	onMount(() => {
		let destroyed = false;
		void import("leaflet").then((module) => {
			const loaded = module as LeafletApi & { default?: LeafletApi };
			const L = loaded.default ?? loaded;
			if (destroyed || !container) return;
			leaflet = L;
			map = L.map(container, {
				center: origin ? [origin.lat, origin.lng] : [51.16, 10.45],
				zoom: origin ? 9 : 4,
				minZoom: 2,
				maxZoom: 16,
			});
			markers = L.layerGroup().addTo(map);
			L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION }).addTo(map);
			map.on("moveend", updateViewport);
			requestAnimationFrame(() => map?.invalidateSize());
		});
		return () => {
			destroyed = true;
			map?.remove();
			map = undefined;
			markers = undefined;
			leaflet = undefined;
		};
	});

	$effect(() => {
		void locale;
		void speciesQuery();
		void user?.max_range_km;
		void user?.home_lat;
		if (map) {
			untrack(() => {
				void loadAnimals();
			});
		}
	});
</script>

<h1 class="sr-only">{m.app_tab_map()}</h1>

{#if !origin}
	<p class="mb-3 rounded-2xl border border-sand-200 bg-white px-4 py-3 text-sm text-sand-800">
		{m.app_map_set_origin()}
	</p>
{/if}

<div
	bind:this={container}
	class="shelter-map isolate h-[22rem] w-full overflow-hidden rounded-3xl border border-sand-200 sm:h-[32rem]"
	role="region"
	aria-label={m.showcase_map_label()}
></div>

<section class="mt-4" aria-labelledby="map-list-title">
	<h2 id="map-list-title" class="text-sm font-bold text-sand-900">{m.app_map_list()}</h2>
	{#if loading}
		<p class="mt-2 text-sm text-sand-600">…</p>
	{:else if error}
		<p class="mt-2 text-sm text-coral-700">{m.error_generic()}</p>
	{:else if viewport.length === 0}
		<p class="mt-2 text-sm text-sand-600">{m.app_map_empty()}</p>
	{:else}
		<ul class="mt-2 flex flex-col gap-2">
			{#each viewport as animal (animal.id)}
				<li>
					<a
						href={withFrom(resolve(`/app/animals/${animal.id}`), "map")}
						class="flex items-center gap-3 rounded-2xl border border-sand-200 bg-white p-2 focus-ring hover:border-coral-300"
					>
						<div class="size-14 shrink-0 overflow-hidden rounded-xl bg-peach-100">
							<AnimalPhoto src={coverPhoto(animal.photos)} alt="" />
						</div>
						<div class="min-w-0">
							<p class="truncate font-bold text-sand-950">{animal.name}</p>
							<p class="text-sm text-coral-700">
								{speciesLabel(animal.species)}
								{distanceLabel(animal.distance_km, animal.shelter.city)}
							</p>
						</div>
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>

<style>
	.shelter-map :global(.leaflet-container) {
		height: 100%;
		width: 100%;
		font-family: inherit;
		background: var(--color-peach-50);
	}
	.shelter-map :global(.leaflet-control-attribution) {
		background: rgb(255 255 255 / 0.86);
		color: var(--color-sand-600);
		font-size: 0.65rem;
	}
	.shelter-map :global(.leaflet-popup-content-wrapper) {
		overflow: hidden;
		border: 1px solid var(--color-sand-200);
		border-radius: 1rem;
		padding: 0;
		box-shadow: 0 8px 24px rgb(39 33 29 / 0.12);
	}
	.shelter-map :global(.leaflet-popup-content) {
		margin: 0;
		width: auto !important;
		line-height: 1.4;
	}
	.shelter-map :global(.shelter-map-pin) {
		background: none;
		border: none;
	}
	.shelter-map :global(.shelter-map-animal) {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		width: 48px;
		height: 48px;
		border: 3px solid white;
		border-radius: 9999px;
		background: var(--color-peach-100);
		box-shadow: 0 4px 12px rgb(39 33 29 / 0.2);
	}
	.shelter-map :global(.shelter-map-animal img) {
		width: 100%;
		height: 100%;
		border-radius: 9999px;
		object-fit: cover;
	}
	.shelter-map :global(.shelter-map-count) {
		position: absolute;
		right: -6px;
		bottom: -6px;
		min-width: 1.25rem;
		padding: 0 0.3rem;
		border: 2px solid white;
		border-radius: 9999px;
		background: var(--color-coral-600);
		color: white;
		font-size: 0.65rem;
		font-weight: 700;
		line-height: 1.25rem;
		text-align: center;
	}
	.shelter-map :global(.shelter-map-popup-animal) {
		width: 14rem;
	}
	.shelter-map :global(.shelter-map-popup-animal img) {
		display: block;
		width: 100%;
		height: 9rem;
		object-fit: cover;
	}
	.shelter-map :global(.shelter-map-popup-body) {
		padding: 1rem;
	}
	.shelter-map :global(.shelter-map-popup-title) {
		margin: 0;
		font-size: 1rem;
		font-weight: 700;
		color: var(--color-sand-950);
	}
	.shelter-map :global(.shelter-map-popup-title span) {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-sand-600);
	}
	.shelter-map :global(.shelter-map-popup-meta) {
		margin: 0.125rem 0 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-coral-700);
	}
	.shelter-map :global(.shelter-map-popup-names) {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-sand-600);
	}
	.shelter-map :global(.shelter-map-popup-cta) {
		display: inline-block;
		margin-top: 0.5rem;
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-coral-700);
	}
	.shelter-map :global(.shelter-map-popup-group) {
		width: 16rem;
	}
	.shelter-map :global(.shelter-map-popup-list) {
		margin: 0.75rem 0 0;
		padding: 0;
		max-height: 14rem;
		overflow-y: auto;
		list-style: none;
	}
	.shelter-map :global(.shelter-map-popup-row) {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.35rem 0;
		color: inherit;
		text-decoration: none;
	}
	.shelter-map :global(.shelter-map-popup-row img),
	.shelter-map :global(.shelter-map-popup-row-ph) {
		flex-shrink: 0;
		width: 2.5rem;
		height: 2.5rem;
		border-radius: 0.75rem;
		object-fit: cover;
		background: var(--color-peach-100);
	}
	.shelter-map :global(.shelter-map-popup-row-name) {
		display: block;
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-sand-950);
	}
	.shelter-map :global(.shelter-map-popup-row-meta) {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-sand-600);
	}
</style>
