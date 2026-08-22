<script lang="ts">
	import Menu from "lucide-svelte/icons/menu";
	import X from "lucide-svelte/icons/x";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import { getLocale, setLocale, locales } from "$lib/paraglide/runtime";
	import Logo from "$lib/components/ui/Logo.svelte";
	import Button from "$lib/components/ui/Button.svelte";

	let { user }: { user: App.Locals["user"] } = $props();

	let menuOpen = $state(false);

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

<header class="sticky top-0 z-40 border-b border-sand-200 bg-white/90 backdrop-blur">
	<div class="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
		<a href={resolve("/")} class="rounded-full focus-ring" aria-label={m.brand_name()}>
			<Logo />
		</a>

		<nav aria-label={m.brand_name()} class="hidden items-center gap-1 md:flex">
			{#each navItems as item (item.href)}
				<a
					href={item.href}
					class="rounded-full px-3 py-2 text-sm font-semibold text-sand-800 focus-ring hover:bg-peach-100 hover:text-coral-700"
				>
					{item.label()}
				</a>
			{/each}
		</nav>

		<div class="hidden items-center gap-2 md:flex">
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
						class="cursor-pointer rounded-full px-2.5 py-1 text-xs font-bold uppercase focus-ring {getLocale() ===
						locale
							? 'bg-coral-600 text-white'
							: 'text-sand-600 hover:text-coral-700'}"
					>
						{locale}
					</button>
				{/each}
			</div>

			{#if user}
				<span class="max-w-40 truncate text-sm font-semibold text-sand-800">
					{user.displayName ?? user.name}
				</span>
				<form method="POST" action={resolve("/logout")} class="inline">
					<Button type="submit" variant="ghost" size="sm">{m.header_logout()}</Button>
				</form>
			{:else}
				<Button href={resolve("/login")} variant="ghost" size="sm">{m.header_login()}</Button>
				<Button href={resolve("/register")} size="sm">{m.header_register()}</Button>
			{/if}
		</div>

		<button
			type="button"
			class="flex size-11 cursor-pointer items-center justify-center rounded-full text-sand-900 focus-ring hover:bg-peach-100 md:hidden"
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

	{#if menuOpen}
		<nav
			id="mobile-menu"
			aria-label={m.brand_name()}
			class="border-t border-sand-200 bg-white md:hidden"
		>
			<div class="flex flex-col gap-1 px-4 py-4">
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
				{#if user}
					<span class="px-4 py-2 text-sm font-semibold text-sand-800"
						>{user.displayName ?? user.name}</span
					>
					<form method="POST" action={resolve("/logout")}>
						<button
							type="submit"
							class="w-full cursor-pointer rounded-xl px-4 py-3 text-left text-base font-semibold text-coral-700 focus-ring hover:bg-coral-50"
						>
							{m.header_logout()}
						</button>
					</form>
				{:else}
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
