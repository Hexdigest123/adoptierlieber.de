<script lang="ts">
	import type { HTMLTextareaAttributes } from "svelte/elements";

	type Props = {
		label: string;
		error?: string;
		hint?: string;
		id: string;
		class?: string;
	} & Omit<HTMLTextareaAttributes, "id" | "class">;

	let {
		label,
		error,
		hint,
		id,
		class: className = "",
		required,
		rows = 5,
		...rest
	}: Props = $props();

	const describedBy = $derived(
		[error ? `${id}-error` : null, hint && !error ? `${id}-hint` : null]
			.filter(Boolean)
			.join(" ") || undefined,
	);
</script>

<div class="flex flex-col gap-1.5 {className}">
	<label for={id} class="text-sm font-semibold text-sand-900">
		{label}
		{#if required}<span class="text-coral-600" aria-hidden="true"> *</span>{/if}
	</label>
	<textarea
		{id}
		{required}
		{rows}
		aria-invalid={error ? true : undefined}
		aria-describedby={describedBy}
		class="w-full rounded-xl border bg-white px-3.5 py-2.5 text-base text-sand-900 focus-ring placeholder:text-sand-400 {error
			? 'border-coral-600'
			: 'border-sand-300 hover:border-sand-400'}"
		{...rest}></textarea>
	{#if error}
		<p id="{id}-error" class="text-sm text-coral-700">{error}</p>
	{:else if hint}
		<p id="{id}-hint" class="text-sm text-sand-600">{hint}</p>
	{/if}
</div>
