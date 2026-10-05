<script lang="ts">
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import type { PublicDonationShelter } from "$lib/types/catalog";
	import ChevronLeft from "lucide-svelte/icons/chevron-left";
	import ChevronRight from "lucide-svelte/icons/chevron-right";
	import Heart from "lucide-svelte/icons/heart";

	let { shelters }: { shelters: PublicDonationShelter[] } = $props();

	let scroller: HTMLDivElement | undefined = $state();
	let index = $state(0);
	let paused = $state(false);

	const total = $derived(shelters.length);
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

	function initial(shelter: PublicDonationShelter): string {
		const letter = shelter.org_name.trim().charAt(0);
		return letter ? letter.toLocaleUpperCase() : "?";
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
	id="donations"
	class="scroll-mt-16 bg-white px-4 py-16 sm:px-6 sm:py-24"
	aria-labelledby="donations-title"
>
	{#snippet heartIcon()}<Heart class="size-4" aria-hidden="true" />{/snippet}
	<div class="mx-auto max-w-6xl">
		<div class="mx-auto max-w-2xl text-center">
			<h2 id="donations-title" class="text-3xl font-black tracking-tight text-sand-950 sm:text-4xl">
				{m.donations_title()}
			</h2>
			<p class="mt-4 text-lg text-sand-700">{m.donations_subtitle()}</p>
		</div>

		{#if total === 0}
			<div
				class="mx-auto mt-12 flex max-w-xl flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-sand-300 bg-peach-50 px-8 py-16 text-center"
			>
				<p class="text-xl font-bold text-sand-900">{m.donations_empty_title()}</p>
				<p class="text-sm text-sand-700">{m.donations_empty_text()}</p>
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
							aria-label={m.donations_carousel_prev()}
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
							{#each shelters as shelter (shelter.id)}
								<article
									class="max-w-full min-w-0 shrink-0 basis-full snap-center"
									aria-roledescription="slide"
								>
									<div
										class="flex h-full min-w-0 flex-col items-center gap-5 overflow-hidden rounded-3xl border border-sand-200 bg-peach-50 px-6 py-8 text-center sm:px-10 sm:py-10"
									>
										{#if shelter.has_logo}
											<img
												src="/api/shelters/{shelter.id}/logo"
												alt=""
												class="size-20 rounded-2xl border border-sand-200 bg-white object-cover"
												loading="lazy"
											/>
										{:else}
											<span
												class="flex size-20 items-center justify-center rounded-2xl border border-sand-200 bg-white text-2xl font-black text-coral-700"
												aria-hidden="true"
											>
												{initial(shelter)}
											</span>
										{/if}
										<div class="min-w-0">
											<h3 class="text-xl font-black tracking-tight text-sand-950">
												{shelter.org_name}
											</h3>
											<p class="mt-1 text-sm font-semibold text-coral-700">{shelter.city}</p>
										</div>
										{#if shelter.donation_description}
											<p
												class="min-w-0 text-base leading-relaxed [overflow-wrap:anywhere] text-sand-700"
											>
												{shelter.donation_description}
											</p>
										{/if}
										<Button
											href={shelter.donation_url}
											target="_blank"
											rel="noopener noreferrer"
											iconLeft={heartIcon}
										>
											{m.donations_cta()}
										</Button>
									</div>
								</article>
							{/each}
						</div>
					</div>
					{#if hasMany}
						<button
							type="button"
							class="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-sand-900 shadow-sm ring-1 ring-sand-200 focus-ring hover:bg-peach-50"
							aria-label={m.donations_carousel_next()}
							onclick={() => goTo(index + 1)}
						>
							<ChevronRight class="size-5" aria-hidden="true" />
						</button>
					{/if}
				</div>

				{#if hasMany}
					<div class="mt-5 flex justify-center gap-1.5">
						{#each shelters as shelter, i (shelter.id)}
							<button
								type="button"
								class="size-2.5 rounded-full focus-ring {i === index
									? 'bg-coral-600'
									: 'bg-sand-300 hover:bg-sand-400'}"
								aria-label={m.donations_carousel_goto({ current: i + 1, total })}
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
