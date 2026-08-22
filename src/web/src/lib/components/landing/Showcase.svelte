<script lang="ts">
	import { m } from "$lib/paraglide/messages";
	import SwipeDeck from "./SwipeDeck.svelte";

	let mode = $state<"swipe" | "map">("swipe");
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
				{mode === "map" ? m.showcase_map_subtitle() : m.showcase_subtitle()}
			</p>
		</div>

		<div
			class="mx-auto mt-8 flex w-fit items-center rounded-full border border-sand-200 bg-white p-0.5"
			role="group"
			aria-label={m.showcase_mode_label()}
		>
			<button
				type="button"
				onclick={() => (mode = "swipe")}
				aria-pressed={mode === "swipe"}
				class="cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold focus-ring {mode ===
				'swipe'
					? 'bg-coral-600 text-white'
					: 'text-sand-600 hover:text-coral-700'}"
			>
				{m.showcase_mode_swipe()}
			</button>
			<button
				type="button"
				onclick={() => (mode = "map")}
				aria-pressed={mode === "map"}
				class="cursor-pointer rounded-full px-4 py-1.5 text-sm font-bold focus-ring {mode === 'map'
					? 'bg-coral-600 text-white'
					: 'text-sand-600 hover:text-coral-700'}"
			>
				{m.showcase_mode_map()}
			</button>
		</div>

		<div class="mt-12 flex justify-center">
			{#if mode === "swipe"}
				<SwipeDeck />
			{:else}
				{#await import("./ShelterMap.svelte")}
					<div
						class="h-[28rem] w-full animate-pulse rounded-3xl border border-sand-200 bg-white sm:h-[36rem]"
						aria-hidden="true"
					></div>
				{:then { default: ShelterMap }}
					<div class="w-full">
						<ShelterMap />
					</div>
				{/await}
			{/if}
		</div>
	</div>
</section>
