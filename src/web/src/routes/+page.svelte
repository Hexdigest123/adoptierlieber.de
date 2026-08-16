<script lang="ts">
	import type { PageProps } from "./$types";
	import { m } from "$lib/paraglide/messages";
	import Hero from "$lib/components/landing/Hero.svelte";
	import Showcase from "$lib/components/landing/Showcase.svelte";
	import Reviews from "$lib/components/landing/Reviews.svelte";
	import ContactSection from "$lib/components/landing/ContactSection.svelte";

	let { form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.meta_home_title()}</title>
	<meta name="description" content={m.meta_home_description()} />
</svelte:head>

<Hero />
<Showcase />
<Reviews />
<ContactSection {form} />
