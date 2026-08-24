<script lang="ts">
	import { onMount } from "svelte";
	import type { Control, LayerGroup, Map as LeafletMap } from "leaflet";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import { getLocale } from "$lib/paraglide/runtime";
	import type { PublicMapShelter } from "$lib/types/catalog";
	import "leaflet/dist/leaflet.css";

	let {
		shelters,
		loggedIn = false,
	}: {
		shelters: PublicMapShelter[];
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
	let zoomControl = $state<Control.Zoom | undefined>(undefined);
	const locale = $derived(getLocale());
	const interactive = $derived(shelters.length > 0);

	function escapeHtml(value: string): string {
		return value
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;")
			.replaceAll('"', "&quot;");
	}

	const ctaHref = $derived(loggedIn ? resolve("/app") : resolve("/register"));
	const ctaLabel = $derived(loggedIn ? m.showcase_cta_app() : m.showcase_map_login());

	function pinInitial(name: string): string {
		const letter = name.trim().charAt(0);
		return letter ? letter.toLocaleUpperCase(locale) : "?";
	}

	function safeWebsite(url: string | null): string | null {
		if (!url) return null;
		try {
			const parsed = new URL(url);
			if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
			return parsed.href;
		} catch {
			return null;
		}
	}

	function popupHtml(shelter: PublicMapShelter): string {
		const logo = shelter.has_logo
			? `<img src="${escapeHtml(`/api/shelters/${shelter.id}/logo`)}" alt="" width="224" height="144" />`
			: "";
		const website = safeWebsite(shelter.website);
		const websiteLink = website
			? `<a class="shelter-map-popup-web" href="${escapeHtml(website)}" target="_blank" rel="noopener noreferrer">${escapeHtml(m.showcase_map_website())}</a>`
			: "";
		return `<div class="shelter-map-popup shelter-map-popup-animal">
			${logo}
			<div class="shelter-map-popup-body">
				<p class="shelter-map-popup-title">${escapeHtml(shelter.org_name)}</p>
				<p class="shelter-map-popup-meta">${escapeHtml(shelter.city)}</p>
				<p class="shelter-map-popup-text">${escapeHtml(m.showcase_map_animal_count({ count: shelter.live_count }))}</p>
				${websiteLink}
				<a class="shelter-map-popup-cta" href="${escapeHtml(ctaHref)}">${escapeHtml(ctaLabel)}</a>
			</div>
		</div>`;
	}

	function applyInteraction() {
		if (!map || !leaflet) return;
		const L = leaflet;

		if (interactive) {
			map.dragging.enable();
			map.touchZoom.enable();
			map.scrollWheelZoom.enable();
			map.doubleClickZoom.enable();
			map.boxZoom.enable();
			map.keyboard.enable();
			if (!zoomControl) {
				zoomControl = L.control.zoom().addTo(map);
			}
			return;
		}

		map.dragging.disable();
		map.touchZoom.disable();
		map.scrollWheelZoom.disable();
		map.doubleClickZoom.disable();
		map.boxZoom.disable();
		map.keyboard.disable();
		if (zoomControl) {
			map.removeControl(zoomControl);
			zoomControl = undefined;
		}
	}

	function placeMarkers() {
		if (!map || !leaflet || !markers) return;
		const L = leaflet;

		markers.clearLayers();

		for (const shelter of shelters) {
			if (shelter.lat == null || shelter.lng == null) continue;
			const logo = shelter.has_logo
				? `<img src="${escapeHtml(`/api/shelters/${shelter.id}/logo`)}" alt="" width="44" height="44" />`
				: `<span>${escapeHtml(pinInitial(shelter.org_name))}</span>`;
			const icon = L.divIcon({
				className: "shelter-map-pin",
				html: `<span class="shelter-map-shelter" title="${escapeHtml(shelter.org_name)}">${logo}${
					shelter.live_count > 0
						? `<span class="shelter-map-count">${shelter.live_count}</span>`
						: ""
				}</span>`,
				iconSize: [36, 36],
				iconAnchor: [18, 18],
				popupAnchor: [0, -20],
			});
			L.marker([shelter.lat, shelter.lng], {
				icon,
				title: shelter.org_name,
				alt: shelter.org_name,
				zIndexOffset: 400,
			})
				.bindPopup(popupHtml(shelter), { maxWidth: 240 })
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
				dragging: false,
				touchZoom: false,
				scrollWheelZoom: false,
				doubleClickZoom: false,
				boxZoom: false,
				keyboard: false,
				zoomControl: false,
			});
			markers = L.layerGroup().addTo(map);

			L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION }).addTo(map);
			placeMarkers();
			applyInteraction();
			requestAnimationFrame(() => map?.invalidateSize());
		});

		return () => {
			destroyed = true;
			map?.remove();
			map = undefined;
			markers = undefined;
			leaflet = undefined;
			zoomControl = undefined;
		};
	});

	$effect(() => {
		void locale;
		void shelters;
		void interactive;
		placeMarkers();
		applyInteraction();
	});
</script>

<div
	bind:this={container}
	class="shelter-map isolate h-[28rem] w-full overflow-hidden rounded-3xl border border-sand-200 sm:h-[36rem] {interactive
		? 'shelter-map-live'
		: ''}"
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

	.shelter-map:not(.shelter-map-live) :global(.leaflet-container) {
		cursor: default;
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

	.shelter-map :global(.shelter-map-shelter) {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
		box-sizing: border-box;
		width: 36px;
		height: 36px;
		border: 3px solid white;
		border-radius: 9999px;
		background: var(--color-coral-600);
		color: white;
		font-size: 0.875rem;
		font-weight: 700;
		box-shadow: 0 4px 12px rgb(39 33 29 / 0.2);
	}

	.shelter-map :global(.shelter-map-shelter img) {
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

	.shelter-map :global(.shelter-map-popup-web),
	.shelter-map :global(.shelter-map-popup-cta) {
		display: inline-block;
		margin-top: 0.5rem;
		font-size: 0.875rem;
		font-weight: 700;
		color: var(--color-coral-700);
	}

	.shelter-map :global(.shelter-map-popup-web) {
		margin-right: 0.75rem;
	}
</style>
