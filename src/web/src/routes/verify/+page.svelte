<script lang="ts">
	import type { PageProps } from "./$types";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import AuthCard from "$lib/components/auth/AuthCard.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";

	let { data, form }: PageProps = $props();
</script>

<svelte:head><title>{m.auth_verify_title()} – {m.brand_name()}</title></svelte:head>

{#if form?.verifySuccess}
	<AuthCard title={m.auth_verify_success_title()}>
		<FormStatus type="success">{m.auth_verify_success_text()}</FormStatus>
		<Button href={resolve("/login")} fullWidth class="mt-6">{m.auth_login_submit()}</Button>
	</AuthCard>
{:else}
	<AuthCard title={m.auth_verify_title()} subtitle={m.auth_verify_subtitle()}>
		<form method="POST" class="flex flex-col gap-5">
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
			/>

			<Button type="submit" fullWidth>{m.auth_verify_submit()}</Button>
		</form>
	</AuthCard>
{/if}
