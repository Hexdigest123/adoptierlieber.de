<script lang="ts">
	import Heart from "lucide-svelte/icons/heart";
	import X from "lucide-svelte/icons/x";
	import RotateCcw from "lucide-svelte/icons/rotate-ccw";
	import { resolve } from "$app/paths";
	import { goto } from "$app/navigation";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import EmptyAnimals from "$lib/components/EmptyAnimals.svelte";
	import type { PublicAnimal } from "$lib/types/catalog";
	import { ageLabel, coverPhoto, distanceLabel, speciesLabel } from "$lib/app/format";
	import AnimalPhoto from "./AnimalPhoto.svelte";

	const SWIPE_THRESHOLD = 100;
	const TAP_SLOP = 8;

	let {
		animals = $bindable(),
		emptyKind,
		rangeLabel,
		onneedmore,
		onretry,
		onwiden,
		onclear,
		onresetseen,
		onfocus,
	}: {
		animals: PublicAnimal[];
		emptyKind: "filters" | "caught_up" | "catalog" | "error" | null;
		rangeLabel: string;
		onneedmore: () => void;
		onretry: () => void;
		onwiden: () => void;
		onclear: () => void;
		onresetseen: () => void;
		onfocus?: (animal: PublicAnimal) => void;
	} = $props();

	let offsetX = $state(0);
	let offsetY = $state(0);
	let dragging = $state(false);
	let moved = $state(0);
	let fling = $state<"left" | "right" | null>(null);
	let announcement = $state("");
	let undoUntil = $state(0);
	let undoTimer: ReturnType<typeof setTimeout> | undefined;
	let reasonTimer: ReturnType<typeof setTimeout> | undefined;
	let askReason = $state(false);
	let pendingSkip = $state<PublicAnimal | null>(null);

	const passReasons = [
		{ id: "too_far", label: () => m.app_pass_too_far() },
		{ id: "too_young", label: () => m.app_pass_too_young() },
		{ id: "too_old", label: () => m.app_pass_too_old() },
		{ id: "species", label: () => m.app_pass_species() },
		{ id: "other", label: () => m.app_pass_other() },
	] as const;

	const current = $derived(animals[0]);

	function describe(animal: PublicAnimal | undefined): string {
		if (!animal) return "";
		return `${animal.name}, ${speciesLabel(animal.species)}, ${ageLabel(animal.age_months, animal.age_unknown)}`;
	}

	function reducedMotion(): boolean {
		return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
	}

	async function recordImpression(id: string) {
		try {
			await fetch(`/api/animals/${id}/impressions`, { method: "POST" });
		} catch {
			// fail open
		}
	}

	$effect(() => {
		if (current) void recordImpression(current.id);
	});

	async function writeSwipe(action: "like" | "skip", animalId: string, reason?: string) {
		await fetch("/api/swipes", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ animal_id: animalId, action, reason }),
		});
	}

	function completeSwipe(direction: "left" | "right") {
		if (!current || fling) return;
		const gone = current;
		fling = direction;
		announcement = `${direction === "right" ? m.showcase_like() : m.showcase_nope()}: ${gone.name}`;
		const delay = reducedMotion() ? 0 : 250;
		setTimeout(() => {
			animals = animals.filter((row) => row.id !== gone.id);
			offsetX = 0;
			offsetY = 0;
			moved = 0;
			fling = null;
			if (animals[0]) announcement = describe(animals[0]);
			if (animals.length < 5) onneedmore();
		}, delay);
		if (direction === "left") {
			if (pendingSkip) void sendReason();
			pendingSkip = gone;
			askReason = true;
			clearTimeout(reasonTimer);
			reasonTimer = setTimeout(() => {
				void sendReason();
			}, 4000);
		} else {
			void writeSwipe("like", gone.id);
		}
		clearTimeout(undoTimer);
		undoUntil = Date.now() + 5000;
		undoTimer = setTimeout(() => {
			undoUntil = 0;
		}, 5000);
	}

	async function sendReason(reason?: string) {
		const gone = pendingSkip;
		if (!gone) {
			askReason = false;
			return;
		}
		clearTimeout(reasonTimer);
		askReason = false;
		pendingSkip = null;
		await writeSwipe("skip", gone.id, reason);
	}

	async function undo() {
		undoUntil = 0;
		clearTimeout(undoTimer);
		clearTimeout(reasonTimer);
		if (pendingSkip) {
			const gone = pendingSkip;
			askReason = false;
			pendingSkip = null;
			animals = [gone, ...animals.filter((row) => row.id !== gone.id)];
			return;
		}
		const res = await fetch("/api/swipes", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ animal_id: current?.id ?? "undo", action: "undo" }),
		});
		if (!res.ok) return;
		const body = (await res.json()) as { animal_id?: string };
		if (!body.animal_id) return;
		const detail = await fetch(`/api/animals/${body.animal_id}`);
		if (!detail.ok) return;
		const animal = (await detail.json()) as PublicAnimal;
		animals = [animal, ...animals.filter((row) => row.id !== animal.id)];
	}

	function onPointerDown(event: PointerEvent) {
		if (!current || fling) return;
		dragging = true;
		moved = 0;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) return;
		offsetX += event.movementX;
		offsetY += event.movementY;
		moved += Math.abs(event.movementX) + Math.abs(event.movementY);
	}

	function onPointerUp() {
		if (!dragging) return;
		dragging = false;
		if (moved <= TAP_SLOP && current) {
			offsetX = 0;
			offsetY = 0;
			if (onfocus) onfocus(current);
			else void goto(resolve(`/app/animals/${current.id}`));
			return;
		}
		if (Math.abs(offsetX) > SWIPE_THRESHOLD) {
			completeSwipe(offsetX > 0 ? "right" : "left");
		} else {
			offsetX = 0;
			offsetY = 0;
		}
	}

	function onKeydown(event: KeyboardEvent) {
		if (!current || fling) return;
		if (event.key === "ArrowRight") {
			event.preventDefault();
			completeSwipe("right");
		} else if (event.key === "ArrowLeft") {
			event.preventDefault();
			completeSwipe("left");
		} else if (event.key === "Enter") {
			event.preventDefault();
			if (onfocus) onfocus(current);
			else void goto(resolve(`/app/animals/${current.id}`));
		}
	}

	const topCardStyle = $derived.by(() => {
		if (fling === "right")
			return "transform: translate(550px, 40px) rotate(24deg); transition: transform 250ms ease-in;";
		if (fling === "left")
			return "transform: translate(-550px, 40px) rotate(-24deg); transition: transform 250ms ease-in;";
		const rotate = offsetX / 18;
		const transition = dragging ? "" : "transition: transform 200ms ease-out;";
		return `transform: translate(${offsetX}px, ${offsetY}px) rotate(${rotate}deg); touch-action: pan-y; ${transition}`;
	});

	const showUndo = $derived(undoUntil > Date.now());
