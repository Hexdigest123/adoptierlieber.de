<script lang="ts">
	import { m } from "$lib/paraglide/messages";
</script>

<section
	id="reviews"
	class="scroll-mt-16 bg-white px-4 py-16 sm:px-6 sm:py-24"
	aria-labelledby="reviews-title"
>
	<div class="mx-auto max-w-6xl">
		<div class="mx-auto max-w-2xl text-center">
			<h2 id="reviews-title" class="text-3xl font-black tracking-tight text-sand-950 sm:text-4xl">
				{m.reviews_title()}
			</h2>
			<p class="mt-4 text-lg text-sand-700">{m.reviews_subtitle()}</p>
		</div>

		<div
			class="mx-auto mt-12 flex max-w-xl flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-sand-300 bg-peach-50 px-8 py-16 text-center"
		>
			<p class="text-xl font-bold text-sand-900">{m.reviews_empty_title()}</p>
			<p class="text-sm text-sand-700">{m.reviews_empty_text()}</p>
		</div>
	</div>
</section>
