<script lang="ts">
	import type { PageProps } from "./$types";
	import { m } from "$lib/paraglide/messages";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Card from "$lib/components/ui/Card.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import ConfirmDialog from "$lib/components/admin/ConfirmDialog.svelte";
	import StatusPill from "$lib/components/admin/StatusPill.svelte";
	import { formatDate } from "$lib/admin/format";

	let { data, form }: PageProps = $props();
	let removeId = $state<string | null>(null);
	const isSuper = $derived(data.user?.platform_role === 0);
</script>

<h1 class="mb-4 text-2xl font-black tracking-tight text-sand-950">{m.admin_team_title()}</h1>

{#if form?.invited}
	<FormStatus type="success" class="mb-4">{m.admin_team_invite_sent()}</FormStatus>
{:else if form?.adminError === "already"}
	<FormStatus type="error" class="mb-4">{m.admin_team_already()}</FormStatus>
{:else if form?.adminError}
	<FormStatus type="error" class="mb-4">{m.admin_error_generic()}</FormStatus>
{/if}

<Card class="mb-8">
	<h2 class="text-lg font-bold text-sand-950">{m.admin_team_invite()}</h2>
	<form method="POST" action="?/invite" class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
		<Input
			id="invite-email"
			name="email"
			type="email"
			label={m.invite_email()}
			required
			class="flex-1"
		/>
		<Button type="submit" size="sm">{m.admin_team_invite_submit()}</Button>
	</form>
</Card>

<div class="flex flex-col gap-3">
	{#each data.team.items as member (member.id)}
		<Card padding="sm">
			<div class="flex flex-wrap items-center gap-3">
				<Avatar
					name={member.name}
					hasAvatar={member.has_avatar && member.id === data.user?.id}
					size="sm"
				/>
				<div class="min-w-0 flex-1">
					<p class="font-semibold text-sand-950">{member.name}</p>
					<p class="text-sm text-sand-600">{member.email}</p>
					<p class="text-xs text-sand-500 tabular-nums">
						{m.admin_team_since()}: {formatDate(member.created_at)}
					</p>
				</div>
				<StatusPill status={member.platform_role === 0 ? "super_admin" : "admin"} />
				{#if isSuper && member.platform_role === 1}
					<Button type="button" variant="danger" size="sm" onclick={() => (removeId = member.id)}>
						{m.admin_team_remove()}
					</Button>
				{/if}
			</div>
		</Card>
	{/each}
</div>

{#if data.team.invites.length > 0}
	<h2 class="mt-8 mb-3 text-lg font-bold text-sand-950">{m.admin_team_pending()}</h2>
	<div class="flex flex-col gap-3">
		{#each data.team.invites as invite (invite.id)}
			<Card padding="sm">
				<div class="flex flex-wrap items-center gap-3">
					<div class="min-w-0 flex-1">
						<p class="font-semibold text-sand-950">{invite.email}</p>
						<p class="text-xs text-sand-500 tabular-nums">
							{m.admin_team_expires()}: {formatDate(invite.expires_at)}
						</p>
					</div>
					<form method="POST" action="?/revoke">
						<input type="hidden" name="id" value={invite.id} />
						<Button type="submit" variant="outline" size="sm">{m.admin_team_revoke()}</Button>
					</form>
				</div>
			</Card>
		{/each}
	</div>
{/if}

<ConfirmDialog
	open={removeId !== null}
	title={m.admin_team_remove_confirm_title()}
	text={m.admin_team_remove_confirm_text()}
	action="?/remove"
	confirmLabel={m.admin_team_remove()}
	onclose={() => (removeId = null)}
>
	{#if removeId}
		<input type="hidden" name="id" value={removeId} />
	{/if}
</ConfirmDialog>
