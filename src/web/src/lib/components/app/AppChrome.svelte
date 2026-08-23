<script lang="ts">
	import type { Snippet } from "svelte";
	import { resolve } from "$app/paths";
	import { invalidateAll } from "$app/navigation";
	import { page } from "$app/state";
	import { onMount } from "svelte";
	import Compass from "lucide-svelte/icons/compass";
	import MapPin from "lucide-svelte/icons/map-pin";
	import LayoutGrid from "lucide-svelte/icons/layout-grid";
	import Heart from "lucide-svelte/icons/heart";
	import MessageCircle from "lucide-svelte/icons/message-circle";
	import Search from "lucide-svelte/icons/search";
	import Settings from "lucide-svelte/icons/settings";
	import { m } from "$lib/paraglide/messages";
	import { getLocale, setLocale, locales } from "$lib/paraglide/runtime";
	import Logo from "$lib/components/ui/Logo.svelte";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import AccountMenu from "$lib/components/ui/AccountMenu.svelte";
	import FilterSheet from "$lib/components/app/FilterSheet.svelte";
	import LocationSheet from "$lib/components/app/LocationSheet.svelte";
	import PrefsSheet from "$lib/components/app/PrefsSheet.svelte";
	import { hydrateSpecies, selectedSpecies, speciesQuery } from "$lib/app/filters.svelte";
	import type { UserPreferences } from "$lib/types/catalog";
	import type { SessionUser } from "$lib/types/session";

	let { user, children }: { user: SessionUser; children: Snippet } = $props();

	let filtersOpen = $state(false);
	let locationOpen = $state(false);
	let prefsOpen = $state(false);
	let locationOnboard = $state(false);
	let likeCount = $state(0);
	let unreadMessages = $state(0);
	let inRange = $state<number | null>(null);

	const prefs = $derived((user.preferences ?? null) as UserPreferences | null);
	const needsLocation = $derived(
		prefs?.onboarded !== true && user.home_lat == null && user.home_label == null,
	);
	const needsPrefs = $derived(prefs?.onboarded === true && prefs?.prefs_done !== true);
	const placeLabel = $derived(
		user.home_label ?? (user.home_lat != null ? m.app_map_you() : m.app_location_unset()),
	);
	const filtersActive = $derived(selectedSpecies().length > 0);

	const path = $derived(page.url.pathname);
	const onSearch = $derived(path.startsWith("/app/search"));
	const showFilters = $derived(
		path === "/app" ||
			onSearch ||
			path.startsWith("/app/map") ||
			path.startsWith("/app/catalog") ||
			path.startsWith("/app/likes"),
	);

	onMount(() => {
		hydrateSpecies();
		if (needsLocation) {
			locationOnboard = true;
			locationOpen = true;
		} else if (needsPrefs) prefsOpen = true;
		void refreshLikes();
		void refreshInRange();
	});

	$effect(() => {
		void path;
		void refreshUnread();
	});

	async function refreshInRange() {
		try {
			const params = new URLSearchParams({ mode: "search", per_page: "1" });
			const species = speciesQuery();
			if (species) params.set("species", species);
			const res = await fetch(`/api/animals?${params}`);
			if (!res.ok) return;
			const body = (await res.json()) as { in_range?: number; total?: number };
			inRange = body.in_range ?? body.total ?? null;
		} catch {
			// keep last
		}
	}

	async function refreshLikes() {
		try {
			const res = await fetch("/api/likes?per_page=1");
			if (!res.ok) return;
			const body = (await res.json()) as { total?: number };
			likeCount = body.total ?? 0;
		} catch {
			// keep last
		}
	}

	async function refreshUnread() {
		try {
			const res = await fetch("/api/chats");
			if (!res.ok) return;
			const body = (await res.json()) as { items?: { unread_for_me?: boolean }[] };
			unreadMessages = (body.items ?? []).filter((row) => row.unread_for_me).length;
		} catch {
			// keep last
		}
	}

	async function applyRange(next: number | null) {
		await fetch("/api/users/me", {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ max_range_km: next }),
		});
		await invalidateAll();
		void refreshInRange();
	}

	const tabs = [
		{ href: "/app", label: () => m.app_tab_discover(), icon: Compass, exact: true },
		{ href: "/app/map", label: () => m.app_tab_map(), icon: MapPin, exact: false },
		{ href: "/app/catalog", label: () => m.app_tab_catalog(), icon: LayoutGrid, exact: false },
		{ href: "/app/likes", label: () => m.app_tab_likes(), icon: Heart, exact: false },
		{ href: "/app/messages", label: () => m.app_tab_messages(), icon: MessageCircle, exact: false },
		{ href: "/profile", label: () => m.app_tab_profile(), icon: null, exact: false },
	] as const;

	function tabActive(href: string, exact: boolean): boolean {
		if (exact) return path === href;
		return path === href || path.startsWith(`${href}/`);
	}
</script>

