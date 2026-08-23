<script lang="ts">
	import type { LayoutProps } from "./$types";
	import "./layout.css";
	import favicon from "$lib/assets/favicon.svg";
	import Header from "$lib/components/landing/Header.svelte";
	import Footer from "$lib/components/landing/Footer.svelte";
	import SeoHead from "$lib/components/SeoHead.svelte";
	import SupportWidget from "$lib/components/ui/SupportWidget.svelte";
	import ReviewWidget from "$lib/components/ui/ReviewWidget.svelte";

	import { page } from "$app/state";

	let { data, children }: LayoutProps = $props();

	const ownChrome = $derived(
		page.url.pathname.startsWith("/admin") ||
			page.url.pathname.startsWith("/shelter") ||
			page.url.pathname.startsWith("/app") ||
			page.url.pathname.startsWith("/invite") ||
			(page.url.pathname.startsWith("/profile") && data.chrome === "app"),
	);
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
<SeoHead />

{#if ownChrome}
	{@render children()}
{:else}
	<div class="flex min-h-dvh flex-col">
		<Header user={data.user} />
		<main id="content" class="flex flex-1 flex-col">
			{@render children()}
		</main>
		<Footer />
	</div>
{/if}

<ReviewWidget user={data.user} />
<SupportWidget user={data.user} />
