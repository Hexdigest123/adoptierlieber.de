<script lang="ts">
	import type { LayoutProps } from "./$types";
	import "./layout.css";
	import favicon from "$lib/assets/favicon.svg";
	import outfitLatin from "@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2?url";
	import Header from "$lib/components/landing/Header.svelte";
	import Footer from "$lib/components/landing/Footer.svelte";
	import SeoHead from "$lib/components/SeoHead.svelte";
	import SupportWidget from "$lib/components/ui/SupportWidget.svelte";
	import ReviewWidget from "$lib/components/ui/ReviewWidget.svelte";

	import { page } from "$app/state";

	let { data, children }: LayoutProps = $props();

	// Errors caught by the root +error.svelte (all but /app pages, which have their own
	// boundary inside the app shell) render with the landing header and footer.
	const rootError = $derived(Boolean(page.error) && !page.route.id?.startsWith("/app"));
	const ownChrome = $derived(
		!rootError &&
			(page.url.pathname.startsWith("/admin") ||
				page.url.pathname.startsWith("/shelter") ||
				page.url.pathname.startsWith("/app") ||
				page.url.pathname.startsWith("/invite") ||
				(page.url.pathname.startsWith("/profile") && data.chrome === "app")),
	);
	// The app shell has sticky action bars; review/support live in its account menu instead.
	const appShell = $derived(
		page.url.pathname.startsWith("/app") ||
			(page.url.pathname.startsWith("/profile") && data.chrome === "app"),
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<link rel="preload" as="font" type="font/woff2" crossorigin="anonymous" href={outfitLatin} />
</svelte:head>
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

<ReviewWidget user={data.user} fab={!appShell} />
<SupportWidget user={data.user} fab={!appShell} />
