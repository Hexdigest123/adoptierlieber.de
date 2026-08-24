<script lang="ts">
	import ArrowLeft from "lucide-svelte/icons/arrow-left";
	import ChevronLeft from "lucide-svelte/icons/chevron-left";
	import ChevronRight from "lucide-svelte/icons/chevron-right";
	import Heart from "lucide-svelte/icons/heart";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import AnimalPhoto from "$lib/components/app/AnimalPhoto.svelte";
	import {
		ageLabel,
		distanceLabel,
		neuteredLabel,
		practicalLabel,
		sexLabel,
		sizeLabel,
		speciesLabel,
	} from "$lib/app/format";
	import { backPath, withFrom } from "$lib/app/return";
	import InterestSheet from "$lib/components/shelter/InterestSheet.svelte";
	import type { InterestContext } from "$lib/types/shelter";
	import type { PublicAnimal } from "$lib/types/catalog";
	import type { SessionUser } from "$lib/types/session";

	let {
		animal = $bindable(),
		user = null,
		compact = false,
		publicView = false,
		preview = false,
		showBack = true,
	}: {
		animal: PublicAnimal;
		user?: SessionUser | null;
		compact?: boolean;
		publicView?: boolean;
		preview?: boolean;
		showBack?: boolean;
	} = $props();

	let photo = $state(0);
	let gallery: HTMLElement | undefined = $state();
	let liking = $state(false);
	let interestOpen = $state(false);
	let interest = $state<InterestContext | null>(null);
	let interestLoading = $state(false);
	let lastId = $state(animal.id);

	const slides = $derived(animal.photos.length ? animal.photos : [null]);

	$effect(() => {
		if (animal.id !== lastId) {
			lastId = animal.id;
			photo = 0;
			if (gallery) gallery.scrollLeft = 0;
		}
		if (!publicView && !preview) void recordImpression(animal.id);
	});

	function goToPhoto(index: number) {
		const count = slides.length;
		if (!count) return;
		photo = ((index % count) + count) % count;
		const width = gallery?.clientWidth ?? 0;
		gallery?.scrollTo({ left: photo * width, behavior: "smooth" });
	}

	function onGalleryScroll() {
		if (!gallery) return;
		const width = gallery.clientWidth;
		if (!width) return;
		const index = Math.round(gallery.scrollLeft / width);
		if (index !== photo && index >= 0 && index < slides.length) photo = index;
	}

	function onGalleryClick(event: MouseEvent & { currentTarget: EventTarget & HTMLElement }) {
		if (slides.length < 2) return;
		const rect = event.currentTarget.getBoundingClientRect();
		const x = event.clientX - rect.left;
		if (x < rect.width * 0.3) goToPhoto(photo - 1);
		else if (x > rect.width * 0.7) goToPhoto(photo + 1);
	}

	async function recordImpression(id: string) {
		if (animal.status !== "live") return;
		try {
			await fetch(`/api/animals/${id}/impressions`, { method: "POST" });
		} catch {
			// fail open
		}
	}

	async function toggleLike() {
		if (preview || publicView || animal.status !== "live") return;
		liking = true;
		try {
			const method = animal.liked ? "DELETE" : "POST";
			const res = await fetch(`/api/animals/${animal.id}/like`, { method });
			if (res.ok) {
				const body = (await res.json()) as { liked: boolean };
				animal = { ...animal, liked: body.liked };
			}
		} catch {
			// keep last liked state
		} finally {
			liking = false;
		}
	}

	async function openInterest() {
		if (preview || publicView || animal.status !== "live") return;
		interestLoading = true;
		try {
			const res = await fetch(`/api/chats/interest?animal_id=${animal.id}`);
			if (!res.ok) return;
			interest = (await res.json()) as InterestContext;
			interestOpen = true;
		} catch {
			// sheet stays closed
		} finally {
			interestLoading = false;
		}
	}

	const routeHref = $derived.by(() => {
		if (animal.lat == null || animal.lng == null) return null;
		return `https://www.openstreetmap.org/?mlat=${animal.lat}&mlon=${animal.lng}#map=14/${animal.lat}/${animal.lng}`;
	});

	const looks = $derived([sizeLabel(animal.size), ...animal.colors].filter(Boolean));
	const traits = $derived(animal.traits.filter(Boolean));
	const loginNext = $derived(`/login?next=${encodeURIComponent(`/app/animals/${animal.id}`)}`);
	const origin = $derived(page.url.searchParams.get("from"));
	const backHref = $derived(publicView ? resolve("/") : resolve(backPath(origin)));

	function partnerHref(id: string): string {
		if (publicView) return resolve(`/animals/${id}`);
		return withFrom(resolve(`/app/animals/${id}`), origin);
	}
