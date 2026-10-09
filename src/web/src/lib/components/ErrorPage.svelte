<script lang="ts">
	import PawPrint from "lucide-svelte/icons/paw-print";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";

	const notFound = $derived(page.status === 404);
</script>

<section
	class="flex flex-1 items-center justify-center px-4 py-16 sm:px-6"
	aria-labelledby="error-title"
>
	<div class="w-full max-w-md text-center">
		<span
			class="mx-auto flex size-16 items-center justify-center rounded-full bg-peach-100 text-coral-600"
			aria-hidden="true"
		>
			<PawPrint class="size-8" />
		</span>
		<p class="mt-6 text-sm font-medium text-sand-600">
			{m.error_page_code({ status: String(page.status) })}
		</p>
		<h1 id="error-title" class="mt-2 text-3xl font-black tracking-tight text-sand-950">
			{notFound ? m.error_page_404_title() : m.error_page_generic_title()}
		</h1>
		<p class="mt-3 text-base leading-relaxed text-sand-700">
			{notFound ? m.error_page_404_text() : m.error_page_generic_text()}
		</p>
		<div class="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
			<Button href={resolve("/")}>{m.error_page_home()}</Button>
			{#if !notFound}
				<Button variant="outline" onclick={() => location.reload()}>{m.error_page_retry()}</Button>
			{/if}
		</div>
	</div>
</section>