</script>

<div class="flex w-full flex-1 flex-col items-center justify-center gap-5">
	<p aria-live="polite" class="sr-only">
		{announcement || (current ? describe(current) : m.app_empty_catalog_title())}
	</p>

	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<div
		class="relative h-115 w-full max-w-md sm:h-135"
		role="group"
		aria-label={m.showcase_deck_label()}
		aria-describedby="app-deck-hint"
		tabindex="0"
		onkeydown={onKeydown}
	>
		<p id="app-deck-hint" class="sr-only">{m.showcase_keyboard_hint()}</p>

		{#each animals.slice(0, 3) as animal, position (animal.id)}
			<div
				class="absolute inset-0 overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-lg select-none {position ===
					0 && !fling
					? 'cursor-grab active:cursor-grabbing'
					: ''}"
				style={position === 0
					? topCardStyle
					: `transform: translateY(${position * 10}px) scale(${1 - position * 0.05}); z-index: ${-position};`}
				onpointerdown={position === 0 ? onPointerDown : undefined}
				onpointermove={position === 0 ? onPointerMove : undefined}
				onpointerup={position === 0 ? onPointerUp : undefined}
				onpointercancel={position === 0 ? onPointerUp : undefined}
				aria-hidden={position !== 0}
			>
				<div class="relative h-72 w-full sm:h-88">
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
				<div class="flex flex-col gap-1.5 p-6">
					<p class="text-3xl font-bold text-sand-950">
						{animal.name}<span class="text-xl font-medium text-sand-600"
							>, {ageLabel(animal.age_months, animal.age_unknown)}</span
						>
					</p>
					<p class="text-base font-semibold text-coral-700">
						{speciesLabel(animal.species)}
						{distanceLabel(animal.distance_km, animal.shelter.city)}
					</p>
					{#if animal.traits.length > 0}
						<ul class="flex flex-wrap gap-2">
							{#each animal.traits.slice(0, 3) as trait (trait)}
								<li
									class="rounded-xl bg-peach-100 px-3 py-1.5 text-xs font-semibold text-coral-900"
								>
									{trait}
								</li>
							{/each}
						</ul>
					{/if}
					{#if animal.tagline}
						<p class="text-base text-sand-700">{animal.tagline}</p>
					{/if}
				</div>

				{#if position === 0}
					<span
						class="absolute top-5 left-5 rounded-lg border-4 border-emerald-600 px-3 py-1 text-2xl font-black tracking-widest text-emerald-700 uppercase"
						style="opacity: {fling === 'right'
							? 1
							: Math.min(Math.max(offsetX / SWIPE_THRESHOLD, 0), 1)}; transform: rotate(-14deg);"
						aria-hidden="true">{m.showcase_like()}</span
					>
					<span
						class="absolute top-5 right-5 rounded-lg border-4 border-coral-600 px-3 py-1 text-2xl font-black tracking-widest text-coral-700 uppercase"
						style="opacity: {fling === 'left'
							? 1
							: Math.min(Math.max(-offsetX / SWIPE_THRESHOLD, 0), 1)}; transform: rotate(14deg);"
						aria-hidden="true">{m.showcase_nope()}</span
					>
				{/if}
			</div>
		{/each}

		{#if !current && emptyKind === "catalog"}
			<EmptyAnimals
				title={m.app_empty_catalog_title()}
				text={m.app_empty_catalog_text()}
				class="absolute inset-0 max-w-none"
			/>
		{:else if !current && emptyKind}
			<div
				class="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-sand-300 bg-peach-50 p-8 text-center"
			>
				{#if emptyKind === "error"}
					<p class="text-xl font-bold text-sand-900">{m.app_empty_error_title()}</p>
					<p class="text-sm text-sand-700">{m.app_empty_error_text()}</p>
					<Button variant="outline" size="sm" onclick={onretry}>{m.app_retry()}</Button>
				{:else if emptyKind === "filters"}
					<p class="text-xl font-bold text-sand-900">{m.app_empty_filters_title()}</p>
					<p class="text-sm text-sand-700">{m.app_empty_filters_text({ range: rangeLabel })}</p>
					<div class="flex flex-wrap justify-center gap-2">
						<Button variant="outline" size="sm" onclick={onwiden}>{m.app_widen_range()}</Button>
						<Button variant="ghost" size="sm" onclick={onclear}>{m.app_clear_species()}</Button>
						<Button href={resolve("/app/search")} variant="ghost" size="sm"
							>{m.app_open_search()}</Button
						>
					</div>
				{:else}
					<p class="text-xl font-bold text-sand-900">{m.app_empty_caught_up_title()}</p>
					<p class="text-sm text-sand-700">{m.app_empty_caught_up_text()}</p>
					<div class="flex flex-wrap justify-center gap-2">
						<Button variant="outline" size="sm" onclick={onwiden}>{m.app_widen_range()}</Button>
						<Button variant="ghost" size="sm" onclick={onresetseen}
							>{m.app_empty_reset_seen()}</Button
						>
						<Button href={resolve("/app/likes")} variant="ghost" size="sm"
							>{m.app_open_likes()}</Button
						>
					</div>
				{/if}
			</div>
		{/if}
	</div>

	<div class="flex items-center gap-4">
		<button
			type="button"
			class="flex size-14 cursor-pointer items-center justify-center rounded-full border-2 border-coral-600 bg-white text-coral-700 shadow-sm focus-ring transition-colors hover:bg-coral-50 disabled:cursor-not-allowed disabled:opacity-40"
			aria-label={m.app_skip()}
			disabled={!current || !!fling}
			onclick={() => completeSwipe("left")}
		>
			<X class="size-7" aria-hidden="true" />
		</button>
		<button
			type="button"
			class="flex size-12 cursor-pointer items-center justify-center rounded-full border border-sand-300 bg-white text-sand-700 shadow-sm focus-ring hover:bg-peach-50 disabled:opacity-40"
			aria-label={m.app_undo()}
			disabled={!showUndo && !current}
			onclick={() => void undo()}
		>
			<RotateCcw class="size-5" aria-hidden="true" />
		</button>
		<button
			type="button"
			class="flex size-14 cursor-pointer items-center justify-center rounded-full border-2 border-emerald-700 bg-white text-emerald-700 shadow-sm focus-ring transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
			aria-label={m.app_like()}
			disabled={!current || !!fling}
			onclick={() => completeSwipe("right")}
		>
			<Heart class="size-7" aria-hidden="true" />
		</button>
	</div>

	{#if showUndo}
		<button
			type="button"
			class="rounded-full bg-sand-950 px-4 py-2 text-sm font-semibold text-white focus-ring"
			onclick={() => void undo()}
		>
			{m.app_undo_toast()}
		</button>
	{/if}

	{#if askReason}
		<div class="flex flex-col items-center gap-2">
			<p class="text-sm font-semibold text-sand-800">{m.app_pass_why()}</p>
			<div class="flex flex-wrap justify-center gap-2">
				{#each passReasons as reason (reason.id)}
					<button
						type="button"
						class="rounded-full border border-sand-200 px-3 py-1.5 text-sm font-semibold text-sand-800 focus-ring hover:border-coral-300"
						onclick={() => void sendReason(reason.id)}
					>
						{reason.label()}
					</button>
				{/each}
				<button
					type="button"
					class="rounded-full px-3 py-1.5 text-sm font-semibold text-sand-600 focus-ring"
					onclick={() => void sendReason()}
				>
					{m.app_pass_skip()}
				</button>
			</div>
		</div>
	{/if}
</div>
