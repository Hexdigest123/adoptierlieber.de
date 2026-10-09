<script lang="ts">
	import { onMount, tick } from "svelte";
	import type { PageProps } from "./$types";
	import { enhance } from "$app/forms";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import { takeLinkToken } from "$lib/link-token";
	import AuthCard from "$lib/components/auth/AuthCard.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";

	let { data, form }: PageProps = $props();

	let token = $state("");
	let autoForm: HTMLFormElement | undefined = $state();
	const autoVerify = $derived(
		Boolean(data.email && token && !data.verifySuccess && !form?.verifyError),
	);

	onMount(async () => {
		token = takeLinkToken();
		await tick();
		if (autoVerify) autoForm?.requestSubmit();
	});
</script>

{#if data.verifySuccess}
	<AuthCard title={m.auth_verify_success_title()}>
		<FormStatus type="success">{m.auth_verify_success_text()}</FormStatus>
		<Button
			href="{resolve('/login')}{data.next ? `?next=${encodeURIComponent(data.next)}` : ''}"
			fullWidth
			class="mt-6">{m.auth_login_submit()}</Button
		>
	</AuthCard>
{:else if autoVerify}
	<AuthCard title={m.auth_verify_title()} subtitle={m.auth_verify_working()}>
		<form method="POST" class="flex flex-col gap-5" bind:this={autoForm} use:enhance>
			<input type="hidden" name="email" value={data.email} />
			<input type="hidden" name="token" value={token} />
			<Button type="submit" fullWidth>{m.auth_verify_submit()}</Button>
		</form>
	</AuthCard>
{:else}
	<AuthCard title={m.auth_verify_title()} subtitle={m.auth_verify_subtitle()}>
		<noscript>
			<FormStatus type="error" class="mb-5">{m.link_token_noscript_code()}</FormStatus>
		</noscript>
		<form method="POST" class="flex flex-col gap-5" use:enhance>
			{#if form?.verifyError}
				<FormStatus type="error">{m.error_generic()}</FormStatus>
			{/if}

			<Input
				id="verify-email"
				name="email"
				type="email"
				label={m.auth_email()}
				required
				autocomplete="email"
				value={form?.email ?? data.email}
			/>
			<Input
				id="verify-token"
				name="token"
				label={m.auth_verify_token()}
				required
				autocomplete="one-time-code"
				value={token}
			/>

			<Button type="submit" fullWidth>{m.auth_verify_submit()}</Button>
		</form>
	</AuthCard>
{/if}
