<script lang="ts">
	import ArrowRight from "lucide-svelte/icons/arrow-right";
	import ChevronDown from "lucide-svelte/icons/chevron-down";
	import PawPrint from "lucide-svelte/icons/paw-print";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";

	let { user }: { user: App.Locals["user"] } = $props();
</script>

<section
	class="sticky top-0 z-0 flex h-dvh min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-peach-100 via-peach-50 to-coral-100 px-4 py-16 sm:px-6"
	aria-labelledby="hero-title"
>
	<div class="pointer-events-none absolute inset-0" aria-hidden="true">
		<!-- Decorative soft glow -->
		<div
			class="absolute -top-32 left-1/2 h-96 w-[42rem] -translate-x-1/2 rounded-full bg-peach-300/40 blur-3xl"
		></div>

		<!-- Floating paws (decorative) -->
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
			class="animate-hero-in text-5xl font-black tracking-tight text-balance text-sand-950 sm:text-7xl"
		>
			{m.hero_title()}
		</h1>
		<p
			class="mx-auto mt-6 max-w-2xl animate-hero-in-delayed text-lg leading-relaxed text-pretty text-sand-800 sm:text-xl"
		>
			{m.hero_subtitle()}
		</p>
		<div class="mt-10 flex animate-hero-in-late items-center justify-center">
			<Button href={resolve(user ? "/app" : "/register")} size="lg" class="w-full sm:w-auto">
				{m.hero_cta_adopter()}
				{#snippet iconRight()}<ArrowRight class="size-5" />{/snippet}
			</Button>
		</div>
	</div>

	<a
		href="#showcase"
		class="absolute inset-x-0 bottom-5 z-10 mx-auto flex w-fit flex-col items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-sand-700 focus-ring hover:text-coral-700"
	>
		{m.hero_scroll()}
		<ChevronDown class="size-5 animate-hero-hint" aria-hidden="true" />
	</a>
</section>
