<script lang="ts">
	import type { PageProps } from "./$types";
	import { enhance } from "$app/forms";
	import { m } from "$lib/paraglide/messages";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";

	let { data, form }: PageProps = $props();

	const locked = $derived(!data.isOwner || data.readonly);
	const owners = $derived(data.members.filter((row) => row.role === 1).length);
</script>

<p class="text-center text-sm text-sand-700">{m.shelter_team_subtitle()}</p>

{#if form?.invited}
	<FormStatus class="mt-4" type="success">{m.shelter_team_invited()}</FormStatus>
{:else if form?.transferred}
	<FormStatus class="mt-4" type="success">{m.shelter_team_transferred()}</FormStatus>
{:else if form?.inviteError || form?.teamError}
	<FormStatus class="mt-4" type="error">{m.error_invalid_input()}</FormStatus>
{/if}

<ul class="mt-6 flex flex-col gap-2">
	{#each data.members as member (member.user_id)}
		<li class="flex items-center gap-3 rounded-xl border border-sand-200 bg-white px-3 py-3">
			<Avatar
				name={member.display_name || member.name}
				userId={member.user_id}
				hasAvatar={member.has_avatar}
				size="sm"
			/>
			<div class="min-w-0 flex-1">
				<p class="truncate font-semibold text-sand-950">{member.display_name || member.name}</p>
				<p class="truncate text-xs text-sand-600">{member.email}</p>
			</div>
			<span class="text-xs font-semibold text-sand-600">
				{member.role === 1 ? m.shelter_role_owner() : m.shelter_role_staff()}
			</span>
			{#if data.isOwner && !data.readonly && member.user_id !== data.selfId}
				{#if member.role === 2}
					<form method="POST" action="?/transfer" use:enhance>
						<input type="hidden" name="user_id" value={member.user_id} />
						<Button type="submit" variant="ghost" size="sm">{m.shelter_team_promote()}</Button>
					</form>
				{/if}
				<form method="POST" action="?/remove" use:enhance>
					<input type="hidden" name="user_id" value={member.user_id} />
					<Button
						type="submit"
						variant="ghost"
						size="sm"
						disabled={member.role === 1 && owners <= 1}
					>
						{m.shelter_team_remove()}
					</Button>
				</form>
			{/if}
		</li>
	{/each}
</ul>

{#if data.invites.length}
	<h2 class="mt-8 text-lg font-bold text-sand-950">{m.shelter_team_pending()}</h2>
	<ul class="mt-2 flex flex-col gap-2">
		{#each data.invites as invite (invite.id)}
			<li
				class="rounded-xl border border-dashed border-sand-300 bg-white px-3 py-2 text-sm text-sand-700"
			>
				{invite.email}
			</li>
		{/each}
	</ul>
{/if}

{#if !locked}
	<form method="POST" action="?/invite" use:enhance class="mt-8 flex flex-col gap-3">
		<h2 class="text-lg font-bold text-sand-950">{m.shelter_team_invite()}</h2>
		<Input id="invite-email" name="email" type="email" label={m.contact_email()} required />
		<Button type="submit">{m.shelter_team_send()}</Button>
	</form>
{/if}
