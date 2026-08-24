<script lang="ts">
	import type { PageProps } from "./$types";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import { ageLabel, speciesLabel } from "$lib/app/format";
	import AnimalPhoto from "$lib/components/app/AnimalPhoto.svelte";
	import Card from "$lib/components/ui/Card.svelte";
	import StatusPill from "$lib/components/admin/StatusPill.svelte";
	import { formatDate } from "$lib/admin/format";

	let { data }: PageProps = $props();
	const animal = $derived(data.animal);
	const slides = $derived(animal.photos.length ? animal.photos : [null]);
</script>

<div class="mb-5">
	<a
		href="{resolve('/admin/catalog')}?type=animals"
		class="text-sm font-semibold text-coral-700 focus-ring hover:text-coral-800"
	>
		{m.admin_catalog_animals()}
	</a>
	<h1 class="mt-2 text-2xl font-black tracking-tight text-sand-950">{animal.name}</h1>
</div>

<Card padding="none" class="overflow-hidden">
	<div class="aspect-4/5 bg-peach-100 sm:aspect-4/3">
		{#if animal.photos.length > 1}
			<div class="flex h-full snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto">
				{#each slides as src, i (src ?? i)}
					<div class="h-full min-w-full shrink-0 snap-center">
						<AnimalPhoto {src} alt={i === 0 ? animal.name : ""} />
					</div>
				{/each}
			</div>
		{:else}
			<AnimalPhoto src={animal.photos[0]} alt={animal.name} />
		{/if}
	</div>
	<div class="p-6">
		<div class="flex flex-wrap items-start justify-between gap-3">
			<div>
				<p class="text-xl font-bold text-sand-950">
					{animal.name}<span class="text-sm font-medium text-sand-600">
						, {ageLabel(animal.age_months, animal.age_unknown)}</span
					>
				</p>
				<p class="text-sm text-sand-700">
					{speciesLabel(animal.species)}{animal.sex ? ` ${animal.sex}` : ""}
				</p>
			</div>
			<StatusPill status={animal.status} />
		</div>
		{#if animal.tagline}
			<p class="mt-3 text-sm text-sand-700">{animal.tagline}</p>
		{/if}
		{#if animal.traits.length > 0}
			<ul class="mt-3 flex flex-wrap gap-2">
				{#each animal.traits as trait (trait)}
					<li class="rounded-xl bg-peach-100 px-3 py-1.5 text-xs font-semibold text-coral-900">
						{trait}
					</li>
				{/each}
			</ul>
		{/if}
		{#if animal.description}
			<p class="mt-4 text-sm leading-relaxed text-sand-800">{animal.description}</p>
		{/if}
		<dl class="mt-4 grid gap-3 text-sm sm:grid-cols-2">
			<div>
				<dt class="font-semibold text-sand-700">{m.admin_animal_shelter()}</dt>
				<dd>
					<a
						href={resolve("/admin/catalog/shelters/[id]", { id: animal.shelter_id })}
						class="font-semibold text-coral-700 underline underline-offset-2"
					>
						{animal.shelter_name}
					</a>
					<span class="text-sand-600"> {animal.city}</span>
				</dd>
			</div>
			<div>
				<dt class="font-semibold text-sand-700">{m.admin_user_created()}</dt>
				<dd class="tabular-nums">{formatDate(animal.created_at)}</dd>
			</div>
		</dl>
	</div>
</Card>
