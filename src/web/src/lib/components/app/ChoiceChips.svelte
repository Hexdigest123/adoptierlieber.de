<script lang="ts" generics="T extends string">
	type Option = { id: T; label: string };

	let {
		legend,
		options,
		value = $bindable(null),
		allLabel,
	}: {
		legend: string;
		options: Option[];
		value?: T | null;
		/** Adds a leading chip that clears the choice. */
		allLabel?: string;
	} = $props();

	const chips = $derived<{ id: T | null; label: string }[]>(
		allLabel ? [{ id: null, label: allLabel }, ...options] : options,
	);
</script>

<!-- Single-choice chip row; tapping the active chip clears it. -->
<fieldset>
	<legend class="mb-2 text-sm font-semibold text-sand-900">{legend}</legend>
	<div class="flex flex-wrap gap-2">
		{#each chips as option (String(option.id))}
			<button
				type="button"
				aria-pressed={value === option.id}
				class="rounded-full border px-3 py-1.5 text-sm font-semibold focus-ring {value === option.id
					? 'border-coral-600 bg-coral-600 text-white'
					: 'border-sand-200 text-sand-800'}"
				onclick={() => (value = value === option.id ? null : option.id)}
			>
				{option.label}
			</button>
		{/each}
	</div>
</fieldset>
