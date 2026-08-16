<script lang="ts">
	import type { HTMLInputAttributes } from "svelte/elements";
	import type { Snippet } from "svelte";

	type Props = {
		/** Label content; snippet allows inline links (e.g. privacy policy). */
		children: Snippet;
		error?: string;
		id: string;
		class?: string;
	} & Omit<HTMLInputAttributes, "id" | "class" | "type" | "children">;

	let { children, error, id, class: className = "", required, ...rest }: Props = $props();
</script>

<div class="flex flex-col gap-1.5 {className}">
	<div class="flex items-start gap-3">
		<input
			{id}
			type="checkbox"
			{required}
			aria-invalid={error ? true : undefined}
			aria-describedby={error ? `${id}-error` : undefined}
			class="mt-0.5 size-5 shrink-0 cursor-pointer rounded border-sand-300 accent-coral-600 focus-ring"
			{...rest}
		/>
		<label for={id} class="text-sm leading-relaxed text-sand-700">
			{@render children()}
			{#if required}<span class="text-coral-600" aria-hidden="true"> *</span>{/if}
		</label>
	</div>
	{#if error}
		<p id="{id}-error" class="text-sm text-coral-700">{error}</p>
	{/if}
</div>
