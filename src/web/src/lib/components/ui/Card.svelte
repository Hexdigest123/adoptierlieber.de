<script lang="ts">
	import type { Snippet } from "svelte";

	type Props = {
		/** Darker border on hover/focus; use when the card is interactive. */
		focusable?: boolean;
		padding?: "none" | "sm" | "md" | "lg";
		children: Snippet;
		class?: string;
	};

	let { focusable = false, padding = "md", children, class: className = "" }: Props = $props();

	const paddings = {
		none: "",
		sm: "p-4",
		md: "p-6",
		lg: "p-8",
	};
</script>

<div
	class="rounded-2xl border border-sand-200 bg-white {paddings[padding]} {focusable
		? 'transition-colors focus-within:border-sand-400 hover:border-sand-400'
		: ''} {className}"
>
	{@render children()}
</div>
