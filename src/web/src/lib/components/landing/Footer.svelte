<script lang="ts">
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Logo from "$lib/components/ui/Logo.svelte";

	const year = new Date().getFullYear();
</script>

<footer class="border-t border-sand-200 bg-sand-50 px-4 py-10 sm:px-6">
	<div
		class="mx-auto flex max-w-6xl flex-col items-center gap-6 text-center sm:flex-row sm:justify-between sm:text-left"
	>
		<div class="flex flex-col items-center gap-3 sm:items-start">
			<Logo />
			<p class="max-w-md text-sm text-sand-700">{m.footer_tagline()}</p>
		</div>
		<nav aria-label={m.brand_name()} class="flex items-center gap-6">
			<a
				href={resolve("/impressum")}
				class="py-2 text-sm font-semibold text-sand-700 underline-offset-2 focus-ring hover:text-coral-700 hover:underline"
			>
				{m.footer_impressum()}
			</a>
			<a
				href={resolve("/datenschutz")}
				class="py-2 text-sm font-semibold text-sand-700 underline-offset-2 focus-ring hover:text-coral-700 hover:underline"
			>
				{m.footer_datenschutz()}
			</a>
		</nav>
	</div>
	<p class="mx-auto mt-8 max-w-6xl text-center text-xs text-sand-600 sm:text-left">
		{m.footer_copyright({ year })}
	</p>
</footer>
