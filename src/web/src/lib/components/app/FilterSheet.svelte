<script lang="ts">
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import Select from "$lib/components/ui/Select.svelte";
	import SpeciesChips from "$lib/components/app/SpeciesChips.svelte";
	import { RANGE_STOPS } from "$lib/types/catalog";
	import { dialog } from "$lib/dialog";

	let {
		open = $bindable(false),
		rangeKm = null,
		inRange = null,
		placeLabel = "",
		showRange = true,
		rangeHint = "",
		showLocation = false,
		onchange,
		onapply,
		onlocation,
	}: {
		open?: boolean;
		rangeKm?: number | null;
		inRange?: number | null;
		placeLabel?: string;
		showRange?: boolean;
		/** Set while there are no coordinates: replaces the range control, nothing to measure from. */
		rangeHint?: string;
		showLocation?: boolean;
		onchange?: () => void;
		onapply?: (next: number | null) => void;
		onlocation?: () => void;
	} = $props();

	let draft = $state<number | null>(null);
	const rangeActive = $derived(showRange && !rangeHint);

	$effect(() => {
		if (open) draft = rangeKm;
		void rangeKm;
	});

	function label(value: number | null): string {
		return value == null ? m.app_range_unlimited() : m.app_range_km({ count: value });
	}

	function rangeOptions() {
		// A saved range between the stops stays selectable instead of rendering an empty select.
		const stops: number[] = [...RANGE_STOPS];
		if (draft != null && !stops.includes(draft)) stops.push(draft);
		stops.sort((a, b) => a - b);
		return [
			...stops.map((stop) => ({ value: String(stop), label: m.app_range_km({ count: stop }) })),
			{ value: "", label: m.app_range_unlimited() },
		];
	}

	function apply() {
		onapply?.(draft);
		open = false;
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
		<button
			type="button"
			class="absolute inset-0 bg-sand-950/40"
			aria-label={m.dialog_close()}
			onclick={() => (open = false)}
		></button>
		<div
			class="relative z-10 max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl border border-sand-200 bg-white p-6 shadow-lg sm:rounded-3xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="filters-title"
			use:dialog={() => (open = false)}
		>
			<h2 id="filters-title" class="text-lg font-bold text-sand-950">{m.app_filters_title()}</h2>

			{#if showLocation}
				<div class="mt-5">
					<p class="text-sm font-semibold text-sand-900">{m.app_location_place()}</p>
					<button
						type="button"
						class="mt-2 flex min-h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-full border border-sand-200 bg-white px-4 text-sm font-semibold text-sand-800 focus-ring hover:border-coral-300"
						onclick={() => onlocation?.()}
					>
						<span class="min-w-0 truncate">{placeLabel}</span>
						<span class="shrink-0 text-coral-700">{m.app_filters_change_location()}</span>
					</button>
				</div>
			{/if}

			{#if showRange && rangeHint}
				<div class="mt-5">
					<p class="text-sm font-semibold text-sand-900">{m.app_range_title()}</p>
					<p class="mt-1 text-sm text-sand-700">{rangeHint}</p>
				</div>
			{:else if rangeActive}
				<div class="mt-5">
					<p class="text-sm font-semibold text-sand-900">{m.app_range_title()}</p>
					<p class="mt-1 text-2xl font-bold text-coral-700">{label(draft)}</p>
					{#if inRange != null}
						<p class="mt-1 text-sm text-sand-700">
							{inRange === 1
								? m.app_range_in_circle_one({ count: inRange })
								: m.app_range_in_circle({ count: inRange })}
						</p>
					{/if}
					<Select
						id="filters-range"
						class="mt-3"
						label={m.app_range_title()}
						hideLabel
						options={rangeOptions()}
						bind:value={
							() => (draft === null ? "" : String(draft)),
							(next) => (draft = next === "" ? null : Number(next))
						}
					/>
				</div>
			{/if}

			<div class="mt-5">
				<p class="mb-2 text-sm font-semibold text-sand-900">{m.app_species_filter()}</p>
				<SpeciesChips wrap {onchange} />
			</div>

			<div class="mt-6">
				{#if rangeActive}
					<Button fullWidth onclick={apply}>{m.app_range_apply()}</Button>
				{:else}
					<Button fullWidth onclick={() => (open = false)}>{m.dialog_close()}</Button>
				{/if}
			</div>
		</div>
	</div>
{/if}
