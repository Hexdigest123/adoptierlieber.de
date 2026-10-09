<script lang="ts">
	import type { PageProps } from "./$types";
	import { enhance } from "$app/forms";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";

	let { data, form }: PageProps = $props();

	const invite = $derived(data.invite);
	const wrongEmail = $derived(Boolean(form?.wrongEmail || (invite && !invite.email_matches)));
</script>

<div class="mx-auto max-w-md rounded-2xl border border-sand-200 bg-white p-6">
	<h1 class="text-2xl font-black text-sand-950">{m.shelter_invite_title()}</h1>
	{#if !invite}
		<FormStatus class="mt-4" type="error">{m.shelter_invite_error()}</FormStatus>
	{:else if wrongEmail}
		<p class="mt-2 text-sm text-sand-700">{m.shelter_invite_wrong_account()}</p>
		<form method="POST" action={resolve("/logout")} class="mt-6">
			<Button type="submit">{m.invite_logout()}</Button>
		</form>
	{:else}
		<p class="mt-2 text-sm text-sand-700">
			{m.shelter_invite_for({
				org: invite.org_name,
				role: invite.role === 1 ? m.shelter_role_owner() : m.shelter_role_staff(),
			})}
		</p>
		<p class="mt-2 text-sm text-sand-600">{m.shelter_invite_consent()}</p>
		{#if form?.error}
			<FormStatus class="mt-4" type="error">{m.shelter_invite_error()}</FormStatus>
		{/if}
		<form method="POST" use:enhance class="mt-6">
			<input type="hidden" name="token" value={data.token} />
			<Button type="submit">{m.shelter_invite_accept()}</Button>
		</form>
	{/if}
</div>
