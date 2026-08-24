<script lang="ts">
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { startRegistration } from "@simplewebauthn/browser";
	import { renderSVG } from "uqr";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import type { SessionUser } from "$lib/types/session";

	type PasskeyItem = {
		id: string;
		name: string;
		created_at: string;
		last_used_at: string | null;
	};

	type FormState = Record<string, unknown> | null;

	let {
		user,
		passkeys,
		form,
	}: {
		user: SessionUser;
		passkeys: PasskeyItem[];
		form: FormState;
	} = $props();

	const totpUri = $derived(typeof form?.totpUri === "string" ? form.totpUri : "");
	const totpSecret = $derived(typeof form?.totpSecret === "string" ? form.totpSecret : "");
	const qr = $derived(totpUri ? renderSVG(totpUri, { pixelSize: 5 }) : "");
	const lastFactor = $derived(user.mfa_required && user.totp_enabled && passkeys.length === 0);
	let passkeyBusy = $state(false);
	let newPasskeyName = $state("Passkey");

	async function addPasskey() {
		passkeyBusy = true;
		try {
			const optionsRes = await fetch("/api/passkeys/registrations/options", { method: "POST" });
			if (!optionsRes.ok) return;
			const optionsJSON = (await optionsRes.json()) as never;
			const attestation = await startRegistration({ optionsJSON });
			const formEl = document.getElementById("profile-passkey-add") as HTMLFormElement | null;
			if (!formEl) return;
			(formEl.elements.namedItem("attestation") as HTMLInputElement).value =
				JSON.stringify(attestation);
			formEl.requestSubmit();
		} finally {
			passkeyBusy = false;
		}
	}
</script>

<section class="flex flex-col gap-5 border-t border-sand-200 pt-8" aria-labelledby="profile-mfa-title">
	<div>
		<h2 id="profile-mfa-title" class="text-lg font-bold text-sand-950">{m.profile_mfa_title()}</h2>
		<p class="mt-1 text-sm text-sand-700">{m.profile_mfa_subtitle()}</p>
	</div>

	{#if user.mfa_required}
		<FormStatus type="error">{m.profile_mfa_required()}</FormStatus>
	{/if}
	{#if form?.totpEnabled}
		<FormStatus type="success">{m.profile_mfa_totp_enabled()}</FormStatus>
	{:else if form?.totpDisabled || form?.passkeyRemoved}
		<FormStatus type="success">{m.profile_saved()}</FormStatus>
	{:else if form?.passkeyAdded}
		<FormStatus type="success">{m.profile_mfa_passkey_added()}</FormStatus>
	{:else if form?.totpError === "last" || form?.passkeyError === "last"}
		<FormStatus type="error">{m.profile_mfa_last_factor()}</FormStatus>
	{:else if form?.totpError === "code" || form?.totpError === "auth" || form?.passkeyError === "auth"}
		<FormStatus type="error">{m.auth_totp_error()}</FormStatus>
	{:else if form?.totpError || form?.passkeyError}
		<FormStatus type="error">{m.error_generic()}</FormStatus>
	{/if}

	<p class="text-sm text-sand-800">
		{user.totp_enabled ? m.profile_mfa_totp_on() : m.profile_mfa_totp_off()}
	</p>

	{#if totpUri && totpSecret}
		<div class="mx-auto w-40 [&_svg]:h-full [&_svg]:w-full">{@html qr}</div>
		<p class="break-all font-mono text-xs text-sand-800">{totpSecret}</p>
		<form method="POST" action="?/confirmTotp" class="flex flex-col gap-3" use:enhance>
			<input type="hidden" name="totpUri" value={totpUri} />
			<input type="hidden" name="totpSecret" value={totpSecret} />
			<Input
				id="profile-totp-code"
				name="code"
				inputmode="numeric"
				autocomplete="one-time-code"
				label={m.auth_totp_code()}
				required
				minlength={6}
				maxlength={6}
			/>
			<Button type="submit" variant="secondary" fullWidth>{m.auth_totp_submit()}</Button>
		</form>
	{:else if !user.totp_enabled}
		<form method="POST" action="?/startTotp" use:enhance>
			<Button type="submit" variant="secondary" fullWidth>{m.profile_mfa_totp_enable()}</Button>
		</form>
	{:else if !lastFactor}
		<form method="POST" action="?/disableTotp" class="flex flex-col gap-3" use:enhance>
			<Input
				id="profile-totp-password"
				name="currentPassword"
				type="password"
				label={m.profile_password_current()}
				required
				autocomplete="current-password"
			/>
			<Input
				id="profile-totp-disable-code"
				name="code"
				inputmode="numeric"
				autocomplete="one-time-code"
				label={m.profile_mfa_code()}
				required
				minlength={6}
				maxlength={6}
			/>
			<Button type="submit" variant="ghost" fullWidth>{m.profile_mfa_totp_disable()}</Button>
		</form>
	{/if}

	<div>
		<h3 class="text-base font-bold text-sand-950">{m.profile_mfa_passkeys()}</h3>
		{#if passkeys.length === 0}
			<p class="mt-1 text-sm text-sand-700">{m.profile_mfa_passkey_empty()}</p>
		{/if}
	</div>

	<ul class="flex flex-col gap-3">
		{#each passkeys as key (key.id)}
			<li class="rounded-2xl border border-sand-200 p-4">
				<form method="POST" action="?/renamePasskey" class="flex flex-col gap-3" use:enhance>
					<input type="hidden" name="id" value={key.id} />
					<Input
						id="passkey-name-{key.id}"
						name="name"
						label={m.profile_mfa_passkey_name()}
						value={key.name}
						required
					/>
					<Button type="submit" variant="ghost" size="sm">{m.profile_mfa_passkey_rename()}</Button>
				</form>
				<form method="POST" action="?/removePasskey" class="mt-3 flex flex-col gap-3" use:enhance>
					<input type="hidden" name="id" value={key.id} />
					<Input
						id="passkey-pw-{key.id}"
						name="currentPassword"
						type="password"
						label={m.profile_password_current()}
						required
						autocomplete="current-password"
					/>
					<Button type="submit" variant="ghost" size="sm">{m.profile_mfa_passkey_remove()}</Button>
				</form>
			</li>
		{/each}
	</ul>

	<Input
		id="profile-new-passkey-name"
		name="name"
		label={m.auth_mfa_setup_passkey_name()}
		bind:value={newPasskeyName}
	/>
	<form
		id="profile-passkey-add"
		method="POST"
		action="?/addPasskey"
		class="hidden"
		use:enhance={() => {
			return async ({ update }) => {
				await update();
				await invalidateAll();
			};
		}}
	>
		<input type="hidden" name="name" value={newPasskeyName} />
		<input type="hidden" name="attestation" value="" />
	</form>
	<Button type="button" variant="secondary" fullWidth disabled={passkeyBusy} onclick={() => void addPasskey()}>
		{m.profile_mfa_passkey_add()}
	</Button>
</section>
