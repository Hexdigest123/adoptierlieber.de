<script lang="ts">
	import type { PageProps } from "./$types";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Card from "$lib/components/ui/Card.svelte";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import Select from "$lib/components/ui/Select.svelte";
	import TabNav from "$lib/components/ui/TabNav.svelte";
	import AdminAnimalCardView from "$lib/components/admin/AdminAnimalCard.svelte";
	import AdminShelterCardView from "$lib/components/admin/AdminShelterCard.svelte";
	import CatalogGrid from "$lib/components/admin/CatalogGrid.svelte";
	import EmptyState from "$lib/components/admin/EmptyState.svelte";
	import StatusPill from "$lib/components/admin/StatusPill.svelte";
	import { catalogListPath } from "$lib/admin/api";
	import { searchParams } from "$lib/query";
	import { pagedList } from "$lib/admin/paged.svelte";
	import type { AdminAnimalCard, AdminShelterCard, AdminUserCard } from "$lib/admin/types";

	let { data }: PageProps = $props();

	const list = pagedList<unknown>(
		() => data.list,
		(pageNum) => catalogListPath(data, pageNum),
	);

	const facets = [
		{ type: "users" as const, label: () => m.admin_catalog_users() },
		{ type: "shelters" as const, label: () => m.admin_catalog_shelters() },
		{ type: "animals" as const, label: () => m.admin_catalog_animals() },
	];

	function hrefFor(next: Record<string, string | undefined>) {
		const type = next.type ?? data.type;
		const params = searchParams({
			type,
			q: next.q ?? data.q,
			status: next.status ?? data.status,
			city: next.city ?? data.city,
			verified: type === "users" ? (next.verified ?? data.verified) : "",
			species: type === "animals" ? (next.species ?? data.species) : "",
		});
		return resolve(`/admin/catalog?${params}`);
	}

	const facetItems = $derived(
		facets.map((facet) => ({
			href: hrefFor({ type: facet.type }),
			label: facet.label(),
			active: data.type === facet.type,
		})),
	);

	const statusOptions = $derived([
		{ value: "", label: m.admin_filter_all() },
		...(data.type === "users"
			? [
					{ value: "active", label: m.admin_filter_active() },
					{ value: "suspended", label: m.admin_filter_suspended() },
				]
			: data.type === "shelters"
				? [
						{ value: "pending", label: m.admin_filter_pending() },
						{ value: "verified", label: m.admin_filter_verified() },
						{ value: "rejected", label: m.admin_filter_rejected() },
					]
				: [
						{ value: "draft", label: m.admin_status_draft() },
						{ value: "live", label: m.admin_status_live() },
						{ value: "found_home", label: m.admin_status_found_home() },
					]),
	]);
	const verifiedOptions = $derived([
		{ value: "", label: m.admin_filter_all() },
		{ value: "yes", label: m.admin_filter_yes() },
		{ value: "no", label: m.admin_filter_no() },
	]);
	const speciesOptions = $derived([
		{ value: "", label: m.admin_filter_all() },
		{ value: "cat", label: m.admin_species_cat() },
		{ value: "dog", label: m.admin_species_dog() },
		{ value: "rabbit", label: m.admin_species_rabbit() },
		{ value: "guinea_pig", label: m.admin_species_guinea_pig() },
		{ value: "bird", label: m.admin_species_bird() },
		{ value: "reptile", label: m.admin_species_reptile() },
		{ value: "other", label: m.admin_species_other() },
	]);

	function onFilter(event: Event) {
		const next = new FormData(event.currentTarget as HTMLFormElement);
		void goto(
			hrefFor({
				status: String(next.get("status") ?? "") || undefined,
				city: String(next.get("city") ?? "") || undefined,
				verified: String(next.get("verified") ?? "") || undefined,
				species: String(next.get("species") ?? "") || undefined,
			}),
			{ keepFocus: true, noScroll: true },
		);
	}

	function userStatus(row: AdminUserCard): string {
		return row.suspended_at ? "suspended" : "active";
	}
</script>

<h1 class="mb-4 text-2xl font-black tracking-tight text-sand-950">{m.admin_catalog_title()}</h1>

<TabNav label={m.admin_catalog_title()} items={facetItems} class="mb-4" />

<form class="mb-5 grid gap-3 sm:grid-cols-3" onchange={onFilter}>
	<Select
		id="catalog-status"
		name="status"
		label={m.admin_filter_status()}
		options={statusOptions}
		value={data.status}
	/>
	{#if data.type === "users"}
		<Select
			id="catalog-verified"
			name="verified"
			label={m.admin_filter_verified_email()}
			options={verifiedOptions}
			value={data.verified}
		/>
	{/if}
	{#if data.type === "animals"}
		<Select
			id="catalog-species"
			name="species"
			label={m.admin_filter_species()}
			options={speciesOptions}
			value={data.species}
		/>
	{/if}
	{#if data.type !== "animals"}
		<Input id="catalog-city" name="city" label={m.admin_filter_city()} value={data.city} />
	{/if}
</form>

{#if page.url.searchParams.get("banned")}
	<p
		class="mb-4 rounded-xl border border-emerald-700 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
	>
		{m.admin_banned_flash()}
	</p>
{/if}
{#if page.url.searchParams.get("deleted")}
	<p
		class="mb-4 rounded-xl border border-emerald-700 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
	>
		{m.admin_deleted_flash()}
	</p>
{/if}

{#if list.items.length === 0}
	<EmptyState clearHref={resolve(`/admin/catalog?type=${data.type}`)} />
{:else}
	<CatalogGrid
		shown={list.items.length}
		total={list.total}
		hasMore={list.hasMore}
		loading={list.loading}
		onMore={list.loadMore}
	>
		{#each list.items as item ((item as { id: string }).id)}
			{#if data.type === "users"}
				{@const row = item as AdminUserCard}
				<a
					href={resolve("/admin/catalog/users/[id]", { id: row.id })}
					class="block rounded-2xl focus-ring"
				>
					<Card padding="sm" focusable class="h-full">
						<div class="flex items-start gap-3">
							<Avatar
								name={row.display_name ?? row.name}
								userId={row.id}
								hasAvatar={row.has_avatar}
								size="sm"
							/>
							<div class="min-w-0 flex-1">
								<p class="truncate font-semibold text-sand-950">{row.name}</p>
								<p class="truncate text-sm text-sand-600">
									{row.display_name ? `@${row.display_name}` : m.admin_no_display_name()}
								</p>
								<p class="truncate text-sm text-sand-700">{row.email}</p>
								<p class="text-sm text-sand-600">{row.city ?? "—"}</p>
							</div>
							<StatusPill status={userStatus(row)} />
						</div>
					</Card>
				</a>
			{:else if data.type === "shelters"}
				{@const row = item as AdminShelterCard}
				<AdminShelterCardView shelter={row} />
			{:else}
				{@const row = item as AdminAnimalCard}
				<AdminAnimalCardView animal={row} />
			{/if}
		{/each}
	</CatalogGrid>
{/if}
