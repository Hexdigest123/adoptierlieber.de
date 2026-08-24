<script lang="ts">
	import type { PageProps } from "./$types";
	import { goto } from "$app/navigation";
	import { m } from "$lib/paraglide/messages";
	import CatalogGrid from "$lib/components/admin/CatalogGrid.svelte";
	import EmptyState from "$lib/components/admin/EmptyState.svelte";
	import StatusPill from "$lib/components/admin/StatusPill.svelte";
	import { formatDate } from "$lib/admin/format";
	import type { AdminAuditRow, ListEnvelope } from "$lib/admin/types";

	let { data }: PageProps = $props();

	let extra = $state<AdminAuditRow[]>([]);
	let pageNum = $state(1);
	let loading = $state(false);
	let openId = $state<string | null>(null);

	$effect(() => {
		data.list;
		extra = [];
		pageNum = 1;
	});

	const items = $derived([...data.list.items, ...extra]);
	const total = $derived(data.list.total);
	const hasMore = $derived(items.length < total);

	const actions = [
		"suspend",
		"unsuspend",
		"delete_user",
		"ban",
		"drop_ban",
		"approve",
		"deny",
		"invite",
		"revoke_invite",
		"remove_admin",
		"note",
		"approve_review",
		"delete_review",
	] as const;

	const labels: Record<string, () => string> = {
		suspend: () => m.admin_action_suspend_label(),
		unsuspend: () => m.admin_action_unsuspend_label(),
		delete_user: () => m.admin_action_delete_user_label(),
		ban: () => m.admin_action_ban_label(),
		drop_ban: () => m.admin_action_drop_ban_label(),
		approve: () => m.admin_action_approve_label(),
		deny: () => m.admin_action_deny_label(),
		invite: () => m.admin_action_invite_label(),
		revoke_invite: () => m.admin_action_revoke_invite_label(),
		remove_admin: () => m.admin_action_remove_admin_label(),
		note: () => m.admin_action_note_label(),
		ban_lookup_hit: () => m.admin_action_ban_lookup_hit_label(),
		approve_review: () => m.admin_action_approve_review_label(),
		delete_review: () => m.admin_action_delete_review_label(),
	};

	function onFilter(event: Event) {
		const form = event.currentTarget as HTMLFormElement;
		const next = new FormData(form);
		const params = new URLSearchParams();
		const action = String(next.get("action") ?? "");
		const actorId = String(next.get("actor_id") ?? "");
		const from = String(next.get("from") ?? "");
		const to = String(next.get("to") ?? "");
		const q = String(next.get("q") ?? data.q);
		if (q) params.set("q", q);
		if (action) params.set("action", action);
		if (actorId) params.set("actor_id", actorId);
		if (from) params.set("from", from);
		if (to) params.set("to", to);
		void goto(`/admin/audit?${params}`, { keepFocus: true, noScroll: true });
	}

	async function loadMore() {
		if (loading || !hasMore) return;
		loading = true;
		const nextPage = pageNum + 1;
		const params = new URLSearchParams();
		params.set("page", String(nextPage));
		params.set("per_page", "24");
		if (data.q) params.set("q", data.q);
		if (data.action) params.set("action", data.action);
		if (data.actorId) params.set("actor_id", data.actorId);
		if (data.from) params.set("from", data.from);
		if (data.to) params.set("to", data.to);
		try {
			const response = await fetch(`/api/admin/audit?${params}`);
			if (response.ok) {
				const body = (await response.json()) as ListEnvelope<AdminAuditRow>;
				extra = [...extra, ...body.items];
				pageNum = nextPage;
			}
		} finally {
			loading = false;
		}
	}
</script>

<h1 class="mb-4 text-2xl font-black tracking-tight text-sand-950">{m.admin_audit_title()}</h1>

<form class="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onchange={onFilter}>
	<input type="hidden" name="q" value={data.q} />
	<label class="flex flex-col gap-1 text-sm font-semibold text-sand-900">
		{m.admin_audit_action()}
		<select
			name="action"
			value={data.action}
			class="h-11 rounded-xl border border-sand-300 bg-white px-3 text-base font-normal focus-ring"
		>
			<option value="">{m.admin_filter_all()}</option>
			{#each actions as action (action)}
				<option value={action}>{labels[action]()}</option>
			{/each}
		</select>
	</label>
	<label class="flex flex-col gap-1 text-sm font-semibold text-sand-900">
		{m.admin_audit_actor()}
		<select
			name="actor_id"
			value={data.actorId}
			class="h-11 rounded-xl border border-sand-300 bg-white px-3 text-base font-normal focus-ring"
		>
			<option value="">{m.admin_filter_all()}</option>
			{#each data.admins as admin (admin.id)}
				<option value={admin.id}>{admin.name}</option>
			{/each}
		</select>
	</label>
	<label class="flex flex-col gap-1 text-sm font-semibold text-sand-900">
		{m.admin_audit_from()}
		<input
			type="date"
			name="from"
			value={data.from}
			class="h-11 rounded-xl border border-sand-300 bg-white px-3 text-base font-normal focus-ring"
		/>
	</label>
	<label class="flex flex-col gap-1 text-sm font-semibold text-sand-900">
		{m.admin_audit_to()}
		<input
			type="date"
			name="to"
			value={data.to}
			class="h-11 rounded-xl border border-sand-300 bg-white px-3 text-base font-normal focus-ring"
		/>
	</label>
</form>

{#if items.length === 0}
	<EmptyState clearHref="/admin/audit" />
{:else}
	<CatalogGrid shown={items.length} {total} {hasMore} {loading} onMore={loadMore}>
		{#each items as row (row.id)}
			<button
				type="button"
				class="rounded-2xl text-left focus-ring"
				onclick={() => (openId = openId === row.id ? null : row.id)}
			>
				<div class="rounded-2xl border border-sand-200 bg-white p-4">
					<div class="flex flex-wrap items-center gap-2">
						<StatusPill
							status={row.action === "approve"
								? "verified"
								: row.action === "deny"
									? "rejected"
									: "pending"}
						/>
						<span class="text-sm font-semibold text-sand-950">
							{labels[row.action] ? labels[row.action]() : row.action}
						</span>
						<span class="ml-auto text-xs text-sand-500 tabular-nums"
							>{formatDate(row.created_at)}</span
						>
					</div>
					<p class="mt-2 text-sm text-sand-800">{row.actor_name} → {row.target_label}</p>
					{#if row.reason}
						<p class="mt-1 line-clamp-2 text-sm text-sand-600">{row.reason}</p>
					{/if}
					{#if openId === row.id}
						<dl class="mt-3 grid gap-1 text-xs text-sand-600">
							<div>{m.admin_audit_actor()}: {row.actor_name} {row.actor_email}</div>
							<div>{m.admin_audit_target()}: {row.target_type} {row.target_id ?? "—"}</div>
							{#if row.reason}<div>{m.admin_ban_reason()}: {row.reason}</div>{/if}
						</dl>
					{/if}
				</div>
			</button>
		{/each}
	</CatalogGrid>
{/if}
