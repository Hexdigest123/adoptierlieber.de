<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import { getLocale, setLocale, locales } from "$lib/paraglide/runtime";
	import Logo from "$lib/components/ui/Logo.svelte";
	import AccountMenu from "$lib/components/ui/AccountMenu.svelte";
	import LayoutGrid from "lucide-svelte/icons/layout-grid";
	import PawPrint from "lucide-svelte/icons/paw-print";
	import MessageCircle from "lucide-svelte/icons/message-circle";
	import SlidersHorizontal from "lucide-svelte/icons/sliders-horizontal";
	import ChevronDown from "lucide-svelte/icons/chevron-down";
	import type { ShelterMembershipSummary } from "$lib/types/session";
	import type { StaffShelter } from "$lib/types/shelter";

	type Props = {
		user: App.Locals["user"];
		memberships: ShelterMembershipSummary[];
		current: ShelterMembershipSummary | null;
		shelter: StaffShelter | null;
		unread: number;
	};

	let { user, memberships, current, shelter, unread }: Props = $props();

	const path = $derived(page.url.pathname);
	const status = $derived(
		shelter?.verification_status ?? current?.verification_status ?? "pending",
	);

	const tabs = $derived([
		{
			href: "/shelter",
			label: m.shelter_tab_overview(),
			icon: LayoutGrid,
			match: "exact" as const,
		},
		{
			href: "/shelter/animals",
			label: m.shelter_tab_animals(),
			icon: PawPrint,
			match: "prefix" as const,
		},
		{
			href: "/shelter/messages",
			label: m.shelter_tab_messages(),
			icon: MessageCircle,
			match: "prefix" as const,
			badge: unread,
		},
		{
			href: "/shelter/settings",
			label: m.shelter_tab_settings(),
			icon: SlidersHorizontal,
			match: "prefix" as const,
		},
	]);

	function active(href: string, match: "exact" | "prefix") {
		if (match === "exact") return path === href;
		return path === href || path.startsWith(`${href}/`);
	}

	let switchOpen = $state(false);
</script>

<a
	href="#content"
	class="sr-only z-50 rounded-full bg-coral-600 px-4 py-2 font-semibold text-white focus:not-sr-only focus:absolute focus:top-3 focus:left-3"
>
	{m.skip_to_content()}
</a>

<header class="sticky top-0 z-40 border-b border-sand-200 bg-white/90 backdrop-blur">
	<div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
		<div class="flex min-w-0 items-center gap-3">
			<a href={resolve("/")} class="rounded-full focus-ring" aria-label={m.brand_name()}>
				<Logo />
			</a>
			{#if current}
				{#if memberships.length > 1}
					<div class="relative">
						<button
							type="button"
							class="flex max-w-[14rem] cursor-pointer items-center gap-1 truncate rounded-full px-2 py-1 text-sm font-semibold text-sand-900 focus-ring hover:bg-peach-100 sm:max-w-xs"
							aria-expanded={switchOpen}
							onclick={() => (switchOpen = !switchOpen)}
						>
							<span class="truncate">{current.org_name}</span>
							<ChevronDown class="size-4 shrink-0" aria-hidden="true" />
						</button>
						{#if switchOpen}
							<ul
								class="absolute top-full left-0 z-50 mt-1 min-w-48 rounded-xl border border-sand-200 bg-white py-1 shadow-md"
							>
								{#each memberships as row (row.shelter_id)}
									<li>
										<a
											href="/shelter?shelter={row.shelter_id}"
											class="block truncate px-3 py-2 text-sm font-semibold text-sand-800 hover:bg-peach-50 {row.shelter_id ===
											current.shelter_id
												? 'bg-peach-50 text-coral-700'
												: ''}"
											onclick={() => (switchOpen = false)}
										>
											{row.org_name}
										</a>
									</li>
								{/each}
							</ul>
						{/if}
					</div>
				{:else}
					<p class="truncate text-sm font-semibold text-sand-900">{current.org_name}</p>
				{/if}
			{/if}
		</div>

		<nav class="hidden items-center gap-1 md:flex" aria-label={m.shelter_nav()}>
			{#each tabs as tab (tab.href)}
				{@const Icon = tab.icon}
				<a
					href={tab.href}
					class="relative flex items-center gap-2 rounded-full px-3 py-2 text-sm font-semibold focus-ring {active(
						tab.href,
						tab.match,
					)
						? 'bg-coral-50 text-coral-800'
						: 'text-sand-700 hover:bg-peach-100 hover:text-coral-700'}"
					aria-current={active(tab.href, tab.match) ? "page" : undefined}
				>
					<Icon class="size-4" aria-hidden="true" />
					{tab.label}
					{#if tab.badge}
						<span
							class="absolute -top-0.5 -right-0.5 min-w-4 rounded-full bg-coral-600 px-1 text-center text-[10px] font-bold text-white"
						>
							{tab.badge > 99 ? "99+" : tab.badge}
						</span>
					{/if}
				</a>
			{/each}
		</nav>

		<div class="flex items-center gap-2">
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
			{#if user}
				<AccountMenu {user} />
			{/if}
		</div>
	</div>
</header>

{#if status === "pending"}
	<div class="border-b border-peach-300 bg-peach-100 px-4 py-2 text-center text-sm text-sand-900">
		{m.shelter_banner_pending()}
	</div>
{:else if status === "rejected"}
	<div class="border-b border-coral-300 bg-coral-50 px-4 py-2 text-center text-sm text-coral-950">
		{m.shelter_banner_rejected()}
		<a href="mailto:pierre@adoptierlieber.de" class="font-semibold underline"
			>{m.shelter_banner_support()}</a
		>
	</div>
{/if}

<nav
	class="fixed inset-x-0 bottom-0 z-40 border-t border-sand-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
	aria-label={m.shelter_nav()}
>
	<div class="grid grid-cols-4">
		{#each tabs as tab (tab.href)}
			{@const Icon = tab.icon}
			<a
				href={tab.href}
				aria-label={tab.label}
				class="relative flex min-h-11 flex-col items-center gap-0.5 py-2 text-xs font-semibold focus-ring {active(
					tab.href,
					tab.match,
				)
					? 'text-coral-700'
					: 'text-sand-600'}"
				aria-current={active(tab.href, tab.match) ? "page" : undefined}
			>
				<Icon class="size-5" aria-hidden="true" />
				{tab.label}
				{#if tab.badge}
					<span
						class="absolute top-1 right-[calc(50%-18px)] min-w-4 rounded-full bg-coral-600 px-1 text-center text-[10px] font-bold text-white"
					>
						{tab.badge > 99 ? "99+" : tab.badge}
					</span>
				{/if}
			</a>
		{/each}
	</div>
</nav>
