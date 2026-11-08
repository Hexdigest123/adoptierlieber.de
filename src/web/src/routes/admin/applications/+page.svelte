<script lang="ts">
	import type { PageProps } from "./$types";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import TabNav from "$lib/components/ui/TabNav.svelte";
	import AdminShelterCardView from "$lib/components/admin/AdminShelterCard.svelte";
	import CatalogGrid from "$lib/components/admin/CatalogGrid.svelte";
	import EmptyState from "$lib/components/admin/EmptyState.svelte";
	import { ADMIN_PAGE_SIZE } from "$lib/admin/api";
	import { searchParams } from "$lib/query";
	import { pagedList } from "$lib/admin/paged.svelte";
	import type { AdminShelterCard } from "$lib/admin/types";

	let { data }: PageProps = $props();

	const list = pagedList<AdminShelterCard>(
		() => data.list,
		(page) =>
			`/api/admin/applications?${searchParams({
				page: String(page),
				per_page: String(ADMIN_PAGE_SIZE),
				verification_status: data.status,
				q: data.q,
			})}`,
	);

	const statusItems = $derived(
		["pending", "verified", "rejected"].map((status) => ({
			href: resolve(`/admin/applications?${searchParams({ status, q: data.q })}`),
			label:
				status === "pending"
					? m.admin_filter_pending()
					: status === "verified"
						? m.admin_filter_verified()
						: m.admin_filter_rejected(),
			active: data.status === status,
		})),
	);
</script>

<h1 class="mb-4 text-2xl font-black tracking-tight text-sand-950">
	{m.admin_applications_title()}
</h1>

<TabNav label={m.admin_filter_status()} items={statusItems} class="mb-5" />

{#if list.items.length === 0}
	<EmptyState clearHref={resolve("/admin/applications")} />
{:else}
	<CatalogGrid
		shown={list.items.length}
		total={list.total}
		hasMore={list.hasMore}
		loading={list.loading}
		onMore={list.loadMore}
	>
		{#each list.items as row (row.id)}
			<AdminShelterCardView
				shelter={row}
				href={resolve("/admin/applications/[id]", { id: row.id })}
			/>
		{/each}
	</CatalogGrid>
{/if}
