<script lang="ts">
	import type { Snippet } from "svelte";

	type Props = {
		/** Extra hover lift + focus ring; use when the card is interactive. */
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
	class="rounded-2xl border border-sand-200 bg-white shadow-sm {paddings[padding]} {focusable
		? 'transition-shadow focus-within:shadow-md hover:shadow-md'
		: ''} {className}"
>
	{@render children()}
</div>
