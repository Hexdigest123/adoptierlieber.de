<script lang="ts">
	import PawPrint from "lucide-svelte/icons/paw-print";
	import { m } from "$lib/paraglide/messages";

	let {
		src = null,
		alt = "",
		class: className = "",
	}: {
		src?: string | null;
		alt?: string;
		class?: string;
	} = $props();

	let broken = $state(false);
	const showImg = $derived(Boolean(src) && !broken);
</script>

{#if showImg}
	<img
		{src}
		{alt}
		draggable="false"
		class="h-full w-full object-cover {className}"
		onerror={() => (broken = true)}
	/>
{:else}
	<div
		class="flex h-full w-full items-center justify-center bg-peach-100 text-coral-400 {className}"
		role="img"
		aria-label={alt || m.app_photo_missing()}
	>
		<PawPrint class="size-12" aria-hidden="true" />
	</div>
{/if}
