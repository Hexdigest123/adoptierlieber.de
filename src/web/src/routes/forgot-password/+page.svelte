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

<svelte:head><title>{m.auth_forgot_title()} – {m.brand_name()}</title></svelte:head>

{#if form?.forgotSuccess}
	<AuthCard title={m.auth_forgot_title()}>
		<FormStatus type="success">{m.auth_forgot_success_text()}</FormStatus>
		<Button
			href="{resolve('/reset-password')}?email={encodeURIComponent(form.email ?? '')}"
			fullWidth
			class="mt-6"
		>
			{m.auth_forgot_success_cta()}
		</Button>
	</AuthCard>
{:else}
	<AuthCard title={m.auth_forgot_title()} subtitle={m.auth_forgot_subtitle()}>
		<form method="POST" class="flex flex-col gap-5">
			{#if form?.forgotError}
				<FormStatus type="error">{m.error_generic()}</FormStatus>
			{/if}

			<Input
				id="forgot-email"
				name="email"
				type="email"
				label={m.auth_email()}
				required
				autocomplete="email"
				value={form?.email ?? data.email}
			/>

			<Button type="submit" fullWidth>{m.auth_forgot_submit()}</Button>

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
