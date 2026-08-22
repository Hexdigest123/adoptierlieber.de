<script lang="ts">
	import type { HTMLInputAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";

	type Props = {
		label: string;
		/** Error message; renders below the input and wires aria-invalid/describedby. */
		error?: string;
		/** Neutral helper text, hidden when error is set. */
		hint?: string;
		icon?: Snippet;
		id: string;
		class?: string;
	} & Omit<HTMLInputAttributes, "id" | "class">;

	let { label, error, hint, icon, id, class: className = "", required, ...rest }: Props = $props();

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
	<div class="relative">
		{#if icon}
			<span
				class="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-sand-500"
				aria-hidden="true"
			>
				{@render icon()}
			</span>
		{/if}
		<input
			{id}
			{required}
			aria-invalid={error ? true : undefined}
			aria-describedby={describedBy}
			class="h-11 w-full rounded-xl border bg-white px-3.5 text-base text-sand-900 focus-ring placeholder:text-sand-400 {icon
				? 'pl-10'
				: ''} {error ? 'border-coral-600' : 'border-sand-300 hover:border-sand-400'}"
			{...rest}
		/>
	</div>
	{#if error}
		<p id="{id}-error" class="text-sm text-coral-700">{error}</p>
	{:else if hint}
		<p id="{id}-hint" class="text-sm text-sand-600">{hint}</p>
	{/if}
</div>
