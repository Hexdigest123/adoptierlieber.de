<script lang="ts">
	import type { LayoutProps } from "./$types";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import Logo from "$lib/components/ui/Logo.svelte";
	import AccountMenu from "$lib/components/ui/AccountMenu.svelte";
	import House from "lucide-svelte/icons/house";
	import LayoutGrid from "lucide-svelte/icons/layout-grid";
	import ClipboardList from "lucide-svelte/icons/clipboard-list";
	import Ban from "lucide-svelte/icons/ban";
	import ScrollText from "lucide-svelte/icons/scroll-text";
	import Users from "lucide-svelte/icons/users";
	import Ellipsis from "lucide-svelte/icons/ellipsis";
	import Search from "lucide-svelte/icons/search";
	import { dialog } from "$lib/dialog";

	let { data, children }: LayoutProps = $props();

	let moreOpen = $state(false);
	let search = $state("");

	$effect(() => {
		search = page.url.searchParams.get("q") ?? "";
	});

	const user = $derived(data.user);
	const pending = $derived(data.pendingCount);

	type NavHref =
		| "/admin"
		| "/admin/catalog"
		| "/admin/applications"
		| "/admin/bans"
		| "/admin/audit"
		| "/admin/team";

	type NavItem = {
		href: NavHref;
		label: () => string;
		icon: typeof House;
		badge?: number;
		match: (path: string) => boolean;
	};

	const nav = $derived<NavItem[]>([
		{
			href: "/admin",
			label: () => m.admin_nav_home(),
			icon: House,
			match: (path) => path === "/admin",
		},
		{
			href: "/admin/catalog",
			label: () => m.admin_nav_catalog(),
			icon: LayoutGrid,
			match: (path) => path.startsWith("/admin/catalog"),
		},
		{
			href: "/admin/applications",
			label: () => m.admin_nav_applications(),
			icon: ClipboardList,
			badge: pending,
			match: (path) => path.startsWith("/admin/applications"),
		},
		{
			href: "/admin/bans",
			label: () => m.admin_nav_bans(),
			icon: Ban,
			match: (path) => path.startsWith("/admin/bans"),
		},
		{
			href: "/admin/audit",
			label: () => m.admin_nav_audit(),
			icon: ScrollText,
			match: (path) => path.startsWith("/admin/audit"),
		},
		{
			href: "/admin/team",
			label: () => m.admin_nav_team(),
			icon: Users,
			match: (path) => path.startsWith("/admin/team"),
		},
	]);

	const mobilePrimary = $derived(nav.slice(0, 3));
	const mobileMore = $derived(nav.slice(3));

	function navClass(active: boolean): string {
		return active
			? "bg-coral-50 text-coral-800"
			: "text-sand-700 hover:bg-peach-50 hover:text-coral-800";
	}
</script>

