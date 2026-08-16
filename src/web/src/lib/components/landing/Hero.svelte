<script lang="ts">
	import ArrowRight from "lucide-svelte/icons/arrow-right";
	import PawPrint from "lucide-svelte/icons/paw-print";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";

	const stats = [
		{ value: () => m.hero_stat_animals_value(), label: () => m.hero_stat_animals_label() },
		{ value: () => m.hero_stat_shelters_value(), label: () => m.hero_stat_shelters_label() },
		{ value: () => m.hero_stat_adoptions_value(), label: () => m.hero_stat_adoptions_label() },
	];
</script>

<section
	class="relative overflow-hidden bg-gradient-to-br from-peach-100 via-peach-50 to-coral-100 px-4 py-16 sm:px-6 sm:py-24"
	aria-labelledby="hero-title"
>
	<!-- Decorative soft glow -->
	<div
		class="pointer-events-none absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-peach-300/40 blur-3xl"
		aria-hidden="true"
	></div>

	<!-- Fade into the next section (showcase) -->
	<div
		class="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-peach-50"
		aria-hidden="true"
	></div>

	<!-- Floating paws (decorative) -->
	<div class="pointer-events-none absolute inset-0" aria-hidden="true">
		<PawPrint
			class="absolute top-[12%] left-[8%] size-10 rotate-[-18deg] animate-float text-coral-300"
			style="--float-rotate: -18deg"
		/>
		<PawPrint
			class="absolute top-[22%] right-[10%] size-14 rotate-[14deg] animate-float-slow text-peach-400"
			style="--float-rotate: 14deg"
		/>
		<PawPrint
			class="absolute bottom-[18%] left-[14%] size-8 rotate-[24deg] animate-float-slow text-peach-500/70"
			style="--float-rotate: 24deg"
		/>
		<PawPrint
			class="absolute right-[16%] bottom-[26%] size-9 rotate-[-10deg] animate-float text-coral-400/60"
			style="--float-rotate: -10deg"
		/>
	</div>

	<div class="relative mx-auto max-w-4xl text-center">
		<h1
			id="hero-title"
			class="text-4xl font-black tracking-tight text-balance text-sand-950 sm:text-6xl"
		>
			{m.hero_title()}
		</h1>
		<p class="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-pretty text-sand-800">
			{m.hero_subtitle()}
		</p>
		<div class="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
			<Button href={resolve("/register")} size="lg" class="w-full sm:w-auto">
				{m.hero_cta_adopter()}
				{#snippet iconRight()}<ArrowRight class="size-5" />{/snippet}
			</Button>
			<Button
				href="{resolve('/register')}?type=shelter"
				variant="outline"
				size="lg"
				class="w-full bg-white/60 sm:w-auto"
			>
				{m.hero_cta_shelter()}
			</Button>
		</div>

		<dl class="mx-auto mt-14 grid max-w-2xl grid-cols-1 gap-6 sm:grid-cols-3">
			{#each stats as stat (stat.label())}
				<div
					class="flex flex-col items-center gap-1 rounded-2xl bg-white/60 px-4 py-5 shadow-sm backdrop-blur"
				>
					<dt class="order-2 text-sm font-medium text-sand-700">{stat.label()}</dt>
					<dd class="order-1 text-3xl font-black text-coral-700">{stat.value()}</dd>
				</div>
			{/each}
		</dl>
	</div>
</section>
