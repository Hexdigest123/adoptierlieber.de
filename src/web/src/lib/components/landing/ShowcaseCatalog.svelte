<script lang="ts">
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Card from "$lib/components/ui/Card.svelte";
	import type { ShowcaseCard } from "$lib/data/excerpts";

	let {
		cards,
		loggedIn = false,
	}: {
		cards: ShowcaseCard[];
		loggedIn?: boolean;
	} = $props();

	function hrefFor(card: ShowcaseCard): string {
		return loggedIn
			? resolve("/app/animals/[id]", { id: card.id })
			: resolve("/animals/[id]", { id: card.id });
	}
</script>

<div class="w-full">
	<div class="mb-3 text-sm text-sand-600 tabular-nums">
		{m.app_catalog_count({ shown: String(cards.length), total: String(cards.length) })}
	</div>
	<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
		{#each cards as card (card.id)}
			<a href={hrefFor(card)} class="block rounded-2xl focus-ring">
				<Card padding="sm" focusable class="h-full">
					<div class="flex items-start gap-3">
						<div class="size-16 shrink-0 overflow-hidden rounded-xl bg-peach-100">
							{#if card.image}
								<img src={card.image} alt="" class="h-full w-full object-cover" />
							{/if}
						</div>
						<div class="min-w-0 flex-1">
							<p class="truncate font-semibold text-sand-950">
								{card.name}<span class="font-medium text-sand-600">, {card.age}</span>
							</p>
							<p class="truncate text-sm text-sand-600">
								{card.species}
								{card.shelterName}
							</p>
							<p class="text-sm text-coral-700">{card.location}</p>
							{#if card.bonded}
								<p class="truncate text-xs font-semibold text-sand-800">
									{m.showcase_card_bonded({ name: card.bonded })}
								</p>
							{/if}
							{#if card.needs.length > 0}
								<ul class="mt-1 flex flex-wrap gap-1">
									{#each card.needs as trait (trait)}
										<li
											class="rounded-lg bg-peach-100 px-2 py-0.5 text-xs font-semibold text-coral-900"
										>
											{trait}
										</li>
									{/each}
								</ul>
							{/if}
							{#if card.tagline}
								<p class="mt-1 line-clamp-2 text-xs text-sand-700">{card.tagline}</p>
							{/if}
						</div>
					</div>
				</Card>
			</a>
		{/each}
	</div>
</div>
