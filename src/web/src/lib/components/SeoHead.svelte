<script lang="ts">
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import { getLocale } from "$lib/paraglide/runtime";
	import { jsonLd, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH, seoForRoute } from "$lib/seo";

	const seo = $derived(seoForRoute(page.route.id, page.url.pathname, page.status));
	const locale = $derived(getLocale());
	const ogLocale = $derived(locale === "de" ? "de_DE" : "en_US");
	const ogLocaleAlt = $derived(locale === "de" ? "en_US" : "de_DE");
	const structured = $derived(jsonLd(seo, locale));
</script>

<svelte:head>
	<title>{seo.title}</title>
	<meta name="description" content={seo.description} />
	<meta name="robots" content={seo.robots} />
	<meta name="theme-color" content="#c74626" />
	<link rel="canonical" href={seo.canonical} />
	<link rel="apple-touch-icon" href="/apple-touch-icon.png" />

	<meta property="og:type" content="website" />
	<meta property="og:site_name" content={m.brand_name()} />
	<meta property="og:locale" content={ogLocale} />
	<meta property="og:locale:alternate" content={ogLocaleAlt} />
	<meta property="og:url" content={seo.canonical} />
	<meta property="og:title" content={seo.title} />
	<meta property="og:description" content={seo.description} />
	<meta property="og:image" content={seo.image} />
	<meta property="og:image:type" content="image/png" />
	<meta property="og:image:width" content={String(OG_IMAGE_WIDTH)} />
	<meta property="og:image:height" content={String(OG_IMAGE_HEIGHT)} />
	<meta property="og:image:alt" content={m.meta_og_image_alt()} />

	<meta name="twitter:card" content="summary_large_image" />
	<meta name="twitter:title" content={seo.title} />
	<meta name="twitter:description" content={seo.description} />
	<meta name="twitter:image" content={seo.image} />
	<meta name="twitter:image:alt" content={m.meta_og_image_alt()} />

	{@html `<script type="application/ld+json">${structured}</script>`}
</svelte:head>
