<script lang="ts">
	import type { PageProps } from "./$types";
	import { resolve } from "$app/paths";
	import { startAuthentication } from "@simplewebauthn/browser";
	import { m } from "$lib/paraglide/messages";
	import AuthCard from "$lib/components/auth/AuthCard.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";

	let { data, form }: PageProps = $props();
	const next = $derived(form?.next || data.next);
	const mfaRequired = $derived(Boolean(form && "mfaRequired" in form && form.mfaRequired));
	let passkeyBusy = $state(false);
	let passkeyClientError = $state(false);

	async function signInWithPasskey() {
		passkeyBusy = true;
		passkeyClientError = false;
		try {
			const optionsRes = await fetch("/api/passkeys/assertions/options", { method: "POST" });
			if (!optionsRes.ok) {
				passkeyClientError = true;
				return;
			}
			const options = (await optionsRes.json()) as {
				challenge_id: string;
				[key: string]: unknown;
			};
			const { challenge_id: challengeId, ...optionsJSON } = options;
			const assertion = await startAuthentication({ optionsJSON: optionsJSON as never });
			const formEl = document.getElementById("passkey-form") as HTMLFormElement | null;
			if (!formEl) return;
			(formEl.elements.namedItem("challengeId") as HTMLInputElement).value = challengeId;
			(formEl.elements.namedItem("assertion") as HTMLInputElement).value =
				JSON.stringify(assertion);
			formEl.requestSubmit();
		} catch {
			passkeyClientError = true;
		} finally {
			passkeyBusy = false;
		}
	}
</script>

<AuthCard
	title={mfaRequired ? m.auth_totp_title() : m.auth_login_title()}
	subtitle={mfaRequired ? m.auth_totp_subtitle() : m.auth_login_subtitle()}
>
	{#if mfaRequired && form && "mfaToken" in form}
		<form method="POST" action="?/totp" class="flex flex-col gap-5">
			<input type="hidden" name="mfaToken" value={form.mfaToken} />
			<input type="hidden" name="email" value={form.email ?? ""} />
			{#if next}
				<input type="hidden" name="next" value={next} />
			{/if}
			{#if "totpError" in form && form.totpError}
				<FormStatus type="error">
					{form.totpError === "rate_limited" ? m.error_rate_limited() : m.auth_totp_error()}
				</FormStatus>
			{/if}
			<Input
				id="login-totp"
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
		<form method="POST" action="?/password" class="flex flex-col gap-5">
			{#if next}
				<input type="hidden" name="next" value={next} />
			{/if}
			{#if form && "loginError" in form && form.loginError}
				<FormStatus type="error">
					{form.loginError === "rate_limited" ? m.error_rate_limited() : m.auth_login_error()}
				</FormStatus>
			{/if}
			{#if (form && "passkeyError" in form && form.passkeyError) || passkeyClientError}
				<FormStatus type="error">{m.auth_login_passkey_error()}</FormStatus>
			{/if}

			<Input
				id="login-email"
				name="email"
				type="email"
				label={m.auth_email()}
				required
				autocomplete="email"
				value={form && "email" in form ? (form.email ?? "") : ""}
			/>
			<Input
				id="login-password"
				name="password"
				type="password"
				label={m.auth_password()}
				required
				minlength={8}
				maxlength={128}
				autocomplete="current-password"
			/>

			<Button type="submit" fullWidth>{m.auth_login_submit()}</Button>
		</form>

		<div class="mt-5 flex flex-col gap-5">
			<p class="text-center text-sm text-sand-600">{m.auth_login_or()}</p>
			<form id="passkey-form" method="POST" action="?/passkey" class="hidden">
				{#if next}
					<input type="hidden" name="next" value={next} />
				{/if}
				<input type="hidden" name="challengeId" value="" />
				<input type="hidden" name="assertion" value="" />
			</form>
			<Button
				type="button"
				variant="secondary"
				fullWidth
				disabled={passkeyBusy}
				onclick={() => void signInWithPasskey()}
			>
				{m.auth_login_passkey()}
			</Button>
			<div class="flex flex-col items-center gap-2 text-center text-sm text-sand-700">
				<a
					href={resolve("/forgot-password")}
					class="inline-flex min-h-11 items-center font-semibold text-coral-700 underline underline-offset-2 focus-ring hover:text-coral-800"
				>
					{m.auth_forgot_password_link()}
				</a>
				<p>
					{m.auth_login_no_account()}
					<a
						href={resolve("/register")}
						class="inline-flex min-h-11 items-center font-semibold text-coral-700 underline underline-offset-2 focus-ring hover:text-coral-800"
					>
						{m.auth_login_register_link()}
					</a>
				</p>
			</div>
		</div>
	{/if}
</AuthCard>
