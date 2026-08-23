<script lang="ts">
	import Heart from "lucide-svelte/icons/heart";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import type { PublicAnimal } from "$lib/types/catalog";
	import { withFrom, type AnimalOrigin } from "$lib/app/return";
	import {
		ageLabel,
		bondedNames,
		coverPhoto,
		distanceLabel,
		needTraits,
		speciesLabel,
	} from "$lib/app/format";
	import AnimalPhoto from "./AnimalPhoto.svelte";

	let {
		animal,
		from = null,
		onunlike,
	}: {
		animal: PublicAnimal;
		from?: AnimalOrigin | null;
		onunlike?: (id: string) => void;
	} = $props();

	const href = $derived(withFrom(resolve(`/app/animals/${animal.id}`), from));
	const meta = $derived(
		`${speciesLabel(animal.species)} ${distanceLabel(animal.distance_km, animal.shelter.city)}`,
	);
	const bond = $derived(bondedNames(animal.bonded_partners, animal.bonded_partner));
	const needs = $derived(needTraits(animal.traits, animal.age_months, animal.age_unknown));
</script>

<article
	class="relative h-full overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-sm"
>
	<a {href} class="flex h-full flex-col focus-ring">
		<div class="relative aspect-4/5 bg-peach-100">
			<AnimalPhoto src={coverPhoto(animal.photos)} alt="" />
			<div
				class="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-sand-950/70 to-transparent"
			></div>
			{#if animal.photos.length > 1}
				<div class="absolute inset-x-0 top-3 flex justify-center gap-1">
					{#each animal.photos as _, i (i)}
						<span
							class="h-1 w-6 rounded-full {i === 0 ? 'bg-white' : 'bg-white/40'}"
							aria-hidden="true"
						></span>
					{/each}
				</div>
			{/if}
		</div>
		<div class="flex flex-1 flex-col gap-1.5 p-5">
			<p class="text-2xl font-bold text-sand-950">
				{animal.name}<span class="text-lg font-medium text-sand-600">
					, {ageLabel(animal.age_months, animal.age_unknown)}</span
				>
			</p>
			<p class="text-sm font-semibold text-coral-700">{meta}</p>
			{#if bond}
				<p class="text-xs font-semibold text-sand-800">
					{m.showcase_card_bonded({ name: bond })}
				</p>
			{/if}
			{#if needs.length > 0}
				<ul class="flex flex-wrap gap-2">
					{#each needs as trait (trait)}
						<li class="rounded-xl bg-peach-100 px-3 py-1.5 text-xs font-semibold text-coral-900">
							{trait}
						</li>
					{/each}
				</ul>
			{/if}
			{#if animal.tagline}
				<p class="line-clamp-2 text-sm text-sand-700">{animal.tagline}</p>
			{/if}
			{#if animal.status === "found_home"}
				<p class="text-xs font-semibold text-sand-600">{m.app_detail_unavailable()}</p>
			{/if}
		</div>
	</a>
	{#if onunlike}
		<button
			type="button"
			class="absolute top-3 right-3 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white/90 text-coral-700 shadow-sm focus-ring hover:bg-white"
			aria-label={m.app_unlike()}
			onclick={() => onunlike(animal.id)}
		>
			<Heart class="size-5 fill-current" aria-hidden="true" />
		</button>
	{/if}
</article>
