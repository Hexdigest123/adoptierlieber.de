<script lang="ts">
	import type { PageProps } from "./$types";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import CatalogGrid from "$lib/components/admin/CatalogGrid.svelte";
	import EmptyState from "$lib/components/admin/EmptyState.svelte";
	import StatusPill from "$lib/components/admin/StatusPill.svelte";
	import Select from "$lib/components/ui/Select.svelte";
	import { formatDate } from "$lib/admin/format";
	import { ADMIN_PAGE_SIZE } from "$lib/admin/api";
	import { searchParams } from "$lib/query";
	import { pagedList } from "$lib/admin/paged.svelte";
	import type { AdminAuditRow } from "$lib/admin/types";

	let { data }: PageProps = $props();

	let openId = $state<string | null>(null);

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
		transfer_shelter: () => m.admin_action_transfer_shelter_label(),
		archive_shelter: () => m.admin_action_archive_shelter_label(),
		approve_review: () => m.admin_action_approve_review_label(),
		delete_review: () => m.admin_action_delete_review_label(),
		accept_admin_invite: () => m.admin_action_accept_admin_invite_label(),
		grant_super_admin: () => m.admin_action_grant_super_admin_label(),
	};

	const actionOptions = $derived([
		{ value: "", label: m.admin_filter_all() },
		...Object.entries(labels).map(([value, label]) => ({ value, label: label() })),
	]);
	const actorOptions = $derived([
		{ value: "", label: m.admin_filter_all() },
		...data.admins.map((admin) => ({ value: admin.id, label: admin.name })),
	]);

	const list = pagedList<AdminAuditRow>(
		() => data.list,
		(page) =>
			`/api/admin/audit?${searchParams({
				page: String(page),
				per_page: String(ADMIN_PAGE_SIZE),
				q: data.q,
				action: data.action,
				actor_id: data.actorId,
				from: data.from,
				to: data.to,
			})}`,
	);

	function onFilter(event: Event) {
		const next = new FormData(event.currentTarget as HTMLFormElement);
		const params = searchParams({
			q: String(next.get("q") ?? data.q),
			action: String(next.get("action") ?? ""),
			actor_id: String(next.get("actor_id") ?? ""),
			from: String(next.get("from") ?? ""),
			to: String(next.get("to") ?? ""),
		});
		void goto(resolve(`/admin/audit?${params}`), { keepFocus: true, noScroll: true });
	}
</script>

<h1 class="mb-4 text-2xl font-black tracking-tight text-sand-950">{m.admin_audit_title()}</h1>

<form class="mb-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" onchange={onFilter}>
	<input type="hidden" name="q" value={data.q} />
	<Select
		id="audit-action"
		name="action"
		label={m.admin_audit_action()}
		options={actionOptions}
		value={data.action}
	/>
	<Select
		id="audit-actor"
		name="actor_id"
		label={m.admin_audit_actor()}
		options={actorOptions}
		value={data.actorId}
	/>
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

{#if list.items.length === 0}
	<EmptyState clearHref={resolve("/admin/audit")} />
{:else}
	<CatalogGrid
		shown={list.items.length}
		total={list.total}
		hasMore={list.hasMore}
		loading={list.loading}
		onMore={list.loadMore}
	>
		{#each list.items as row (row.id)}
			<button
				type="button"
				class="rounded-2xl text-left focus-ring"
				onclick={() => (openId = openId === row.id ? null : row.id)}
			>
				<div class="rounded-2xl border border-sand-200 bg-white p-4">
					<div class="flex flex-wrap items-center gap-2">
						{#if row.action === "approve" || row.action === "deny"}
							<StatusPill status={row.action === "approve" ? "verified" : "rejected"} />
						{/if}
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
						<div class="mt-3 grid gap-1 text-xs text-sand-600">
							<p>{m.admin_audit_actor()}: {row.actor_name} {row.actor_email}</p>
							<p>{m.admin_audit_target()}: {row.target_type} {row.target_id ?? "—"}</p>
							{#if row.reason}<p>{m.admin_ban_reason()}: {row.reason}</p>{/if}
						</div>
					{/if}
				</div>
			</button>
		{/each}
	</CatalogGrid>
{/if}