<div class="flex min-h-dvh flex-col bg-peach-50">
	<a
		href="#content"
		class="sr-only z-50 rounded-full bg-coral-600 px-4 py-2 font-semibold text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
	>
		{m.skip_to_content()}
	</a>

	<header class="sticky top-0 z-40 border-b border-sand-200 bg-white/90 backdrop-blur">
		<div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
			<a href={resolve("/")} class="rounded-full focus-ring" aria-label={m.brand_name()}>
				<Logo />
			</a>

			<nav class="hidden items-center gap-1 md:flex" aria-label={m.app_nav_label()}>
				{#each tabs as tab (tab.href)}
					<a
						href={resolve(tab.href)}
						class="rounded-full px-3 py-1.5 text-sm font-semibold focus-ring {tabActive(
							tab.href,
							tab.exact,
						)
							? 'bg-coral-600 text-white'
							: 'text-sand-800 hover:bg-peach-100'}"
					>
						{tab.label()}
						{#if tab.href === "/app/likes" && likeCount > 0}
							<span class="ml-1 text-xs">({likeCount})</span>
						{/if}
						{#if tab.href === "/app/messages" && unreadMessages > 0}
							<span class="ml-1 text-xs">({unreadMessages})</span>
						{/if}
					</a>
				{/each}
			</nav>

			<div class="flex items-center gap-1 sm:gap-2">
				<button
					type="button"
					class="relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-sand-800 focus-ring hover:bg-peach-100 {showFilters
						? ''
						: 'invisible pointer-events-none'}"
					aria-label={m.app_filters()}
					aria-expanded={filtersOpen}
					aria-hidden={!showFilters}
					tabindex={showFilters ? undefined : -1}
					onclick={() => {
						filtersOpen = true;
						void refreshInRange();
					}}
				>
					<Settings class="size-5" aria-hidden="true" />
					{#if filtersActive}
						<span
							class="absolute top-2 right-2 size-2 rounded-full bg-coral-600"
							aria-hidden="true"
						></span>
					{/if}
				</button>
				<a
					href={resolve("/app/search")}
					class="flex size-11 shrink-0 items-center justify-center rounded-full text-sand-800 focus-ring hover:bg-peach-100 {showFilters &&
					!onSearch
						? ''
						: 'invisible pointer-events-none'}"
					aria-label={m.app_search()}
					aria-hidden={!(showFilters && !onSearch)}
					tabindex={showFilters && !onSearch ? undefined : -1}
				>
					<Search class="size-5" aria-hidden="true" />
				</a>
				<div
					class="hidden items-center rounded-full border border-sand-200 p-0.5 sm:flex"
					role="group"
					aria-label={m.header_locale_label()}
				>
					{#each locales as locale (locale)}
						<button
							type="button"
							onclick={() => setLocale(locale)}
							aria-pressed={getLocale() === locale}
							class="min-h-11 min-w-11 cursor-pointer rounded-full px-2 text-xs font-bold uppercase focus-ring {getLocale() ===
							locale
								? 'bg-coral-600 text-white'
								: 'text-sand-600 hover:text-coral-700'}"
						>
							{locale}
						</button>
					{/each}
				</div>
				<AccountMenu {user} />
			</div>
		</div>
	</header>

	<main
		id="content"
		class="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-4 pb-24 sm:px-6 md:pb-8"
	>
		{@render children()}
	</main>

	<nav
		class="fixed inset-x-0 bottom-0 z-40 border-t border-sand-200 bg-white/95 backdrop-blur md:hidden"
		aria-label={m.app_nav_label()}
	>
		<div class="mx-auto grid max-w-6xl grid-cols-6">
			{#each tabs as tab (tab.href)}
				<a
					href={resolve(tab.href)}
					aria-label={tab.label()}
					class="flex min-h-14 items-center justify-center focus-ring {tabActive(tab.href, tab.exact)
						? 'text-coral-700'
						: 'text-sand-600'}"
				>
					{#if tab.icon}
						<span class="relative">
							<tab.icon class="size-7" aria-hidden="true" />
							{#if tab.href === "/app/likes" && likeCount > 0}
								<span
									class="absolute -top-1 -right-2 rounded-full bg-coral-600 px-1 text-[9px] font-bold text-white"
									>{likeCount}</span
								>
							{/if}
							{#if tab.href === "/app/messages" && unreadMessages > 0}
								<span
									class="absolute -top-1 -right-2 rounded-full bg-coral-600 px-1 text-[9px] font-bold text-white"
									>{unreadMessages}</span
								>
							{/if}
						</span>
					{:else}
						<Avatar
							name={user.displayName ?? user.name}
							hasAvatar={user.hasAvatar}
							size="sm"
							class="size-8 text-[10px]"
						/>
					{/if}
				</a>
			{/each}
		</div>
	</nav>
</div>

<FilterSheet
	bind:open={filtersOpen}
	rangeKm={user.max_range_km}
	{inRange}
	{placeLabel}
	showLocation
	onchange={() => {
		void refreshInRange();
	}}
	onapply={(next) => void applyRange(next)}
	onlocation={() => {
		filtersOpen = false;
		locationOnboard = false;
		locationOpen = true;
	}}
/>
<LocationSheet
	bind:open={locationOpen}
	onboard={locationOnboard}
	onsaved={() => {
		void invalidateAll();
		if (locationOnboard) prefsOpen = true;
		void refreshInRange();
	}}
	onskip={() => {
		void invalidateAll();
		if (locationOnboard) prefsOpen = true;
		void refreshInRange();
	}}
/>
<PrefsSheet bind:open={prefsOpen} ondone={() => void invalidateAll()} />
