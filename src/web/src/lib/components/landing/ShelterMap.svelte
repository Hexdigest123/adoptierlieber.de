<script lang="ts">
	import { onMount } from "svelte";
	import type { LayerGroup, Map as LeafletMap } from "leaflet";
	import { m } from "$lib/paraglide/messages";
	import { getLocale } from "$lib/paraglide/runtime";
	import { animals } from "$lib/data/animals";
	import { shelterById, shelters } from "$lib/data/shelters";
	import "leaflet/dist/leaflet.css";

	type LeafletApi = typeof import("leaflet");

	const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
	const TILE_ATTRIBUTION =
		'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

	const HOUSE_SVG =
		'<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8"/><path d="M3 10a2 2 0 0 1 .709-1.528l7-6a2 2 0 0 1 2.582 0l7 6A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>';

	let container: HTMLDivElement | undefined = $state();
	let map = $state<LeafletMap | undefined>(undefined);
	let leaflet = $state<LeafletApi | undefined>(undefined);
	let markers = $state<LayerGroup | undefined>(undefined);
	const locale = $derived(getLocale());

	function escapeHtml(value: string): string {
		return value
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;");
	}

	function shelterPopupHtml(shelterId: string): string {
		const shelter = shelterById(shelterId);
		if (!shelter) return "";
		const residents = animals.filter((animal) => animal.shelterId === shelter.id);
		const names = residents.map((animal) => escapeHtml(animal.name)).join(", ");
		return `<div class="shelter-map-popup">
			<p class="shelter-map-popup-title">${escapeHtml(shelter.name)}</p>
			<p class="shelter-map-popup-meta">${escapeHtml(shelter.city)}</p>
			<p class="shelter-map-popup-text">${escapeHtml(m.showcase_map_animal_count({ count: residents.length }))}</p>
			${names ? `<p class="shelter-map-popup-names">${names}</p>` : ""}
		</div>`;
	}

	function animalPopupHtml(animalId: string): string {
		const animal = animals.find((entry) => entry.id === animalId);
		if (!animal) return "";
		const shelter = shelterById(animal.shelterId);
		return `<div class="shelter-map-popup shelter-map-popup-animal">
			<img src="${escapeHtml(animal.image)}" alt="" width="224" height="144" />
			<div class="shelter-map-popup-body">
				<p class="shelter-map-popup-title">${escapeHtml(animal.name)}<span>, ${escapeHtml(animal.age())}</span></p>
				<p class="shelter-map-popup-meta">${escapeHtml(animal.species())}</p>
				<p class="shelter-map-popup-text">${escapeHtml(animal.tagline())}</p>
				${shelter ? `<p class="shelter-map-popup-names">${escapeHtml(m.showcase_map_at_shelter({ shelter: shelter.name }))}</p>` : ""}
			</div>
		</div>`;
	}

	function placeMarkers() {
		if (!map || !leaflet || !markers) return;
		const L = leaflet;

		markers.clearLayers();

		for (const shelter of shelters) {
			const icon = L.divIcon({
				className: "shelter-map-pin",
				html: `<span class="shelter-map-shelter" title="${escapeHtml(shelter.name)}">${HOUSE_SVG}</span>`,
				iconSize: [36, 36],
				iconAnchor: [18, 18],
				popupAnchor: [0, -20],
			});
			L.marker([shelter.lat, shelter.lng], {
				icon,
				title: shelter.name,
				alt: shelter.name,
				zIndexOffset: 0,
			})
				.bindPopup(shelterPopupHtml(shelter.id), { maxWidth: 260 })
				.addTo(markers);
		}

		for (const animal of animals) {
			const icon = L.divIcon({
				className: "shelter-map-pin",
				html: `<span class="shelter-map-animal" title="${escapeHtml(animal.name)}"><img src="${escapeHtml(animal.image)}" alt="" width="44" height="44" /></span>`,
				iconSize: [48, 48],
				iconAnchor: [24, 24],
				popupAnchor: [0, -26],
			});
			L.marker([animal.lat, animal.lng], {
				icon,
				title: animal.name,
				alt: animal.name,
				zIndexOffset: 400,
			})
				.bindPopup(animalPopupHtml(animal.id), { maxWidth: 240 })
				.addTo(markers);
		}
	}

	onMount(() => {
		let destroyed = false;

		void import("leaflet").then((module) => {
			const loaded = module as LeafletApi & { default?: LeafletApi };
			const L = loaded.default ?? loaded;
			if (destroyed || !container) return;

			leaflet = L;
			map = L.map(container, {
				center: [51.16, 10.45],
				zoom: 6,
				minZoom: 5,
				maxZoom: 14,
			});
			markers = L.layerGroup().addTo(map);

			L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION }).addTo(map);
			placeMarkers();
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
		placeMarkers();
	});
</script>

<div
	bind:this={container}
	class="shelter-map isolate h-[28rem] w-full overflow-hidden rounded-3xl border border-sand-200 sm:h-[36rem]"
	role="region"
	aria-label={m.showcase_map_label()}
></div>

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

	.shelter-map :global(.leaflet-popup-tip) {
		border: 1px solid var(--color-sand-200);
		box-shadow: none;
	}

	.shelter-map :global(.leaflet-popup-close-button) {
		top: 0.35rem !important;
		right: 0.4rem !important;
		width: 1.5rem;
		height: 1.5rem;
		color: var(--color-sand-700) !important;
		font-size: 1.15rem !important;
	}

	.shelter-map :global(.shelter-map-pin) {
		background: none;
		border: none;
	}

	.shelter-map :global(.shelter-map-shelter),
	.shelter-map :global(.shelter-map-animal) {
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		overflow: hidden;
		border: 3px solid white;
		box-shadow: 0 4px 12px rgb(39 33 29 / 0.2);
	}

	.shelter-map :global(.shelter-map-shelter) {
		width: 36px;
		height: 36px;
		border-radius: 9999px;
		background: var(--color-coral-600);
		color: white;
	}

	.shelter-map :global(.shelter-map-animal) {
		width: 48px;
		height: 48px;
		border-radius: 9999px;
		background: var(--color-peach-100);
	}

	.shelter-map :global(.shelter-map-animal img) {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.shelter-map :global(.shelter-map-popup) {
		padding: 1rem;
	}

	.shelter-map :global(.shelter-map-popup-animal) {
		width: 14rem;
		padding: 0;
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

	.shelter-map :global(.shelter-map-popup-text) {
		margin: 0.5rem 0 0;
		font-size: 0.875rem;
		color: var(--color-sand-700);
	}

	.shelter-map :global(.shelter-map-popup-names) {
		margin: 0.25rem 0 0;
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--color-sand-600);
	}
</style>
