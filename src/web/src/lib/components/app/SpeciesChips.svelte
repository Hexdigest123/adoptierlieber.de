<script lang="ts">
	import { m } from "$lib/paraglide/messages";
	import { SPECIES_CHIPS } from "$lib/types/catalog";
	import { chipActive, toggleChip } from "$lib/app/filters.svelte";
	import { chipLabel } from "$lib/app/format";

	let { onchange, wrap = false }: { onchange?: () => void; wrap?: boolean } = $props();
</script>

<div
	class={wrap ? "flex flex-wrap gap-2" : "flex gap-2 overflow-x-auto pb-1"}
	role="group"
	aria-label={m.app_species_filter()}
>
	{#each SPECIES_CHIPS as chip (chip.id)}
		<button
			type="button"
			aria-pressed={chipActive(chip.id)}
			class="shrink-0 cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold focus-ring {chipActive(
				chip.id,
			)
				? 'border-coral-600 bg-coral-600 text-white'
				: 'border-sand-200 bg-white text-sand-700 hover:border-coral-300'}"
			onclick={() => {
				toggleChip(chip.id);
				onchange?.();
			}}
		>
			{chipLabel(chip.id)}
		</button>
	{/each}
</div>