</script>

<article class="flex w-full flex-col {compact ? '' : 'mx-auto max-w-2xl pb-40 md:pb-24'}">
	{#if showBack}
		<a
			href={backHref}
			class="mb-3 inline-flex w-fit items-center gap-1 text-sm font-semibold text-sand-700 focus-ring hover:text-coral-700"
		>
			<ArrowLeft class="size-4" aria-hidden="true" />
			{m.app_detail_back()}
		</a>
	{/if}

	{#if animal.status === "found_home"}
		<p
			class="mb-3 rounded-2xl border border-sand-300 bg-sand-100 px-4 py-3 text-sm font-semibold text-sand-800"
		>
			{m.app_detail_unavailable()}
		</p>
	{/if}

	<div
		class="relative min-w-0 overflow-hidden rounded-3xl border border-sand-200 bg-peach-100 {compact
			? 'aspect-4/3'
			: 'aspect-4/5'}"
	>
		<div
			bind:this={gallery}
			class="absolute inset-0 flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto overscroll-x-contain [&::-webkit-scrollbar]:hidden"
			style="touch-action: pan-x"
			onscroll={onGalleryScroll}
			onclick={onGalleryClick}
		>
			{#each slides as src, i (src ?? i)}
				<div class="h-full w-full shrink-0 basis-full snap-center">
					<AnimalPhoto {src} alt={i === 0 ? animal.name : ""} />
				</div>
			{/each}
		</div>
		{#if animal.photos.length > 1}
			<button
				type="button"
				class="absolute top-1/2 left-2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-sand-900 shadow-sm focus-ring hover:bg-white"
				aria-label={m.app_photo_prev()}
				onclick={() => goToPhoto(photo - 1)}
			>
				<ChevronLeft class="size-5" aria-hidden="true" />
			</button>
			<button
				type="button"
				class="absolute top-1/2 right-2 z-10 flex size-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-sand-900 shadow-sm focus-ring hover:bg-white"
				aria-label={m.app_photo_next()}
				onclick={() => goToPhoto(photo + 1)}
			>
				<ChevronRight class="size-5" aria-hidden="true" />
			</button>
			<div class="absolute inset-x-0 bottom-3 flex justify-center gap-1.5">
				{#each animal.photos as _, i (i)}
					<button
						type="button"
						class="flex min-h-11 min-w-11 items-center justify-center rounded-full focus-ring"
						aria-label={m.app_photo_of({ current: i + 1, total: animal.photos.length })}
						onclick={() => goToPhoto(i)}
					>
						<span
							class="h-2 w-6 rounded-full {i === photo ? 'bg-white' : 'bg-white/40'}"
							aria-hidden="true"
						></span>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<div class="mt-5 flex flex-col gap-2">
		<h1 class="text-3xl font-black text-sand-950">
			{animal.name}
			<span class="text-lg font-medium text-sand-600">
				{ageLabel(animal.age_months, animal.age_unknown)}</span
			>
		</h1>
		<p class="text-base font-semibold text-coral-700">
			{speciesLabel(animal.species)}
			{sexLabel(animal.sex)}
			{#if animal.breed}{animal.breed}{/if}
		</p>
		<p class="text-sm text-sand-700">
			{distanceLabel(animal.distance_km, animal.shelter.city)}
			{animal.shelter.city}
		</p>
		{#if animal.bonded_partners?.length}
			<p class="text-sm font-semibold text-sand-800">
				{m.app_detail_bonded_lead()}
				{#each animal.bonded_partners as partner, index (partner.id)}
					{index > 0 ? ", " : " "}
					{#if preview}
						{partner.name}
					{:else}
						<a
							class="underline decoration-sand-400 underline-offset-2"
							href={partnerHref(partner.id)}>{partner.name}</a
						>
					{/if}
				{/each}
			</p>
		{:else if animal.bonded_partner}
			<p class="text-sm font-semibold text-sand-800">
				{m.app_detail_bonded({ name: animal.bonded_partner })}
			</p>
		{/if}
	</div>

	{#if looks.length || traits.length}
		<div class="mt-5 flex flex-col gap-4">
			{#if looks.length}
				<div>
					<p class="text-xs font-bold tracking-wide text-sand-500 uppercase">
						{m.app_detail_looks()}
					</p>
					<ul class="mt-2 flex flex-wrap gap-2">
						{#each looks as item (item)}
							<li class="rounded-xl bg-sand-100 px-3.5 py-1.5 text-sm font-semibold text-sand-800">
								{item}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
			{#if traits.length}
				<div>
					<p class="text-xs font-bold tracking-wide text-sand-500 uppercase">
						{m.app_detail_traits()}
					</p>
					<ul class="mt-2 flex flex-wrap gap-2">
						{#each traits as item (item)}
							<li
								class="rounded-xl bg-peach-100 px-3.5 py-1.5 text-sm font-semibold text-coral-900"
							>
								{item}
							</li>
						{/each}
					</ul>
				</div>
			{/if}
		</div>
	{/if}

	{#if animal.description}
		<section class="mt-6">
			<h2 class="text-sm font-bold text-sand-900">{m.app_detail_story()}</h2>
			<p class="mt-2 text-sm leading-relaxed whitespace-pre-wrap text-sand-800">
				{animal.description}
			</p>
		</section>
	{/if}

	<section class="mt-6">
		<h2 class="text-sm font-bold text-sand-900">{m.app_detail_practical()}</h2>
		<dl class="mt-2 grid grid-cols-2 gap-2 text-sm">
			<div class="rounded-xl bg-white px-3 py-2">
				<dt class="text-sand-600">{m.app_detail_vaccinated()}</dt>
				<dd class="font-semibold text-sand-950">{practicalLabel(animal.vaccinated)}</dd>
			</div>
			<div class="rounded-xl bg-white px-3 py-2">
				<dt class="text-sand-600">{neuteredLabel(animal.sex)}</dt>
				<dd class="font-semibold text-sand-950">{practicalLabel(animal.neutered)}</dd>
			</div>
			<div class="rounded-xl bg-white px-3 py-2">
				<dt class="text-sand-600">{m.app_detail_chipped()}</dt>
				<dd class="font-semibold text-sand-950">{practicalLabel(animal.chipped)}</dd>
			</div>
			<div class="rounded-xl bg-white px-3 py-2">
				<dt class="text-sand-600">{m.app_detail_house_trained()}</dt>
				<dd class="font-semibold text-sand-950">{practicalLabel(animal.house_trained)}</dd>
			</div>
		</dl>
	</section>

	<section class="mt-6">
		<h2 class="text-sm font-bold text-sand-900">{m.app_detail_where()}</h2>
		<p class="mt-1 text-sm text-sand-800">
			{animal.shelter.city}
			{m.app_detail_at_shelter({ shelter: animal.shelter.org_name })}
		</p>
		{#if routeHref}
			<a
				href={routeHref}
				target="_blank"
				rel="noopener noreferrer"
				class="mt-2 inline-flex text-sm font-semibold text-coral-700 focus-ring"
			>
				{m.app_detail_route()}
			</a>
		{/if}
	</section>

	{#if interest && interestOpen}
		<InterestSheet bind:open={interestOpen} context={interest} />
	{/if}

	{#if publicView}
		<div class="mt-6">
			<Button href={loginNext} fullWidth>{m.app_public_login()}</Button>
		</div>
	{:else}
		<footer
			class={compact || preview
				? "mt-6"
				: "fixed inset-x-0 bottom-14 z-30 border-t border-sand-200 bg-white/95 px-4 py-3 backdrop-blur md:bottom-0"}
		>
			<div class="mx-auto flex max-w-2xl gap-2">
				<Button
					fullWidth
					variant={animal.liked ? "secondary" : "outline"}
					disabled={animal.status !== "live" || liking}
					onclick={() => void toggleLike()}
				>
					{#snippet iconLeft()}
						<Heart class="size-4 {animal.liked ? 'fill-current' : ''}" />
					{/snippet}
					{animal.liked ? m.app_unsave() : m.app_save()}
				</Button>
				{#if !user?.suspended_at}
					<Button
						fullWidth
						disabled={animal.status !== "live" || interestLoading}
						onclick={() => void openInterest()}
					>
						{m.shelter_interest_cta()}
					</Button>
				{/if}
			</div>
		</footer>
	{/if}
</article>
