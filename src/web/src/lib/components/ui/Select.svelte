<script lang="ts">
	import type { HTMLSelectAttributes } from "svelte/elements";
	import ChevronDown from "lucide-svelte/icons/chevron-down";

	type Option = { value: string; label: string };

	type Props = {
		label: string;
		options: Option[];
		/** Error message; renders below the select and wires aria-invalid/describedby. */
		error?: string;
		/** Neutral helper text, hidden when error is set. */
		hint?: string;
		/** Keeps the label for screen readers only, when the surrounding UI already names the field. */
		hideLabel?: boolean;
		id: string;
		class?: string;
		value?: string;
	} & Omit<HTMLSelectAttributes, "id" | "class" | "value" | "children">;

	let {
		label,
		options,
		error,
		hint,
		hideLabel = false,
		id,
		class: className = "",
		required,
		value = $bindable(),
		...rest
	}: Props = $props();

	const describedBy = $derived(
		[error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null]
			.filter(Boolean)
			.join(" ") || undefined,
	);
</script>

<div class="flex flex-col gap-1.5 {className}">
	<label for={id} class={hideLabel ? "sr-only" : "text-sm font-semibold text-sand-900"}>
		{label}
		{#if required}<span class="text-coral-600" aria-hidden="true"> *</span>{/if}
	</label>
	<div class="relative">
		<select
			{id}
			{required}
			bind:value
			aria-invalid={error ? true : undefined}
			aria-describedby={describedBy}
			class="h-11 w-full cursor-pointer appearance-none rounded-xl border bg-white pr-10 pl-3.5 text-base text-sand-900 focus-ring {error
				? 'border-coral-600'
				: 'border-sand-300 hover:border-sand-400'}"
			{...rest}
		>
			{#each options as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
		<ChevronDown
			class="pointer-events-none absolute top-1/2 right-3 size-5 -translate-y-1/2 text-sand-500"
			aria-hidden="true"
		/>
	</div>
	{#if error}
		<p id="{id}-error" class="text-sm text-coral-700">{error}</p>
	{:else if hint}
		<p id="{id}-hint" class="text-sm text-sand-600">{hint}</p>
	{/if}
</div>
