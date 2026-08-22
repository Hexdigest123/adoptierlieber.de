<script lang="ts">
	import type { Snippet } from "svelte";
	import Card from "$lib/components/ui/Card.svelte";

	type Props = {
		title: string;
		subtitle?: string;
		wide?: boolean;
		class?: string;
		children: Snippet;
	};

	let { title, subtitle, wide = false, class: className, children }: Props = $props();

	const widthClass = className ?? (wide ? "max-w-lg" : "max-w-md");
</script>

<div class="flex flex-1 items-center justify-center bg-peach-50 px-4 py-12 sm:px-6">
	<Card class="w-full {widthClass}" padding="lg">
		<h1 class="text-2xl font-black tracking-tight text-sand-950">{title}</h1>
		{#if subtitle}
			<p class="mt-2 text-sm leading-relaxed text-sand-700">{subtitle}</p>
		{/if}
		<div class="mt-6">
			{@render children()}
		</div>
	</Card>
</div>