<div class="flex min-h-dvh bg-sand-50 font-sans text-sand-900">
	<aside class="hidden w-60 shrink-0 flex-col border-r border-sand-200 bg-white lg:flex">
		<a
			href={resolve("/admin")}
			class="flex items-center gap-2 px-5 py-4 focus-ring"
			aria-label={m.brand_name()}
		>
			<Logo />
			<span class="text-base font-bold tracking-tight text-sand-950">{m.brand_name()}</span>
		</a>
		<nav class="flex flex-1 flex-col gap-1 px-3 py-2" aria-label={m.header_admin()}>
			{#each nav as item (item.href)}
				{@const active = item.match(page.url.pathname)}
				<a
					href={resolve(item.href)}
					class="flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold focus-ring {navClass(
						active,
					)}"
					aria-current={active ? "page" : undefined}
				>
					<item.icon class="size-5 shrink-0" aria-hidden="true" />
					<span class="flex-1">{item.label()}</span>
					{#if item.badge && item.badge > 0}
						<span
							class="min-w-6 rounded-full bg-coral-600 px-1.5 text-center text-xs text-white tabular-nums"
						>
							{item.badge}
						</span>
					{/if}
				</a>
			{/each}
		</nav>
	</aside>

	<div class="flex min-w-0 flex-1 flex-col">
		<header
			class="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-sand-200 bg-white/90 px-3 backdrop-blur sm:px-5"
		>
			<a
				href={resolve("/admin")}
				class="flex items-center gap-2 rounded-full focus-ring lg:hidden"
				aria-label={m.brand_name()}
			>
				<Logo />
			</a>
			<form method="GET" action={resolve("/admin/catalog")} class="min-w-0 flex-1">
				<label class="sr-only" for="admin-search">{m.admin_search_submit()}</label>
				<div class="relative">
					<Search
						class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-sand-500"
						aria-hidden="true"
					/>
					<input
						id="admin-search"
						name="q"
						value={search}
						placeholder={m.admin_search_placeholder()}
						class="h-10 w-full rounded-2xl border border-sand-200 bg-sand-50 pr-3 pl-9 text-sm text-sand-900 focus-ring placeholder:text-sand-400"
					/>
				</div>
			</form>
			{#if user}
				<AccountMenu {user} />
			{/if}
		</header>

		<main id="content" class="flex-1 px-3 py-5 pb-24 sm:px-6 lg:pb-8">
			{@render children()}
		</main>
	</div>

	<nav
		class="fixed inset-x-0 bottom-0 z-30 border-t border-sand-200 bg-white lg:hidden"
		aria-label={m.header_admin()}
	>
		<div class="grid grid-cols-4">
			{#each mobilePrimary as item (item.href)}
				{@const active = item.match(page.url.pathname)}
				<a
					href={resolve(item.href)}
					aria-label={item.label()}
					class="relative flex min-h-11 flex-col items-center gap-1 px-2 py-2 text-xs font-semibold focus-ring {active
						? 'text-coral-700'
						: 'text-sand-600'}"
					aria-current={active ? "page" : undefined}
				>
					<item.icon class="size-5" aria-hidden="true" />
					{item.label()}
					{#if item.badge && item.badge > 0}
						<span
							class="absolute top-1 right-4 min-w-4 rounded-full bg-coral-600 px-1 text-center text-[10px] text-white"
						>
							{item.badge}
						</span>
					{/if}
				</a>
			{/each}
			<button
				type="button"
				class="flex min-h-11 flex-col items-center gap-1 px-2 py-2 text-xs font-semibold focus-ring {moreOpen ||
				mobileMore.some((item) => item.match(page.url.pathname))
					? 'text-coral-700'
					: 'text-sand-600'}"
				aria-expanded={moreOpen}
				onclick={() => (moreOpen = !moreOpen)}
			>
				<Ellipsis class="size-5" aria-hidden="true" />
				{m.admin_nav_more()}
			</button>
		</div>
	</nav>

	{#if moreOpen}
		<div class="fixed inset-0 z-40 lg:hidden">
			<button
				type="button"
				class="absolute inset-0 bg-sand-950/40"
				aria-label={m.admin_cancel()}
				onclick={() => (moreOpen = false)}
			></button>
			<div
				class="absolute inset-x-0 bottom-0 rounded-t-2xl border-t border-sand-200 bg-white p-4 pb-8"
				role="dialog"
				aria-modal="true"
				aria-label={m.admin_nav_more()}
				use:dialog={() => (moreOpen = false)}
			>
				<div class="mb-3 h-1 w-10 self-center rounded-full bg-sand-200"></div>
				<div class="flex flex-col gap-1">
					{#each mobileMore as item (item.href)}
						<a
							href={resolve(item.href)}
							onclick={() => (moreOpen = false)}
							class="flex items-center gap-3 rounded-2xl px-3 py-3 text-sm font-semibold text-sand-800 focus-ring hover:bg-peach-50"
						>
							<item.icon class="size-5" aria-hidden="true" />
							{item.label()}
						</a>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>
