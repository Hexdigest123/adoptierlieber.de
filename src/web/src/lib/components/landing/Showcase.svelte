<script lang="ts">
	import { m } from "$lib/paraglide/messages";
	import EmptyAnimals from "$lib/components/EmptyAnimals.svelte";
	import SwipeDeck from "./SwipeDeck.svelte";
	import ShowcaseCatalog from "./ShowcaseCatalog.svelte";
	import type { ShowcaseCard } from "$lib/data/excerpts";

	let {
		cards,
		loggedIn = false,
	}: {
		cards: ShowcaseCard[];
		loggedIn?: boolean;
	} = $props();

	let mode = $state<"swipe" | "catalog">("catalog");
	const emptyCatalog = $derived(cards.length === 0);
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
			<p class="mt-4 text-lg text-sand-700">
				{#if emptyCatalog}
					{m.showcase_none_text()}
				{:else if mode === "catalog"}
					{m.showcase_catalog_subtitle()}
				{:else}
					{m.showcase_subtitle()}
				{/if}
			</p>
		</div>

		<div
			class="mx-auto mt-8 flex w-fit items-center rounded-full border border-sand-200 bg-white p-0.5"
			role="group"
			aria-label={m.showcase_mode_label()}
		>
			<button
				type="button"
				onclick={() => (mode = "catalog")}
				aria-pressed={mode === "catalog"}
				class="cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold focus-ring {mode ===
				'catalog'
					? 'bg-coral-600 text-white'
					: 'text-sand-600 hover:text-coral-700'}"
			>
				{m.showcase_mode_catalog()}
			</button>
			<button
				type="button"
				onclick={() => (mode = "swipe")}
				aria-pressed={mode === "swipe"}
				class="cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold focus-ring {mode ===
				'swipe'
					? 'bg-coral-600 text-white'
					: 'text-sand-600 hover:text-coral-700'}"
			>
				{m.showcase_mode_cards()}
			</button>
		</div>

		<div class="mt-12 flex justify-center">
			{#if emptyCatalog}
				<EmptyAnimals title={m.showcase_none_title()} />
			{:else if mode === "catalog"}
				<ShowcaseCatalog {cards} {loggedIn} />
			{:else}
				<SwipeDeck {cards} {loggedIn} />
			{/if}
		</div>
	</div>
</section>
