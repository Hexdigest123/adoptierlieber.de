<script lang="ts">
	import type { PageProps } from "./$types";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import AuthCard from "$lib/components/auth/AuthCard.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";

	let { data, form }: PageProps = $props();
	const next = $derived(form?.next || data.next);
</script>

<AuthCard title={m.auth_login_title()} subtitle={m.auth_login_subtitle()}>
	<form method="POST" class="flex flex-col gap-5">
		{#if next}
			<input type="hidden" name="next" value={next} />
		{/if}
		{#if form?.loginError}
			<FormStatus type="error">
				{form.loginError === "rate_limited" ? m.error_rate_limited() : m.auth_login_error()}
			</FormStatus>
		{/if}

		<Input
			id="login-email"
			name="email"
			type="email"
			label={m.auth_email()}
			required
			autocomplete="email"
			value={form?.email ?? ""}
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
	</form>
</AuthCard>
