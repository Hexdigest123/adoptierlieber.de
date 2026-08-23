<script lang="ts">
	import Menu from "lucide-svelte/icons/menu";
	import X from "lucide-svelte/icons/x";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import { getLocale, setLocale, locales } from "$lib/paraglide/runtime";
	import Logo from "$lib/components/ui/Logo.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import AccountMenu from "$lib/components/ui/AccountMenu.svelte";

	let { user }: { user: App.Locals["user"] } = $props();

	let menuOpen = $state(false);
	/** Home: hidden until first scroll, then stays. Other routes: always on. */
	let homeRevealed = $state(false);

	const isHome = $derived(page.route.id === "/");
	const isApp = $derived(page.url.pathname.startsWith("/app"));
	const pinned = $derived(!isHome || homeRevealed);

	$effect(() => {
		if (!isHome) return;
		homeRevealed = window.scrollY > 24;
		function onScroll() {
			if (window.scrollY > 24) homeRevealed = true;
		}
		window.addEventListener("scroll", onScroll, { passive: true });
		return () => window.removeEventListener("scroll", onScroll);
	});

	const navItems = [
		{ label: () => m.header_nav_animals(), href: "/#showcase" },
		{ label: () => m.header_nav_reviews(), href: "/#reviews" },
		{ label: () => m.header_nav_contact(), href: "/#contact" },
	];

	function closeMenu() {
		menuOpen = false;
	}
</script>

<a
	href="#content"
	class="sr-only z-50 rounded-full bg-coral-600 px-4 py-2 font-semibold text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
>
	{m.skip_to_content()}
</a>

<header
	class="z-40 border-b border-sand-200 bg-white/90 backdrop-blur transition-transform duration-300 ease-out {pinned
		? isHome
			? 'fixed inset-x-0 top-0'
			: 'sticky top-0'
		: 'pointer-events-none fixed inset-x-0 top-0 -translate-y-full'}"
	aria-hidden={!pinned}
	inert={!pinned}
>
	<div class="relative mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
		<a
			href={resolve("/")}
			class="relative z-10 rounded-full focus-ring"
			aria-label={m.brand_name()}
		>
			<Logo />
		</a>

		{#if !isApp}
			<nav
				aria-label={m.brand_name()}
				class="absolute top-1/2 left-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 md:flex"
			>
				{#each navItems as item (item.href)}
					<a
						href={item.href}
						class="rounded-full px-3 py-2 text-sm font-semibold text-sand-800 focus-ring hover:bg-peach-100 hover:text-coral-700"
					>
						{item.label()}
					</a>
				{/each}
			</nav>
		{/if}

		<div class="relative z-10 hidden items-center gap-2 md:flex">
			<div
				class="mr-1 flex items-center rounded-full border border-sand-200 p-0.5"
				role="group"
				aria-label={m.header_locale_label()}
			>
				{#each locales as locale (locale)}
					<button
						type="button"
						onclick={() => setLocale(locale)}
						aria-pressed={getLocale() === locale}
						class="min-h-11 min-w-11 cursor-pointer rounded-full px-2.5 text-xs font-bold uppercase focus-ring {getLocale() ===
						locale
							? 'bg-coral-600 text-white'
							: 'text-sand-600 hover:text-coral-700'}"
					>
						{locale}
					</button>
				{/each}
			</div>

			{#if user}
				<AccountMenu {user} />
			{:else}
				<Button href={resolve("/login")} variant="ghost" size="sm">{m.header_login()}</Button>
				<Button href={resolve("/register")} size="sm">{m.header_register()}</Button>
			{/if}
		</div>

		<div class="flex items-center gap-1 md:hidden">
			{#if user}
				<AccountMenu {user} onNavigate={closeMenu} />
			{/if}
			<button
				type="button"
				class="flex size-11 cursor-pointer items-center justify-center rounded-full text-sand-900 focus-ring hover:bg-peach-100"
				aria-expanded={menuOpen}
				aria-controls="mobile-menu"
				aria-label={menuOpen ? m.header_menu_close() : m.header_menu_open()}
				onclick={() => (menuOpen = !menuOpen)}
			>
				{#if menuOpen}<X class="size-6" aria-hidden="true" />{:else}<Menu
						class="size-6"
						aria-hidden="true"
					/>{/if}
			</button>
		</div>
	</div>

	{#if menuOpen}
		<nav
			id="mobile-menu"
			aria-label={m.brand_name()}
			class="border-t border-sand-200 bg-white md:hidden"
		>
			<div class="flex flex-col gap-1 px-4 py-4">
				{#if !isApp}
					{#each navItems as item (item.href)}
						<a
							href={item.href}
							onclick={closeMenu}
							class="rounded-xl px-4 py-3 text-base font-semibold text-sand-800 focus-ring hover:bg-peach-100"
						>
							{item.label()}
						</a>
					{/each}
					<hr class="my-2 border-sand-200" />
				{/if}
				{#if !user}
					<a
						href={resolve("/login")}
						onclick={closeMenu}
						class="rounded-xl px-4 py-3 text-base font-semibold text-sand-800 focus-ring hover:bg-peach-100"
					>
						{m.header_login()}
					</a>
					<a
						href={resolve("/register")}
						onclick={closeMenu}
						class="rounded-xl bg-coral-600 px-4 py-3 text-center text-base font-semibold text-white focus-ring hover:bg-coral-700"
					>
						{m.header_register()}
					</a>
				{/if}
				<div
					class="mt-2 flex items-center gap-2 px-4"
					role="group"
					aria-label={m.header_locale_label()}
				>
					{#each locales as locale (locale)}
						<button
							type="button"
							onclick={() => setLocale(locale)}
							aria-pressed={getLocale() === locale}
							class="min-h-11 cursor-pointer rounded-full px-4 py-2 text-sm font-bold uppercase focus-ring {getLocale() ===
							locale
								? 'bg-coral-600 text-white'
								: 'text-sand-600 hover:text-coral-700'}"
						>
							{locale}
						</button>
					{/each}
				</div>
			</div>
		</nav>
	{/if}
</header>
