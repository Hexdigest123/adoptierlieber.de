<script lang="ts">
	import type { PageProps } from "./$types";
	import { goto } from "$app/navigation";
	import { page } from "$app/state";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Card from "$lib/components/ui/Card.svelte";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import AdminAnimalCardView from "$lib/components/admin/AdminAnimalCard.svelte";
	import AdminShelterCardView from "$lib/components/admin/AdminShelterCard.svelte";
	import CatalogGrid from "$lib/components/admin/CatalogGrid.svelte";
	import EmptyState from "$lib/components/admin/EmptyState.svelte";
	import StatusPill from "$lib/components/admin/StatusPill.svelte";
	import type {
		AdminAnimalCard,
		AdminShelterCard,
		AdminUserCard,
		ListEnvelope,
	} from "$lib/admin/types";

	let { data }: PageProps = $props();

	let extra = $state<unknown[]>([]);
	let pageNum = $state(1);
	let loading = $state(false);

	$effect(() => {
		data.list;
		data.type;
		extra = [];
		pageNum = 1;
	});

	const items = $derived([...data.list.items, ...extra]);
	const total = $derived(data.list.total);
	const hasMore = $derived(items.length < total);

	const facets = [
		{ type: "users" as const, label: () => m.admin_catalog_users() },
		{ type: "shelters" as const, label: () => m.admin_catalog_shelters() },
		{ type: "animals" as const, label: () => m.admin_catalog_animals() },
	];

	function hrefFor(next: Record<string, string | undefined>): string {
		const params = new URLSearchParams();
		const type = next.type ?? data.type;
		params.set("type", type);
		const q = next.q ?? data.q;
		const status = next.status ?? data.status;
		const city = next.city ?? data.city;
		const verified = next.verified ?? data.verified;
		const species = next.species ?? data.species;
		if (q) params.set("q", q);
		if (status) params.set("status", status);
		if (city) params.set("city", city);
		if (type === "users" && verified) params.set("verified", verified);
		if (type === "animals" && species) params.set("species", species);
		return `/admin/catalog?${params.toString()}`;
	}

	async function loadMore() {
		if (loading || !hasMore) return;
		loading = true;
		const nextPage = pageNum + 1;
		const params = new URLSearchParams(page.url.searchParams);
		params.set("page", String(nextPage));
		params.set("per_page", "24");
		if (data.type === "shelters" && data.status) {
			params.set("verification_status", data.status);
			params.delete("status");
		}
		const endpoint =
			data.type === "users"
				? "/api/admin/users"
				: data.type === "shelters"
					? "/api/admin/shelters"
					: "/api/admin/animals";
		try {
			const response = await fetch(`${endpoint}?${params}`);
			if (response.ok) {
				const body = (await response.json()) as ListEnvelope<unknown>;
				extra = [...extra, ...body.items];
				pageNum = nextPage;
			}
		} finally {
			loading = false;
		}
	}

	function onFilter(event: Event) {
		const form = event.currentTarget as HTMLFormElement;
		const next = new FormData(form);
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

<div class="mb-4 flex flex-wrap gap-2">
	{#each facets as facet (facet.type)}
		<a
			href={hrefFor({ type: facet.type })}
			class="rounded-full px-4 py-2 text-sm font-semibold focus-ring {data.type === facet.type
				? 'bg-coral-600 text-white'
				: 'bg-white text-sand-800 ring-1 ring-sand-200 hover:bg-peach-50'}"
			aria-current={data.type === facet.type ? "page" : undefined}
		>
			{facet.label()}
		</a>
	{/each}
</div>

<form class="mb-5 grid gap-3 sm:grid-cols-3" onchange={onFilter}>
	<label class="flex flex-col gap-1 text-sm font-semibold text-sand-900">
		{m.admin_filter_status()}
		<select
			name="status"
			value={data.status}
			class="h-11 rounded-xl border border-sand-300 bg-white px-3 text-base font-normal focus-ring"
		>
			<option value="">{m.admin_filter_all()}</option>
			{#if data.type === "users"}
				<option value="active">{m.admin_filter_active()}</option>
				<option value="suspended">{m.admin_filter_suspended()}</option>
			{:else if data.type === "shelters"}
				<option value="pending">{m.admin_filter_pending()}</option>
				<option value="verified">{m.admin_filter_verified()}</option>
				<option value="rejected">{m.admin_filter_rejected()}</option>
			{:else}
				<option value="draft">{m.admin_status_draft()}</option>
				<option value="live">{m.admin_status_live()}</option>
				<option value="found_home">{m.admin_status_found_home()}</option>
			{/if}
		</select>
	</label>
	{#if data.type === "users"}
		<label class="flex flex-col gap-1 text-sm font-semibold text-sand-900">
			{m.admin_filter_verified_email()}
			<select
				name="verified"
				value={data.verified}
				class="h-11 rounded-xl border border-sand-300 bg-white px-3 text-base font-normal focus-ring"
			>
				<option value="">{m.admin_filter_all()}</option>
				<option value="yes">{m.admin_filter_yes()}</option>
				<option value="no">{m.admin_filter_no()}</option>
			</select>
		</label>
	{/if}
	{#if data.type === "animals"}
		<label class="flex flex-col gap-1 text-sm font-semibold text-sand-900">
			{m.admin_filter_species()}
			<select
				name="species"
				value={data.species}
				class="h-11 rounded-xl border border-sand-300 bg-white px-3 text-base font-normal focus-ring"
			>
				<option value="">{m.admin_filter_all()}</option>
				<option value="cat">{m.admin_species_cat()}</option>
				<option value="dog">{m.admin_species_dog()}</option>
				<option value="rabbit">{m.admin_species_rabbit()}</option>
				<option value="guinea_pig">{m.admin_species_guinea_pig()}</option>
				<option value="bird">{m.admin_species_bird()}</option>
				<option value="reptile">{m.admin_species_reptile()}</option>
				<option value="other">{m.admin_species_other()}</option>
			</select>
		</label>
	{/if}
	{#if data.type !== "animals"}
		<label class="flex flex-col gap-1 text-sm font-semibold text-sand-900">
			{m.admin_filter_city()}
			<input
				name="city"
				value={data.city}
				class="h-11 rounded-xl border border-sand-300 bg-white px-3 text-base font-normal focus-ring"
			/>
		</label>
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

{#if items.length === 0}
	<EmptyState clearHref="/admin/catalog?type={data.type}" />
{:else}
	<CatalogGrid shown={items.length} {total} {hasMore} {loading} onMore={loadMore}>
		{#each items as item ((item as { id: string }).id)}
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
								hasAvatar={row.has_avatar && row.id === data.user?.id}
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
