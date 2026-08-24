<script lang="ts">
	import { resolve } from "$app/paths";
	import { ageLabel, coverPhoto, speciesLabel } from "$lib/app/format";
	import type { AdminShelterAnimal } from "$lib/admin/types";
	import AnimalPhoto from "$lib/components/app/AnimalPhoto.svelte";
	import StatusPill from "./StatusPill.svelte";

	let {
		animal,
		href,
	}: {
		animal: AdminShelterAnimal & { shelter_name?: string; city?: string };
		href?: string;
	} = $props();

	const target = $derived(href ?? resolve("/admin/catalog/animals/[id]", { id: animal.id }));
	const meta = $derived(
		[speciesLabel(animal.species), animal.shelter_name, animal.city].filter(Boolean).join(" · "),
	);
</script>

<article
	class="relative h-full overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-sm"
>
	<a href={target} class="flex h-full flex-col focus-ring">
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
			<div class="flex items-start justify-between gap-2">
				<p class="text-2xl font-bold text-sand-950">
					{animal.name}<span class="text-lg font-medium text-sand-600">
						, {ageLabel(animal.age_months, animal.age_unknown)}</span
					>
				</p>
				<StatusPill status={animal.status} />
			</div>
			<p class="text-sm font-semibold text-coral-700">{meta}</p>
			{#if animal.traits.length > 0}
				<ul class="flex flex-wrap gap-2">
					{#each animal.traits.slice(0, 3) as trait (trait)}
						<li class="rounded-xl bg-peach-100 px-3 py-1.5 text-xs font-semibold text-coral-900">
							{trait}
						</li>
					{/each}
				</ul>
			{/if}
			{#if animal.tagline}
				<p class="line-clamp-2 text-sm text-sand-700">{animal.tagline}</p>
			{/if}
		</div>
	</a>
</article>
