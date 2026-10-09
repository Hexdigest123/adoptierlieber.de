<script lang="ts">
	import { onMount } from "svelte";
	import type { PageProps } from "./$types";
	import { enhance } from "$app/forms";
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import { stashLinkToken, takeLinkToken } from "$lib/link-token";
	import Button from "$lib/components/ui/Button.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";

	type ShelterInvitePreview = {
		org_name: string;
		role: number;
		email_matches: boolean;
	};

	let { data, form }: PageProps = $props();

	const STASH_KEY = "shelter-invite";
	let token = $state("");
	let invite = $state<ShelterInvitePreview | null>(null);
	let loading = $state(true);
	const wrongEmail = $derived(Boolean(form?.wrongEmail || (invite && !invite.email_matches)));

	// Show who is inviting before anything happens: joining needs an explicit accept.
	// Previewed from the browser: the token never reaches a page URL the server sees.
	async function preview(linkToken: string): Promise<ShelterInvitePreview | null> {
		try {
			const response = await fetch("/api/shelters/invites/preview", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ token: linkToken }),
			});
			return response.ok ? ((await response.json()) as ShelterInvitePreview) : null;
		} catch {
			return null;
		}
	}

	onMount(async () => {
		token = takeLinkToken(STASH_KEY);
		if (!data.user) {
			// Kept for after login; read back (and cleared) when the visitor returns.
			if (token) stashLinkToken(STASH_KEY, token);
			await goto(`${resolve("/login")}?next=${encodeURIComponent(resolve("/shelter/invite"))}`, {
				replaceState: true,
			});
			return;
		}
		invite = token ? await preview(token) : null;
		loading = false;
	});
</script>

<div class="mx-auto max-w-md rounded-2xl border border-sand-200 bg-white p-6">
	<h1 class="text-2xl font-black text-sand-950">{m.shelter_invite_title()}</h1>
	{#if loading}
		<p class="mt-2 text-sm text-sand-700">{m.invite_loading()}</p>
		<noscript>
			<FormStatus class="mt-4" type="error">{m.link_token_noscript()}</FormStatus>
		</noscript>
	{:else if !invite}
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
			<input type="hidden" name="token" value={token} />
			<Button type="submit">{m.shelter_invite_accept()}</Button>
		</form>
	{/if}
</div>
