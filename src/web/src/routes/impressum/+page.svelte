<script lang="ts">
	import { m } from "$lib/paraglide/messages";
</script>

<svelte:head><title>{m.footer_impressum()} – {m.brand_name()}</title></svelte:head>

<div class="mx-auto max-w-3xl px-4 py-16 sm:px-6">
	<h1 class="text-3xl font-black text-sand-950">{m.footer_impressum()}</h1>
	<p class="mt-6 text-sand-700">{m.legal_placeholder_text()}</p>
</div>
