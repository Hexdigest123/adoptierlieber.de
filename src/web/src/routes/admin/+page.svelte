<script lang="ts">
	import type { PageProps } from "./$types";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Card from "$lib/components/ui/Card.svelte";
	import StatusPill from "$lib/components/admin/StatusPill.svelte";
	import { formatDate } from "$lib/admin/format";

	let { data }: PageProps = $props();

	const stats = $derived([
		{ label: m.admin_home_users(), value: data.overview.users, href: "/admin/catalog?type=users" },
		{
			label: m.admin_home_pending(),
			value: data.overview.pending_applications,
			href: "/admin/applications",
		},
		{
			label: m.admin_home_suspended(),
			value: data.overview.suspended,
			href: "/admin/catalog?type=users&status=suspended",
		},
		{
			label: m.admin_home_animals(),
			value: data.overview.animals,
			href: "/admin/catalog?type=animals",
		},
		{
			label: m.admin_home_verified(),
			value: data.overview.shelters_verified,
			href: "/admin/catalog?type=shelters&status=verified",
		},
		{
			label: m.admin_home_rejected(),
			value: data.overview.shelters_rejected,
			href: "/admin/catalog?type=shelters&status=rejected",
		},
	]);

	const actionLabel: Record<string, () => string> = {
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
</script>

<h1 class="mb-5 text-2xl font-black tracking-tight text-sand-950">{m.admin_home_title()}</h1>

<div class="grid grid-cols-2 gap-3 md:grid-cols-3">
	{#each stats as stat (stat.href)}
		<a href={stat.href} class="block rounded-2xl focus-ring">
			<Card class="h-full" padding="sm">
				<p class="text-xs font-semibold tracking-wide text-sand-600 uppercase">{stat.label}</p>
				<p class="mt-1 text-3xl font-black text-sand-950 tabular-nums">{stat.value}</p>
			</Card>
		</a>
	{/each}
</div>

<section class="mt-8" aria-labelledby="admin-queue">
	<div class="mb-3 flex items-center justify-between">
		<h2 id="admin-queue" class="text-lg font-bold text-sand-950">{m.admin_home_queue()}</h2>
		<a
			href={resolve("/admin/applications")}
			class="text-sm font-semibold text-coral-700 focus-ring hover:text-coral-800"
		>
			{m.admin_nav_applications()}
		</a>
	</div>
	{#if data.pending.items.length === 0}
		<p class="text-sm text-sand-600">{m.admin_empty_text()}</p>
	{:else}
		<div class="grid gap-3">
			{#each data.pending.items as row (row.id)}
				<a
					href={resolve("/admin/applications/[id]", { id: row.id })}
					class="block rounded-2xl focus-ring"
				>
					<Card padding="sm" focusable>
						<div class="flex items-start justify-between gap-3">
							<div>
								<p class="font-semibold text-sand-950">{row.org_name}</p>
								<p class="text-sm text-sand-600">
									{row.city}
									{row.owner_name ?? m.admin_no_owner()}
								</p>
							</div>
							<StatusPill status={row.verification_status} />
						</div>
					</Card>
				</a>
			{/each}
		</div>
	{/if}
</section>

<section class="mt-8" aria-labelledby="admin-recent">
	<div class="mb-3 flex items-center justify-between">
		<h2 id="admin-recent" class="text-lg font-bold text-sand-950">{m.admin_home_recent()}</h2>
		<a
			href={resolve("/admin/audit")}
			class="text-sm font-semibold text-coral-700 focus-ring hover:text-coral-800"
		>
			{m.admin_nav_audit()}
		</a>
	</div>
	{#if data.overview.recent_audit.length === 0}
		<p class="text-sm text-sand-600">{m.admin_empty_text()}</p>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each data.overview.recent_audit as row (row.id)}
				<li class="rounded-2xl border border-sand-200 bg-white px-4 py-3">
					<div class="flex flex-wrap items-center gap-2">
						<StatusPill status={row.action === "approve" ? "verified" : "pending"} />
						<span class="text-sm font-semibold text-sand-900">
							{actionLabel[row.action] ? actionLabel[row.action]() : row.action}
						</span>
						<span class="text-sm text-sand-600">{row.target_label}</span>
						<span class="ml-auto text-xs text-sand-500 tabular-nums"
							>{formatDate(row.created_at)}</span
						>
					</div>
				</li>
			{/each}
		</ul>
	{/if}
</section>
