<script lang="ts">
	import { onMount } from "svelte";
	import type { LayerGroup, Map as LeafletMap } from "leaflet";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import { getLocale } from "$lib/paraglide/runtime";
	import type { ShowcaseCard } from "$lib/data/excerpts";
	import "leaflet/dist/leaflet.css";

	let {
		cards,
		loggedIn = false,
	}: {
		cards: ShowcaseCard[];
		loggedIn?: boolean;
	} = $props();

	type LeafletApi = typeof import("leaflet");

	const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
	const TILE_ATTRIBUTION =
		'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

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

	const ctaHref = $derived(loggedIn ? resolve("/app") : resolve("/register"));
	const ctaLabel = $derived(loggedIn ? m.showcase_cta_app() : m.showcase_map_login());

	function animalPopupHtml(animal: ShowcaseCard): string {
		return `<div class="shelter-map-popup shelter-map-popup-animal">
			${animal.image ? `<img src="${escapeHtml(animal.image)}" alt="" width="224" height="144" />` : ""}
			<div class="shelter-map-popup-body">
				<p class="shelter-map-popup-title">${escapeHtml(animal.name)}<span>, ${escapeHtml(animal.age)}</span></p>
				<p class="shelter-map-popup-meta">${escapeHtml(animal.species)}</p>
				<p class="shelter-map-popup-text">${escapeHtml(animal.tagline)}</p>
				<p class="shelter-map-popup-names">${escapeHtml(m.showcase_map_at_shelter({ shelter: animal.shelterName }))}</p>
				<a class="shelter-map-popup-cta" href="${escapeHtml(ctaHref)}">${escapeHtml(ctaLabel)}</a>
			</div>
		</div>`;
	}

	function groupPopupHtml(group: ShowcaseCard[]): string {
		const shelter = group[0];
		const items = group
			.map(
				(animal) => `<li class="shelter-map-popup-row">
					${animal.image ? `<img src="${escapeHtml(animal.image)}" alt="" width="40" height="40" />` : `<span class="shelter-map-popup-row-ph"></span>`}
					<span>
						<span class="shelter-map-popup-row-name">${escapeHtml(animal.name)}</span>
						<span class="shelter-map-popup-row-meta">${escapeHtml(animal.species)} · ${escapeHtml(animal.age)}</span>
					</span>
				</li>`,
			)
			.join("");
		return `<div class="shelter-map-popup shelter-map-popup-group">
			<div class="shelter-map-popup-body">
				<p class="shelter-map-popup-title">${escapeHtml(shelter.shelterName)}</p>
				<p class="shelter-map-popup-meta">${escapeHtml(m.showcase_map_animal_count({ count: group.length }))}</p>
				<ul class="shelter-map-popup-list">${items}</ul>
				<a class="shelter-map-popup-cta" href="${escapeHtml(ctaHref)}">${escapeHtml(ctaLabel)}</a>
			</div>
		</div>`;
	}

	function placeMarkers() {
		if (!map || !leaflet || !markers) return;
		const L = leaflet;

		markers.clearLayers();

		const groups = new Map<string, ShowcaseCard[]>();
		for (const animal of cards) {
			if (animal.lat == null || animal.lng == null) continue;
			const key = animal.shelterId || `${animal.lat.toFixed(5)},${animal.lng.toFixed(5)}`;
			const bucket = groups.get(key) ?? [];
			bucket.push(animal);
			groups.set(key, bucket);
		}

		for (const group of groups.values()) {
			const base = group[0];
			if (base.lat == null || base.lng == null) continue;
			const title = group.length > 1 ? `${base.shelterName} (${group.length})` : base.name;
			const icon = L.divIcon({
				className: "shelter-map-pin",
				html: `<span class="shelter-map-animal" title="${escapeHtml(title)}">${
					base.image
						? `<img src="${escapeHtml(base.image)}" alt="" width="44" height="44" />`
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
				.bindPopup(group.length === 1 ? animalPopupHtml(base) : groupPopupHtml(group), {
					maxWidth: group.length === 1 ? 240 : 260,
				})
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
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
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
