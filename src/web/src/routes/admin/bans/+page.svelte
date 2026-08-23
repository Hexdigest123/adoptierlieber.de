<script lang="ts">
	import type { PageProps } from "./$types";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import Card from "$lib/components/ui/Card.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import CatalogGrid from "$lib/components/admin/CatalogGrid.svelte";
	import ConfirmDialog from "$lib/components/admin/ConfirmDialog.svelte";
	import EmptyState from "$lib/components/admin/EmptyState.svelte";
	import { formatDate, shortHash } from "$lib/admin/format";
	import type { AdminBanRow, ListEnvelope } from "$lib/admin/types";

	let { data, form }: PageProps = $props();

	let extra = $state<AdminBanRow[]>([]);
	let pageNum = $state(1);
	let loading = $state(false);
	let dropTarget = $state<AdminBanRow | null>(null);

	$effect(() => {
		data.list;
		extra = [];
		pageNum = 1;
	});

	const items = $derived([...data.list.items, ...extra]);
	const total = $derived(data.list.total);
	const hasMore = $derived(items.length < total);
	const lookup = $derived(
		form && "lookup" in form
			? (form.lookup as
					| { match: false }
					| {
							match: true;
							hash: string;
							reason: string;
							created_at: string;
							banned_by_name: string | null;
					  })
			: null,
	);

	async function loadMore() {
		if (loading || !hasMore) return;
		loading = true;
		const nextPage = pageNum + 1;
		const params = new URLSearchParams();
		params.set("page", String(nextPage));
		params.set("per_page", "24");
		if (data.q) params.set("q", data.q);
		try {
			const response = await fetch(`/api/admin/bans?${params}`);
			if (response.ok) {
				const body = (await response.json()) as ListEnvelope<AdminBanRow>;
				extra = [...extra, ...body.items];
				pageNum = nextPage;
			}
		} finally {
			loading = false;
		}
	}
</script>

<h1 class="mb-4 text-2xl font-black tracking-tight text-sand-950">{m.admin_bans_title()}</h1>

{#if form?.adminError}
	<FormStatus type="error" class="mb-4">{m.admin_error_generic()}</FormStatus>
{/if}

<Card class="mb-8">
	<h2 class="text-lg font-bold text-sand-950">{m.admin_bans_lookup_title()}</h2>
	<form method="POST" action="?/lookup" class="mt-4 grid gap-3 sm:grid-cols-2">
		<Input id="lookup-name" name="name" label={m.auth_name()} required />
		<Input id="lookup-street" name="street" label={m.auth_street()} required />
		<Input id="lookup-zip" name="zip" label={m.auth_zip()} required />
		<Input id="lookup-city" name="city" label={m.auth_city()} required />
		<div class="sm:col-span-2">
			<Button type="submit" size="sm">{m.admin_bans_lookup_submit()}</Button>
		</div>
	</form>
	{#if lookup}
		<div class="mt-4">
			{#if lookup.match}
				<FormStatus type="error">
					<p class="font-semibold">{m.admin_bans_match()}</p>
					<p class="mt-1 font-mono text-sm">{shortHash(lookup.hash)}…</p>
					<p class="mt-1 text-sm">{lookup.reason}</p>
					<p class="mt-1 text-xs tabular-nums">{formatDate(lookup.created_at)}</p>
				</FormStatus>
				<div class="mt-3">
					<Button
						type="button"
						variant="danger"
						size="sm"
						onclick={() =>
							(dropTarget = {
								hash: lookup.hash,
								reason: lookup.reason,
								created_at: lookup.created_at,
								banned_by: null,
								banned_by_name: lookup.banned_by_name,
							})}
					>
						{m.admin_bans_drop()}
					</Button>
				</div>
			{:else}
				<FormStatus type="success">{m.admin_bans_miss()}</FormStatus>
			{/if}
		</div>
	{/if}
</Card>

{#if items.length === 0}
	<EmptyState />
{:else}
	<CatalogGrid shown={items.length} {total} {hasMore} {loading} onMore={loadMore}>
		{#each items as row (row.hash)}
			<Card padding="sm">
				<p class="font-mono text-sm font-semibold text-sand-950">{shortHash(row.hash)}…</p>
				<p class="mt-2 text-sm text-sand-800">{row.reason}</p>
				<p class="mt-1 text-xs text-sand-500 tabular-nums">
					{formatDate(row.created_at)}
					{#if row.banned_by_name}
						{row.banned_by_name}
					{/if}
				</p>
				<div class="mt-3">
					<Button type="button" variant="danger" size="sm" onclick={() => (dropTarget = row)}>
						{m.admin_bans_drop()}
					</Button>
				</div>
			</Card>
		{/each}
	</CatalogGrid>
{/if}

<ConfirmDialog
	open={dropTarget !== null}
	title={m.admin_bans_drop_confirm_title()}
	text={m.admin_bans_drop_confirm_text()}
	action="?/drop"
	confirmLabel={m.admin_bans_drop()}
	typeValue={dropTarget ? shortHash(dropTarget.hash) : undefined}
	typeLabel={m.admin_type_hash()}
	onclose={() => (dropTarget = null)}
>
	{#if dropTarget}
		<input type="hidden" name="hash" value={dropTarget.hash} />
	{/if}
</ConfirmDialog>
