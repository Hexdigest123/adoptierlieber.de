<script lang="ts">
	import ArrowRight from "lucide-svelte/icons/arrow-right";
	import ChevronDown from "lucide-svelte/icons/chevron-down";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import Logo from "$lib/components/ui/Logo.svelte";
	import AccountMenu from "$lib/components/ui/AccountMenu.svelte";
	import LocaleSwitcher from "$lib/components/ui/LocaleSwitcher.svelte";

	let { user }: { user: App.Locals["user"] } = $props();
</script>

<section
	class="sticky top-0 z-0 flex h-dvh min-h-dvh items-center justify-center overflow-hidden bg-gradient-to-br from-peach-100 via-peach-50 to-coral-100 px-4 pt-24 pb-16 sm:px-6"
	aria-labelledby="hero-title"
>
	<div
		class="absolute inset-x-0 top-0 z-10 flex items-center justify-between gap-3 px-4 py-3 sm:px-6"
	>
		<a href={resolve("/")} class="shrink-0 rounded-full focus-ring" aria-label={m.brand_name()}>
			<Logo class="size-11" />
		</a>
		<div class="flex items-center gap-2">
			<LocaleSwitcher />
			{#if user}
				<AccountMenu {user} />
			{:else}
				<Button href={resolve("/login")} variant="ghost" size="sm">{m.header_login()}</Button>
				<!-- max-sm:hidden, because the Button's own inline-flex beats a plain `hidden` -->
				<Button href={resolve("/register")} size="sm" class="max-sm:hidden"
					>{m.header_register()}</Button
				>
			{/if}
		</div>
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
		class="absolute inset-x-0 bottom-5 z-10 mx-auto flex w-fit flex-col items-center gap-1 rounded-full px-3 py-2 text-sm font-medium text-sand-700 focus-ring hover:text-coral-700"
	>
		{m.hero_scroll()}
		<ChevronDown class="size-5 animate-hero-hint" aria-hidden="true" />
	</a>
</section>
