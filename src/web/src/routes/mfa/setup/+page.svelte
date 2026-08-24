<script lang="ts">
	import type { PageProps } from "./$types";
	import { startRegistration } from "@simplewebauthn/browser";
	import { renderSVG } from "uqr";
	import { m } from "$lib/paraglide/messages";
	import AuthCard from "$lib/components/auth/AuthCard.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";

	let { form }: PageProps = $props();

	const totpUri = $derived(form && "totpUri" in form ? form.totpUri : "");
	const totpSecret = $derived(form && "totpSecret" in form ? form.totpSecret : "");
	const qr = $derived(totpUri ? renderSVG(totpUri, { pixelSize: 6 }) : "");
	let passkeyBusy = $state(false);
	let passkeyName = $state("Passkey");

	async function addPasskey() {
		passkeyBusy = true;
		try {
			const optionsRes = await fetch("/api/passkeys/registrations/options", { method: "POST" });
			if (!optionsRes.ok) return;
			const optionsJSON = (await optionsRes.json()) as never;
			const attestation = await startRegistration({ optionsJSON });
			const formEl = document.getElementById("passkey-enroll") as HTMLFormElement | null;
			if (!formEl) return;
			(formEl.elements.namedItem("attestation") as HTMLInputElement).value =
				JSON.stringify(attestation);
			formEl.requestSubmit();
		} finally {
			passkeyBusy = false;
		}
	}
</script>

<AuthCard title={m.auth_mfa_setup_title()} subtitle={m.auth_mfa_setup_subtitle()} wide>
	<div class="flex flex-col gap-8">
		<p class="text-sm text-sand-700">{m.auth_mfa_setup_lockout()}</p>

		<section class="flex flex-col gap-4" aria-labelledby="mfa-totp-title">
			<h2 id="mfa-totp-title" class="text-lg font-bold text-sand-950">
				{m.auth_mfa_setup_totp_title()}
			</h2>
			<p class="text-sm text-sand-700">{m.auth_mfa_setup_totp_text()}</p>
			{#if form && "totpStartError" in form && form.totpStartError}
				<FormStatus type="error">{m.error_generic()}</FormStatus>
			{/if}
			{#if totpUri && totpSecret}
				<div class="mx-auto w-48 [&_svg]:h-full [&_svg]:w-full">
					{@html qr}
				</div>
				<p class="break-all font-mono text-sm text-sand-800">
					<span class="font-sans font-semibold">{m.auth_mfa_setup_totp_secret()}:</span>
					{totpSecret}
				</p>
				<form method="POST" action="?/confirmTotp" class="flex flex-col gap-4">
					<input type="hidden" name="totpUri" value={totpUri} />
					<input type="hidden" name="totpSecret" value={totpSecret} />
					{#if form && "totpConfirmError" in form && form.totpConfirmError}
						<FormStatus type="error">{m.auth_totp_error()}</FormStatus>
					{/if}
					<Input
						id="setup-totp"
						name="code"
						inputmode="numeric"
						autocomplete="one-time-code"
						label={m.auth_totp_code()}
						required
						minlength={6}
						maxlength={6}
						pattern={"[0-9]{6}"}
					/>
					<Button type="submit" fullWidth>{m.auth_totp_submit()}</Button>
				</form>
			{:else}
				<form method="POST" action="?/startTotp">
					<Button type="submit" variant="secondary" fullWidth>
						{m.auth_mfa_setup_totp_start()}
					</Button>
				</form>
			{/if}
		</section>

		<section class="flex flex-col gap-4 border-t border-sand-200 pt-8" aria-labelledby="mfa-passkey-title">
			<h2 id="mfa-passkey-title" class="text-lg font-bold text-sand-950">
				{m.auth_mfa_setup_passkey_title()}
			</h2>
			<p class="text-sm text-sand-700">{m.auth_mfa_setup_passkey_text()}</p>
			{#if form && "passkeyError" in form && form.passkeyError}
				<FormStatus type="error">{m.error_generic()}</FormStatus>
			{/if}
			<Input
				id="setup-passkey-name"
				name="name"
				label={m.auth_mfa_setup_passkey_name()}
				bind:value={passkeyName}
			/>
			<form id="passkey-enroll" method="POST" action="?/passkey" class="hidden">
				<input type="hidden" name="name" value={passkeyName} />
				<input type="hidden" name="attestation" value="" />
			</form>
			<Button
				type="button"
				variant="secondary"
				fullWidth
				disabled={passkeyBusy}
				onclick={() => void addPasskey()}
			>
				{m.auth_mfa_setup_passkey_add()}
			</Button>
		</section>

		<form method="POST" action="/logout">
			<Button type="submit" variant="ghost" fullWidth>{m.auth_mfa_setup_logout()}</Button>
		</form>
	</div>
</AuthCard>
