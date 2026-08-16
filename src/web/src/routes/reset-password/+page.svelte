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

<svelte:head><title>{m.auth_reset_title()} – {m.brand_name()}</title></svelte:head>

{#if form?.resetSuccess}
	<AuthCard title={m.auth_reset_success_title()}>
		<FormStatus type="success">{m.auth_reset_success_text()}</FormStatus>
		<Button href={resolve("/login")} fullWidth class="mt-6">{m.auth_login_submit()}</Button>
	</AuthCard>
{:else}
	<AuthCard title={m.auth_reset_title()} subtitle={m.auth_reset_subtitle()}>
		<form method="POST" class="flex flex-col gap-5">
			{#if form?.resetError}
				<FormStatus type="error">{m.error_generic()}</FormStatus>
			{/if}

			<Input
				id="reset-email"
				name="email"
				type="email"
				label={m.auth_email()}
				required
				autocomplete="email"
				value={form?.email ?? data.email}
			/>
			<Input
				id="reset-token"
				name="resetToken"
				label={m.auth_reset_token()}
				required
				autocomplete="one-time-code"
			/>
			<Input
				id="reset-new-password"
				name="newPassword"
				type="password"
				label={m.auth_reset_new_password()}
				hint={m.auth_password_hint()}
				required
				minlength={8}
				autocomplete="new-password"
			/>

			<Button type="submit" fullWidth>{m.auth_reset_submit()}</Button>

			<p class="text-center text-sm text-sand-700">
				<a
					href={resolve("/login")}
					class="font-semibold text-coral-700 underline underline-offset-2 focus-ring hover:text-coral-800"
				>
					{m.auth_back_to_login()}
				</a>
			</p>
		</form>
	</AuthCard>
{/if}
