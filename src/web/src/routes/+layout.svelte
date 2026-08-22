<script lang="ts">
	import type { LayoutProps } from "./$types";
	import "./layout.css";
	import favicon from "$lib/assets/favicon.svg";
	import Header from "$lib/components/landing/Header.svelte";
	import Footer from "$lib/components/landing/Footer.svelte";

	let { data, children }: LayoutProps = $props();
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>

<div class="flex min-h-dvh flex-col">
	<Header user={data.user} />
	<main id="content" class="flex-1">
		{@render children()}
	</main>
	<Footer />
</div>
