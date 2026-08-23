<script lang="ts">
	import type { PageProps } from "./$types";
	import { m } from "$lib/paraglide/messages";
	import Hero from "$lib/components/landing/Hero.svelte";
	import Showcase from "$lib/components/landing/Showcase.svelte";
	import Reviews from "$lib/components/landing/Reviews.svelte";
	import ContactSection from "$lib/components/landing/ContactSection.svelte";

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{m.meta_home_title()}</title>
	<meta name="description" content={m.meta_home_description()} />
</svelte:head>

<Hero user={data.user} />
<div class="relative z-10 rounded-t-3xl bg-peach-50 shadow-[0_-16px_48px_rgb(39_33_29/0.1)]">
	<Showcase cards={data.showcase} shelters={data.shelters} loggedIn={Boolean(data.user)} />
	<Reviews reviews={data.reviews} />
	<ContactSection {form} />
</div>
