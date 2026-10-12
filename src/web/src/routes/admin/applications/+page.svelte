<script lang="ts">
	import type { PageProps } from "./$types";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import TabNav from "$lib/components/ui/TabNav.svelte";
	import AdminShelterCardView from "$lib/components/admin/AdminShelterCard.svelte";
	import CatalogGrid from "$lib/components/admin/CatalogGrid.svelte";
	import EmptyState from "$lib/components/admin/EmptyState.svelte";
	import type { AdminShelterCard, ListEnvelope } from "$lib/admin/types";

	let { data }: PageProps = $props();

	let extra = $state<AdminShelterCard[]>([]);
	let pageNum = $state(1);
	let loading = $state(false);

	$effect(() => {
		data.list;
		extra = [];
		pageNum = 1;
	});

	const items = $derived([...data.list.items, ...extra]);
	const total = $derived(data.list.total);
	const hasMore = $derived(items.length < total);

	function hrefFor(status: string): string {
		const params = new URLSearchParams();
		params.set("status", status);
		if (data.q) params.set("q", data.q);
		return `/admin/applications?${params}`;
	}

	const statusItems = $derived(
		["pending", "verified", "rejected"].map((status) => ({
			href: hrefFor(status),
			label:
				status === "pending"
					? m.admin_filter_pending()
					: status === "verified"
						? m.admin_filter_verified()
						: m.admin_filter_rejected(),
			active: data.status === status,
		})),
	);

	async function loadMore() {
		if (loading || !hasMore) return;
		loading = true;
		const nextPage = pageNum + 1;
		const params = new URLSearchParams();
		params.set("page", String(nextPage));
		params.set("per_page", "24");
		params.set("verification_status", data.status);
		if (data.q) params.set("q", data.q);
		try {
			const response = await fetch(`/api/admin/applications?${params}`);
			if (response.ok) {
				const body = (await response.json()) as ListEnvelope<AdminShelterCard>;
				extra = [...extra, ...body.items];
				pageNum = nextPage;
			}
		} finally {
			loading = false;
		}
	}
</script>

<h1 class="mb-4 text-2xl font-black tracking-tight text-sand-950">
	{m.admin_applications_title()}
</h1>

<TabNav label={m.admin_filter_status()} items={statusItems} class="mb-5" />

{#if items.length === 0}
	<EmptyState clearHref="/admin/applications" />
{:else}
	<CatalogGrid shown={items.length} {total} {hasMore} {loading} onMore={loadMore}>
		{#each items as row (row.id)}
			<AdminShelterCardView
				shelter={row}
				href={resolve("/admin/applications/[id]", { id: row.id })}
			/>
		{/each}
	</CatalogGrid>
{/if}
