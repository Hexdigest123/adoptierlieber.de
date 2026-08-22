<script lang="ts">
	import { m } from "$lib/paraglide/messages";
	import SwipeDeck from "./SwipeDeck.svelte";
</script>

<section
	id="showcase"
	class="scroll-mt-16 bg-peach-50 px-4 py-16 sm:px-6 sm:py-24"
	aria-labelledby="showcase-title"
>
	<div class="mx-auto max-w-6xl">
		<div class="mx-auto max-w-2xl text-center">
			<h2 id="showcase-title" class="text-3xl font-black tracking-tight text-sand-950 sm:text-4xl">
				{m.showcase_title()}
			</h2>
			<p class="mt-4 text-lg text-sand-700">{m.showcase_subtitle()}</p>
		</div>

		<div class="mt-12 flex justify-center">
			<SwipeDeck />
		</div>
	</div>
</section>
