<script lang="ts">
	import type { LayoutProps } from "./$types";
	import AppChrome from "$lib/components/app/AppChrome.svelte";

	let { data, children }: LayoutProps = $props();
</script>

{#if data.chrome === "app" && data.user}
	<AppChrome user={data.user}>
		{@render children()}
	</AppChrome>
{:else}
	{@render children()}
{/if}
