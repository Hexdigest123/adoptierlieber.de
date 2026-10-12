<script lang="ts">
	import { onMount } from "svelte";
	import type { PageProps } from "./$types";
	import { enhance } from "$app/forms";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import { stashLinkToken, takeLinkToken } from "$lib/link-token";
	import AuthCard from "$lib/components/auth/AuthCard.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";

	let { data, form }: PageProps = $props();

	const STASH_KEY = "delete-account";
	let token = $state("");
	let ready = $state(false);
	const loginHref = `${resolve("/login")}?next=${encodeURIComponent(resolve("/delete-account"))}`;

	onMount(() => {
		token = takeLinkToken(STASH_KEY);
		// Survives the login detour; read back (and cleared) when the visitor returns.
		if (token && !data.loggedIn) stashLinkToken(STASH_KEY, token);
		ready = true;
	});
</script>

<AuthCard title={m.profile_delete_confirm_title()} subtitle={m.profile_delete_confirm_text()}>
	<noscript>
		<FormStatus type="error">{m.link_token_noscript()}</FormStatus>
	</noscript>

	{#if form?.deleteError}
		<FormStatus type="error">
			{#if form.deleteError === "token"}
				{m.profile_delete_token_error()}
			{:else if form.deleteError === "rate_limited"}
				{m.error_rate_limited()}
			{:else if form.deleteError === "missing"}
				{m.profile_delete_missing_token()}
			{:else}
				{m.error_invalid_input()}
			{/if}
		</FormStatus>
	{/if}

	{#if !data.loggedIn}
		<FormStatus type="error" class="mt-4">{m.profile_delete_confirm_login()}</FormStatus>
		<Button href={loginHref} fullWidth class="mt-6">{m.auth_login_submit()}</Button>
	{:else if ready && !token}
		<FormStatus type="error" class="mt-4">{m.profile_delete_missing_token()}</FormStatus>
	{:else if token}
		<form method="POST" class="mt-6 flex flex-col gap-5" use:enhance>
			<input type="hidden" name="deletionToken" value={token} />
			<Button type="submit" variant="outline" fullWidth>{m.profile_delete_confirm()}</Button>
		</form>
	{/if}
</AuthCard>
