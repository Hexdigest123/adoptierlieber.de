<script lang="ts">
	import { m } from "$lib/paraglide/messages";
	import Card from "$lib/components/ui/Card.svelte";
</script>

<div class="flex flex-1 items-center justify-center bg-peach-50 px-4 py-12 sm:px-6">
	<Card class="w-full max-w-md" padding="lg">
		<h1 class="text-2xl font-black tracking-tight text-sand-950">{m.app_title()}</h1>
		<p class="mt-2 text-sm leading-relaxed text-sand-700">{m.app_subtitle()}</p>
	</Card>
</div>
