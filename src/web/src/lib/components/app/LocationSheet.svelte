<script lang="ts">
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import type { GeocodeHit } from "$lib/types/catalog";
	import { dialog } from "$lib/dialog";

	let {
		open = $bindable(false),
		onboard = false,
		onsaved,
		onskip,
	}: {
		open?: boolean;
		onboard?: boolean;
		onsaved: () => void;
		onskip: () => void;
	} = $props();

	function dismiss() {
		if (onboard) {
			void skip();
			return;
		}
		open = false;
	}

	let query = $state("");
	let hits = $state<GeocodeHit[]>([]);
	let error = $state("");
	let loading = $state(false);
	let gpsFail = $state(false);

	async function searchPlace() {
		error = "";
		hits = [];
		const q = query.trim();
		if (!q) return;
		loading = true;
		try {
			const res = await fetch("/api/geo/search", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ q }),
			});
			if (!res.ok) {
				error = m.app_location_none();
				return;
			}
			const data = (await res.json()) as { items: GeocodeHit[] };
			hits = data.items;
			if (hits.length === 0) error = m.app_location_none();
			if (hits.length === 1) await pick(hits[0]);
		} finally {
			loading = false;
		}
	}

	async function persistOnboarded() {
		try {
			await fetch("/api/users/me", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ preferences: { onboarded: true } }),
			});
		} catch {
			// onboard flag is best-effort
		}
	}

	async function pick(hit: GeocodeHit) {
		const res = await fetch("/api/users/me", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				home_query: query.trim() || hit.label,
				home_label: hit.label,
				home_country: hit.country,
				home_lat: hit.lat,
				home_lng: hit.lng,
				location_precision: "place",
				max_range_km: 25,
			}),
		});
		if (!res.ok) {
			error = m.error_generic();
			return;
		}
		await persistOnboarded();
		open = false;
		onsaved();
	}

	async function skip() {
		try {
			await fetch("/api/users/me", {
				method: "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					home_query: null,
					home_label: null,
					home_country: null,
					home_lat: null,
					home_lng: null,
					location_precision: null,
					max_range_km: null,
				}),
			});
		} catch {
			// skip still closes
		}
		await persistOnboarded();
		open = false;
		onskip();
	}

	function useGps() {
		gpsFail = false;
		if (!navigator.geolocation) {
			gpsFail = true;
			return;
		}
		navigator.geolocation.getCurrentPosition(
			async (pos) => {
				const res = await fetch("/api/users/me", {
					method: "PATCH",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						home_lat: pos.coords.latitude,
						home_lng: pos.coords.longitude,
						location_precision: "gps",
						max_range_km: 25,
					}),
				});
				if (!res.ok) {
					gpsFail = true;
					return;
				}
				await persistOnboarded();
				open = false;
				onsaved();
			},
			() => {
				gpsFail = true;
			},
			{ enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
		);
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
		<button
			type="button"
			class="absolute inset-0 bg-sand-950/40"
			aria-label={m.dialog_close()}
			onclick={dismiss}
		></button>
		<div
			class="relative z-10 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-sand-200 bg-white p-6 shadow-lg sm:rounded-3xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="loc-title"
			use:dialog={dismiss}
		>
			<h2 id="loc-title" class="text-xl font-black text-sand-950">{m.app_location_title()}</h2>
			<p class="mt-2 text-sm text-sand-700">{m.app_location_text()}</p>

			<form
				class="mt-5 flex flex-col gap-3"
				onsubmit={(event) => {
					event.preventDefault();
					void searchPlace();
				}}
			>
				<Input
					id="home-place"
					label={m.app_location_place()}
					hint={m.app_location_place_hint()}
					bind:value={query}
					autocomplete="postal-code"
				/>
				<Button type="submit" {loading} fullWidth>{m.app_location_search()}</Button>
			</form>

			{#if error}
				<p class="mt-3 text-sm text-coral-700">{error}</p>
			{/if}

			{#if hits.length > 1}
				<p class="mt-4 text-sm font-semibold text-sand-900">{m.app_location_disambiguate()}</p>
				<ul class="mt-2 flex flex-col gap-2">
					{#each hits as hit (hit.label + hit.lat)}
						<li>
							<button
								type="button"
								class="w-full cursor-pointer rounded-xl border border-sand-200 px-4 py-3 text-left text-sm font-semibold text-sand-900 focus-ring hover:border-coral-300"
								onclick={() => void pick(hit)}
							>
								{hit.label}{hit.country ? ` ${hit.country}` : ""}
							</button>
						</li>
					{/each}
				</ul>
			{/if}

			<div class="mt-6 flex flex-col gap-3">
				<Button variant="secondary" fullWidth onclick={useGps}>{m.app_location_gps()}</Button>
				<p class="text-xs text-sand-600">{m.app_location_gps_hint()}</p>
				{#if gpsFail}
					<p class="text-sm text-coral-700">{m.app_location_gps_fail()}</p>
				{/if}
				<Button variant="ghost" fullWidth onclick={() => void skip()}
					>{m.app_location_skip()}</Button
				>
			</div>
		</div>
	</div>
{/if}
