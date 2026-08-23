<script lang="ts">
	import type { PageProps } from "./$types";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Card from "$lib/components/ui/Card.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import Textarea from "$lib/components/ui/Textarea.svelte";
	import ConfirmDialog from "$lib/components/admin/ConfirmDialog.svelte";
	import StatusPill from "$lib/components/admin/StatusPill.svelte";
	import { formatDate } from "$lib/admin/format";

	let { data, form }: PageProps = $props();

	let dialog = $state<"suspend" | "delete" | "ban" | null>(null);

	const actor = $derived(data.user);
	const target = $derived(data.target);
	const isSuper = $derived(target.platform_role === 0);
	const canAct = $derived(
		!isSuper &&
			(target.platform_role === 2 || (actor?.platform_role === 0 && target.platform_role === 1)),
	);
	const address = $derived(
		[target.street, [target.zip, target.city].filter(Boolean).join(" ")].filter(Boolean).join(", "),
	);
	const mapHref = $derived(
		target.lat != null && target.lng != null
			? `https://www.openstreetmap.org/?mlat=${target.lat}&mlon=${target.lng}#map=16/${target.lat}/${target.lng}`
			: null,
	);
</script>

<div class="mb-5">
	<a
		href="{resolve('/admin/catalog')}?type=users"
		class="text-sm font-semibold text-coral-700 focus-ring hover:text-coral-800"
	>
		{m.admin_catalog_users()}
	</a>
	<h1 class="mt-2 text-2xl font-black tracking-tight text-sand-950">{target.name}</h1>
</div>

{#if form?.adminError}
	<FormStatus type="error" class="mb-4">
		{form.adminError === "forbidden" ? m.admin_error_forbidden() : m.admin_error_generic()}
	</FormStatus>
{/if}

<div class="grid gap-4 lg:grid-cols-3">
	<Card class="lg:col-span-2">
		<div class="flex items-start gap-4">
			<Avatar
				name={target.display_name ?? target.name}
				hasAvatar={target.has_avatar && target.id === actor?.id}
				size="lg"
			/>
			<div class="min-w-0">
				<p class="text-xl font-bold text-sand-950">{target.name}</p>
				<p class="text-sm text-sand-600">
					{target.display_name ? `@${target.display_name}` : m.admin_no_display_name()}
				</p>
				<p class="mt-1 text-sm text-sand-800">{target.email}</p>
				<div class="mt-2 flex flex-wrap gap-2">
					<StatusPill status={target.suspended_at ? "suspended" : "active"} />
					{#if target.platform_role === 0}
						<StatusPill status="super_admin" />
					{:else if target.platform_role === 1}
						<StatusPill status="admin" />
					{/if}
				</div>
			</div>
		</div>
		<dl class="mt-6 grid gap-3 text-sm sm:grid-cols-2">
			<div>
				<dt class="font-semibold text-sand-700">{m.admin_user_created()}</dt>
				<dd class="text-sand-900 tabular-nums">{formatDate(target.created_at)}</dd>
			</div>
			<div>
				<dt class="font-semibold text-sand-700">{m.admin_user_verified_at()}</dt>
				<dd class="text-sand-900 tabular-nums">
					{target.email_verified_at
						? formatDate(target.email_verified_at)
						: m.admin_user_unverified()}
				</dd>
			</div>
			<div>
				<dt class="font-semibold text-sand-700">{m.admin_user_last_used()}</dt>
				<dd class="text-sand-900 tabular-nums">
					{target.last_used_at ? formatDate(target.last_used_at) : m.admin_user_never()}
				</dd>
			</div>
			<div>
				<dt class="font-semibold text-sand-700">{m.admin_user_address()}</dt>
				<dd class="text-sand-900">
					{address || "—"}
					{#if mapHref}
						<a
							href={mapHref}
							target="_blank"
							rel="noopener noreferrer"
							class="ml-2 font-semibold text-coral-700 underline underline-offset-2"
						>
							{m.admin_filter_city()}
						</a>
					{/if}
				</dd>
			</div>
		</dl>
	</Card>

	{#if canAct}
		<Card>
			<div class="flex flex-col gap-2">
				{#if target.suspended_at}
					<form method="POST" action="?/unsuspend">
						<Button type="submit" variant="outline" size="sm" fullWidth>
							{m.admin_action_unsuspend()}
						</Button>
					</form>
				{:else}
					<Button
						type="button"
						variant="outline"
						size="sm"
						fullWidth
						onclick={() => (dialog = "suspend")}
					>
						{m.admin_action_suspend()}
					</Button>
				{/if}
				<Button
					type="button"
					variant="danger"
					size="sm"
					fullWidth
					onclick={() => (dialog = "delete")}
				>
					{m.admin_action_delete()}
				</Button>
				<Button type="button" variant="danger" size="sm" fullWidth onclick={() => (dialog = "ban")}>
					{m.admin_action_ban()}
				</Button>
			</div>
		</Card>
	{/if}
</div>

<section class="mt-6" aria-labelledby="admin-memberships">
	<h2 id="admin-memberships" class="mb-3 text-lg font-bold text-sand-950">
		{m.admin_user_memberships()}
	</h2>
	{#if target.memberships.length === 0}
		<p class="text-sm text-sand-600">{m.admin_user_no_memberships()}</p>
	{:else}
		<div class="grid gap-3 md:grid-cols-2">
			{#each target.memberships as membership (membership.shelter_id)}
				<a
					href={resolve("/admin/catalog/shelters/[id]", { id: membership.shelter_id })}
					class="block rounded-2xl focus-ring"
				>
					<Card padding="sm" focusable>
						<p class="font-semibold text-sand-950">{membership.org_name}</p>
						<div class="mt-2">
							<StatusPill status={membership.verification_status} />
						</div>
					</Card>
				</a>
			{/each}
		</div>
	{/if}
</section>

<ConfirmDialog
	open={dialog === "suspend"}
	title={m.admin_suspend_confirm_title()}
	text={m.admin_suspend_confirm_text()}
	action="?/suspend"
	confirmLabel={m.admin_action_suspend()}
	onclose={() => (dialog = null)}
/>
<ConfirmDialog
	open={dialog === "delete"}
	title={m.admin_delete_confirm_title()}
	text={m.admin_delete_confirm_text()}
	action="?/delete"
	confirmLabel={m.admin_action_delete()}
	typeValue={target.email}
	onclose={() => (dialog = null)}
/>
<ConfirmDialog
	open={dialog === "ban"}
	title={m.admin_ban_confirm_title()}
	text={m.admin_ban_confirm_text()}
	action="?/ban"
	confirmLabel={m.admin_action_ban()}
	typeValue={target.email}
	onclose={() => (dialog = null)}
>
	<Textarea id="ban-reason" name="reason" label={m.admin_ban_reason()} required rows={3} />
</ConfirmDialog>
