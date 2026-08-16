<script lang="ts">
	import Star from "lucide-svelte/icons/star";
	import { m } from "$lib/paraglide/messages";
	import Card from "$lib/components/ui/Card.svelte";

	const reviews = [
		{
			text: () => m.reviews_1_text(),
			name: () => m.reviews_1_name(),
			role: () => m.reviews_1_role(),
		},
		{
			text: () => m.reviews_2_text(),
			name: () => m.reviews_2_name(),
			role: () => m.reviews_2_role(),
		},
		{
			text: () => m.reviews_3_text(),
			name: () => m.reviews_3_name(),
			role: () => m.reviews_3_role(),
		},
	];
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

		<div class="mt-12 grid gap-6 md:grid-cols-3">
			{#each reviews as review (review.name())}
				<Card class="flex flex-col gap-4">
					<div class="flex gap-1 text-peach-500" role="img" aria-label={m.reviews_stars_aria()}>
						{#each Array(5) as _, i (i)}
							<Star class="size-5 fill-current" aria-hidden="true" />
						{/each}
					</div>
					<blockquote class="flex-1 text-base leading-relaxed text-sand-800">
						{review.text()}
					</blockquote>
					<footer>
						<p class="font-bold text-sand-950">{review.name()}</p>
						<p class="text-sm text-sand-600">{review.role()}</p>
					</footer>
				</Card>
			{/each}
		</div>
	</div>
</section>
