<script lang="ts">
	import { m } from "$lib/paraglide/messages";

	type Props = {
		clearHref?: string;
	};

	let { clearHref }: Props = $props();
</script>

<div class="flex flex-col items-center gap-3 px-4 py-16 text-center">
	<div class="size-16 rounded-2xl bg-peach-100" aria-hidden="true"></div>
	<h2 class="text-lg font-bold text-sand-950">{m.admin_empty_title()}</h2>
	<p class="max-w-sm text-sm text-sand-700">{m.admin_empty_text()}</p>
	{#if clearHref}
		<a
			href={clearHref}
			class="rounded-full px-4 py-2 text-sm font-semibold text-coral-700 focus-ring hover:bg-coral-50"
		>
			{m.admin_empty_clear()}
		</a>
	{/if}
</div>
