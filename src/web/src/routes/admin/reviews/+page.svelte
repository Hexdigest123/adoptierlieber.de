<script lang="ts">
	import type { PageProps } from "./$types";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import Card from "$lib/components/ui/Card.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import CatalogGrid from "$lib/components/admin/CatalogGrid.svelte";
	import ConfirmDialog from "$lib/components/admin/ConfirmDialog.svelte";
	import EmptyState from "$lib/components/admin/EmptyState.svelte";
	import StatusPill from "$lib/components/admin/StatusPill.svelte";
	import { formatDate } from "$lib/admin/format";
	import type { AdminReviewRow, ListEnvelope } from "$lib/admin/types";
	import Star from "lucide-svelte/icons/star";

	let { data, form }: PageProps = $props();

	let extra = $state<AdminReviewRow[]>([]);
	let pageNum = $state(1);
	let loading = $state(false);
	let target = $state<{ review: AdminReviewRow; action: "approve" | "remove" } | null>(null);

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
		return `/admin/reviews?${params}`;
	}

	async function loadMore() {
		if (loading || !hasMore) return;
		loading = true;
		const nextPage = pageNum + 1;
		const params = new URLSearchParams();
		params.set("page", String(nextPage));
		params.set("per_page", "24");
		if (data.status === "pending" || data.status === "approved") {
			params.set("status", data.status);
		}
		if (data.q) params.set("q", data.q);
		try {
			const response = await fetch(`/api/admin/reviews?${params}`);
			if (response.ok) {
				const body = (await response.json()) as ListEnvelope<AdminReviewRow>;
				extra = [...extra, ...body.items];
				pageNum = nextPage;
			}
		} finally {
			loading = false;
		}
	}
</script>

<h1 class="mb-4 text-2xl font-black tracking-tight text-sand-950">{m.admin_reviews_title()}</h1>

{#if form?.adminError}
	<FormStatus type="error" class="mb-4">{m.admin_error_generic()}</FormStatus>
{/if}

<div class="mb-5 flex flex-wrap gap-2">
	{#each ["pending", "approved", "all"] as status (status)}
		<a
			href={hrefFor(status)}
			class="rounded-full px-4 py-2 text-sm font-semibold focus-ring {data.status === status
				? 'bg-coral-600 text-white'
				: 'bg-white text-sand-800 ring-1 ring-sand-200 hover:bg-peach-50'}"
		>
			{status === "pending"
				? m.admin_filter_pending()
				: status === "approved"
					? m.admin_filter_approved()
					: m.admin_filter_all()}
		</a>
	{/each}
</div>

{#if items.length === 0}
	<EmptyState clearHref="/admin/reviews" />
{:else}
	<CatalogGrid shown={items.length} {total} {hasMore} {loading} onMore={loadMore}>
		{#each items as row (row.id)}
			<Card padding="sm">
				<div class="flex items-start justify-between gap-3">
					<div class="min-w-0">
						<p class="font-semibold text-sand-950">{row.name}</p>
						<div
							class="mt-1 flex gap-0.5 text-coral-600"
							aria-label={m.reviews_stars_aria({ count: row.stars })}
						>
							{#each [1, 2, 3, 4, 5] as value (value)}
								<Star
									class="size-3.5 {row.stars >= value ? 'fill-current' : ''}"
									aria-hidden="true"
								/>
							{/each}
						</div>
						<p class="mt-1 text-xs text-sand-500 tabular-nums">{formatDate(row.created_at)}</p>
					</div>
					<StatusPill status={row.status} />
				</div>
				<p class="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-sand-800">{row.body}</p>
				<div class="mt-4 flex flex-wrap gap-2">
					{#if row.status === "pending"}
						<Button
							type="button"
							size="sm"
							onclick={() => (target = { review: row, action: "approve" })}
						>
							{m.admin_approve()}
						</Button>
					{/if}
					<Button
						type="button"
						variant="danger"
						size="sm"
						onclick={() => (target = { review: row, action: "remove" })}
					>
						{m.admin_action_delete()}
					</Button>
				</div>
			</Card>
		{/each}
	</CatalogGrid>
{/if}

<ConfirmDialog
	open={target?.action === "approve"}
	title={m.admin_reviews_approve_confirm_title()}
	text={m.admin_reviews_approve_confirm_text()}
	action="?/approve"
	danger={false}
	confirmLabel={m.admin_approve()}
	onclose={() => (target = null)}
>
	{#if target}
		<input type="hidden" name="id" value={target.review.id} />
	{/if}
</ConfirmDialog>
<ConfirmDialog
	open={target?.action === "remove"}
	title={m.admin_reviews_delete_confirm_title()}
	text={m.admin_reviews_delete_confirm_text()}
	action="?/remove"
	confirmLabel={m.admin_action_delete()}
	onclose={() => (target = null)}
>
	{#if target}
		<input type="hidden" name="id" value={target.review.id} />
	{/if}
</ConfirmDialog>
