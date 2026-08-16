<script lang="ts">
	import Heart from "lucide-svelte/icons/heart";
	import X from "lucide-svelte/icons/x";
	import RotateCcw from "lucide-svelte/icons/rotate-ccw";
	import { m } from "$lib/paraglide/messages";
	import { animals } from "$lib/data/animals";
	import Button from "$lib/components/ui/Button.svelte";

	const SWIPE_THRESHOLD = 100;

	let index = $state(0);
	let offsetX = $state(0);
	let offsetY = $state(0);
	let dragging = $state(false);
	/** Direction of the fling-out animation, or null when idle. */
	let fling = $state<"left" | "right" | null>(null);
	/** Announced to screen readers via aria-live. */
	let announcement = $state("");

	const current = $derived(animals[index]);
	const total = animals.length;

	function describe(i: number): string {
		const a = animals[i];
		if (!a) return "";
		return `${m.showcase_card_position({ current: i + 1, total })}: ${a.name}, ${a.species()}, ${a.age()}, ${a.location}. ${a.tagline()}`;
	}

	function completeSwipe(direction: "left" | "right") {
		const gone = index;
		fling = direction;
		announcement = `${direction === "right" ? m.showcase_like() : m.showcase_nope()}: ${animals[gone]?.name ?? ""}`;
		setTimeout(() => {
			index = gone + 1;
			offsetX = 0;
			offsetY = 0;
			fling = null;
			if (animals[gone + 1]) {
				announcement = describe(gone + 1);
			}
		}, 250);
	}

	function restart() {
		index = 0;
		offsetX = 0;
		offsetY = 0;
		fling = null;
		announcement = describe(0);
	}

	function onPointerDown(event: PointerEvent) {
		if (!current || fling) return;
		dragging = true;
		(event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
	}

	function onPointerMove(event: PointerEvent) {
		if (!dragging) return;
		offsetX += event.movementX;
		offsetY += event.movementY;
	}

	function onPointerUp() {
		if (!dragging) return;
		dragging = false;
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
</script>

<div class="flex w-full flex-col items-center gap-6">
	<!-- Screen-reader live region: announces current card and swipe results. -->
	<p aria-live="polite" class="sr-only">
		{announcement || (current ? describe(index) : m.showcase_empty_title())}
	</p>

	<!-- svelte-ignore a11y_no_noninteractive_tabindex, a11y_no_noninteractive_element_interactions -->
	<!-- Intentionally keyboard-focusable: arrow keys swipe the deck (plan: keyboard + SR swipe). -->
	<div
		class="relative h-135 w-full max-w-md"
		role="group"
		aria-label={m.showcase_deck_label()}
		aria-describedby="swipe-deck-hint"
		tabindex="0"
		onkeydown={onKeydown}
	>
		<p id="swipe-deck-hint" class="sr-only">{m.showcase_keyboard_hint()}</p>

		{#each animals as animal, i (animal.id)}
			{@const position = i - index}
			{#if position >= 0 && position < 3}
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
					<img
						src={animal.image}
						alt=""
						draggable="false"
						class="h-88 w-full object-cover"
						width="400"
						height="500"
					/>
					<div class="flex flex-col gap-1.5 p-6">
						<p class="text-3xl font-bold text-sand-950">
							{animal.name}<span class="text-xl font-medium text-sand-600">, {animal.age()}</span>
						</p>
						<p class="text-base font-semibold text-coral-700">
							{animal.species()} · {animal.location}
						</p>
						<p class="text-base text-sand-700">{animal.tagline()}</p>
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
			{/if}
		{/each}

		{#if !current}
			<div
				class="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed border-sand-300 bg-peach-50 p-8 text-center"
			>
				<p class="text-xl font-bold text-sand-900">{m.showcase_empty_title()}</p>
				<p class="text-sm text-sand-700">{m.showcase_empty_text()}</p>
				<Button variant="outline" size="sm" onclick={restart}>
					{#snippet iconLeft()}<RotateCcw class="size-4" />{/snippet}
					{m.showcase_restart()}
				</Button>
			</div>
		{/if}
	</div>

	<div class="flex items-center gap-6">
		<button
			type="button"
			class="flex size-14 cursor-pointer items-center justify-center rounded-full border-2 border-coral-600 bg-white text-coral-700 shadow-sm focus-ring transition-colors hover:bg-coral-50 disabled:cursor-not-allowed disabled:opacity-40"
			aria-label={m.showcase_nope_action()}
			disabled={!current || !!fling}
			onclick={() => completeSwipe("left")}
		>
			<X class="size-7" aria-hidden="true" />
		</button>
		<button
			type="button"
			class="flex size-14 cursor-pointer items-center justify-center rounded-full border-2 border-emerald-700 bg-white text-emerald-700 shadow-sm focus-ring transition-colors hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
			aria-label={m.showcase_like_action()}
			disabled={!current || !!fling}
			onclick={() => completeSwipe("right")}
		>
			<Heart class="size-7" aria-hidden="true" />
		</button>
	</div>
</div>
