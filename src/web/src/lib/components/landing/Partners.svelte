<script lang="ts">
	import { m } from "$lib/paraglide/messages";
	import type { PublicMapShelter } from "$lib/types/catalog";

	let {
		shelters,
		loggedIn = false,
	}: {
		shelters: PublicMapShelter[];
		loggedIn?: boolean;
	} = $props();
</script>

<section
	id="partners"
	class="scroll-mt-16 bg-white px-4 py-16 sm:px-6 sm:py-24"
	aria-labelledby="partners-title"
>
	<div class="mx-auto max-w-6xl">
		<div class="mx-auto max-w-2xl text-center">
			<h2 id="partners-title" class="text-3xl font-black tracking-tight text-sand-950 sm:text-4xl">
				{m.partners_title()}
			</h2>
			<p class="mt-4 text-lg text-sand-700">{m.partners_subtitle()}</p>
		</div>

		<div class="mt-12 flex justify-center">
			{#await import("./ShelterMap.svelte")}
				<div
					class="h-[28rem] w-full animate-pulse rounded-3xl border border-sand-200 bg-peach-50 sm:h-[36rem]"
					aria-hidden="true"
				></div>
			{:then { default: ShelterMap }}
				<div class="w-full">
					<ShelterMap {shelters} {loggedIn} />
				</div>
			{/await}
		</div>
	</div>
</section>
