<script lang="ts">
	import { m } from "$lib/paraglide/messages";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import type { PublicReview } from "$lib/types/review";
	import ChevronLeft from "lucide-svelte/icons/chevron-left";
	import ChevronRight from "lucide-svelte/icons/chevron-right";
	import Star from "lucide-svelte/icons/star";

	let { reviews }: { reviews: PublicReview[] } = $props();

	let scroller: HTMLDivElement | undefined = $state();
	let index = $state(0);
	let paused = $state(false);

	const total = $derived(reviews.length);
	const hasMany = $derived(total > 1);
	const AUTO_MS = 6000;

	function goTo(next: number) {
		if (!scroller || total === 0) return;
		const wrapped = ((next % total) + total) % total;
		scroller.scrollTo({ left: wrapped * scroller.clientWidth, behavior: "smooth" });
		index = wrapped;
	}

	function onScroll() {
		if (!scroller || total === 0) return;
		const width = scroller.clientWidth;
		if (width === 0) return;
		index = Math.min(total - 1, Math.max(0, Math.round(scroller.scrollLeft / width)));
	}

	$effect(() => {
		if (!hasMany || paused) return;
		const current = index;
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
		const id = setInterval(() => goTo(current + 1), AUTO_MS);
		return () => clearInterval(id);
	});
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

		{#if reviews.length === 0}
			<div
				class="mx-auto mt-12 flex max-w-xl flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-sand-300 bg-peach-50 px-8 py-16 text-center"
			>
				<p class="text-xl font-bold text-sand-900">{m.reviews_empty_title()}</p>
				<p class="text-sm text-sand-700">{m.reviews_empty_text()}</p>
			</div>
		{:else}
			<div
				class="mx-auto mt-12 max-w-4xl"
				onmouseenter={() => (paused = true)}
				onmouseleave={() => (paused = false)}
				onfocusin={() => (paused = true)}
				onfocusout={() => (paused = false)}
			>
				<div class="flex items-center gap-4 sm:gap-8">
					{#if hasMany}
						<button
							type="button"
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-sand-900 shadow-sm ring-1 ring-sand-200 focus-ring hover:bg-peach-50"
							aria-label={m.reviews_carousel_prev()}
							onclick={() => goTo(index - 1)}
						>
							<ChevronLeft class="size-5" aria-hidden="true" />
						</button>
					{/if}
					<div
						bind:this={scroller}
						class="min-w-0 flex-1 snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
						style="touch-action: pan-x"
						onscroll={onScroll}
					>
						<div class="flex">
							{#each reviews as review (review.id)}
								<article
									class="min-w-0 max-w-full shrink-0 basis-full snap-center"
									aria-roledescription="slide"
								>
									<figure
										class="flex h-full min-w-0 flex-col overflow-hidden rounded-3xl border border-sand-200 bg-peach-50 px-6 py-8 sm:px-10 sm:py-10"
									>
										<div
											class="flex gap-1 text-coral-600"
											aria-label={m.reviews_stars_aria({ count: review.stars })}
										>
											{#each [1, 2, 3, 4, 5] as value (value)}
												<Star
													class="size-5 {review.stars >= value ? 'fill-current' : ''}"
													aria-hidden="true"
												/>
											{/each}
										</div>
										<blockquote
											class="mt-5 min-w-0 flex-1 [overflow-wrap:anywhere] text-lg leading-relaxed whitespace-pre-wrap text-sand-900 sm:text-xl"
										>
											“{review.body}”
										</blockquote>
										<figcaption class="mt-6 min-w-0">
											<div
												class="inline-flex max-w-full items-center gap-3 rounded-xl border border-sand-200 bg-white px-3 py-2 shadow-sm"
											>
												<Avatar
													name={review.name}
													src={review.has_avatar ? `/api/reviews/${review.id}/avatar` : null}
													size="sm"
												/>
												<span class="min-w-0 truncate text-sm font-bold text-sand-950"
													>{review.name}</span
												>
											</div>
										</figcaption>
									</figure>
								</article>
							{/each}
						</div>
					</div>
					{#if hasMany}
						<button
							type="button"
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-sand-900 shadow-sm ring-1 ring-sand-200 focus-ring hover:bg-peach-50"
							aria-label={m.reviews_carousel_next()}
							onclick={() => goTo(index + 1)}
						>
							<ChevronRight class="size-5" aria-hidden="true" />
						</button>
					{/if}
				</div>

				{#if hasMany}
					<div class="mt-5 flex justify-center gap-1.5">
						{#each reviews as review, i (review.id)}
							<button
								type="button"
								class="size-2.5 rounded-full focus-ring {i === index
									? 'bg-coral-600'
									: 'bg-sand-300 hover:bg-sand-400'}"
								aria-label={m.reviews_carousel_goto({ current: i + 1, total })}
								aria-current={i === index ? "true" : undefined}
								onclick={() => goTo(i)}
							></button>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</div>
</section>
