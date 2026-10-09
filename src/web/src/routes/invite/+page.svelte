<script lang="ts">
	import { onMount } from "svelte";
	import type { PageProps } from "./$types";
	import { enhance } from "$app/forms";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import { stashLinkToken, takeLinkToken } from "$lib/link-token";
	import type { InvitePreview } from "$lib/admin/types";
	import AuthCard from "$lib/components/auth/AuthCard.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import Input from "$lib/components/ui/Input.svelte";

	let { data, form }: PageProps = $props();

	const STASH_KEY = "invite";
	let token = $state("");
	let invite = $state<InvitePreview | null>(null);
	let loading = $state(true);
	const user = $derived(data.user);
	const matching = $derived(
		Boolean(user && invite && user.email.toLowerCase() === invite.email.toLowerCase()),
	);
	const wrongEmail = $derived(
		Boolean(user && invite && user.email.toLowerCase() !== invite.email.toLowerCase()),
	);

	// Previewed from the browser: the token never reaches a page URL the server sees.
	async function preview(linkToken: string): Promise<InvitePreview | null> {
		try {
			const response = await fetch("/api/invites/preview", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({ token: linkToken }),
			});
			return response.ok ? ((await response.json()) as InvitePreview) : null;
		} catch {
			return null;
		}
	}

	onMount(async () => {
		token = takeLinkToken(STASH_KEY);
		invite = token ? await preview(token) : null;
		// Kept for after login; read back (and cleared) when the visitor returns.
		if (invite?.existing_user && !user) stashLinkToken(STASH_KEY, token);
		loading = false;
	});
</script>

{#if loading}
	<AuthCard title={m.invite_title()} subtitle={m.invite_loading()}>
		<noscript>
			<FormStatus type="error">{m.link_token_noscript()}</FormStatus>
		</noscript>
	</AuthCard>
{:else if !invite || form?.inviteError === "invalid"}
	<AuthCard title={m.invite_invalid_title()} subtitle={m.invite_invalid_text()}>
		<span></span>
	</AuthCard>
{:else if wrongEmail || form?.inviteError === "wrong_email"}
	<AuthCard title={m.invite_title()} subtitle={m.invite_wrong_email()}>
		<form method="POST" action={resolve("/logout")}>
			<Button type="submit" fullWidth>{m.invite_logout()}</Button>
		</form>
	</AuthCard>
{:else if invite.existing_user && !user}
	<AuthCard title={m.invite_title()} subtitle={m.invite_login_to_accept()}>
		<Button href="{resolve('/login')}?next={encodeURIComponent(resolve('/invite'))}" fullWidth>
			{m.invite_login()}
		</Button>
	</AuthCard>
{:else if invite.existing_user && matching}
	<AuthCard title={m.invite_title()} subtitle={m.invite_subtitle()}>
		{#if form?.inviteError === "generic"}
			<FormStatus type="error" class="mb-4">{m.admin_error_generic()}</FormStatus>
		{/if}
		<form method="POST" action="?/accept" class="flex flex-col gap-4" use:enhance>
			<input type="hidden" name="token" value={token} />
			<p class="text-sm text-sand-700">{invite.email}</p>
			<Button type="submit" fullWidth>{m.invite_accept()}</Button>
		</form>
	</AuthCard>
{:else}
	<AuthCard title={m.invite_create_title()} subtitle={m.invite_subtitle()} wide>
		{#if form?.inviteError === "generic"}
			<FormStatus type="error" class="mb-4">{m.admin_error_generic()}</FormStatus>
		{/if}
		<form method="POST" action="?/accept" class="flex flex-col gap-4" use:enhance>
			<input type="hidden" name="token" value={token} />
			<Input id="invite-email" label={m.invite_email()} value={invite.email} disabled />
			<Input id="invite-name" name="name" label={m.auth_name()} required autocomplete="name" />
			<Input
				id="invite-display"
				name="displayName"
				label={m.auth_display_name()}
				hint={m.auth_display_name_hint()}
			/>
			<Input
				id="invite-password"
				name="password"
				type="password"
				label={m.auth_password()}
				hint={m.auth_password_hint()}
				required
				minlength={8}
				maxlength={128}
				autocomplete="new-password"
			/>
			<Input
				id="invite-street"
				name="street"
				label={m.auth_street()}
				required
				autocomplete="street-address"
			/>
			<div class="grid gap-4 sm:grid-cols-2">
				<Input
					id="invite-zip"
					name="zip"
					label={m.auth_zip()}
					required
					autocomplete="postal-code"
				/>
				<Input
					id="invite-city"
					name="city"
					label={m.auth_city()}
					required
					autocomplete="address-level2"
				/>
			</div>
			<Button type="submit" fullWidth>{m.invite_create_submit()}</Button>
		</form>
	</AuthCard>
{/if}
