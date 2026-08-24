<script lang="ts">
	import type { PageProps } from "./$types";
	import AnimalDetail from "$lib/components/app/AnimalDetail.svelte";
	import { m } from "$lib/paraglide/messages";
	import { jsonLdText, SITE_ORIGIN } from "$lib/seo";

	let { data }: PageProps = $props();
	let animal = $state(data.animal);

	const title = $derived(`${animal.name} – Adoptier Lieber`);
	const description = $derived(
		animal.tagline ||
			animal.description?.slice(0, 160) ||
			m.app_public_fallback({ name: animal.name, city: animal.shelter.city }),
	);
	const image = $derived(
		animal.photos[0] ? `${SITE_ORIGIN}${animal.photos[0]}` : `${SITE_ORIGIN}/og.png`,
	);
	const canonical = $derived(`${SITE_ORIGIN}/animals/${animal.id}`);
	const json = $derived(
		jsonLdText({
			"@context": "https://schema.org",
			"@type": "Animal",
			name: animal.name,
			description,
			image: animal.photos[0] ? `${SITE_ORIGIN}${animal.photos[0]}` : undefined,
			url: canonical,
		}),
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	<meta name="robots" content="index, follow" />
	<link rel="canonical" href={canonical} />
	<meta property="og:type" content="article" />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={image} />
	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={title} />
	<meta name="twitter:description" content={description} />
	<meta name="twitter:image" content={image} />
	{@html `<script type="application/ld+json">${json}</script>`}
</svelte:head>

<div class="mx-auto w-full max-w-2xl px-4 py-8">
	<AnimalDetail bind:animal publicView />
</div>
