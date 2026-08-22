<script lang="ts">
	import type { PageProps } from "./$types";
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { m } from "$lib/paraglide/messages";
	import AuthCard from "$lib/components/auth/AuthCard.svelte";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import Input from "$lib/components/ui/Input.svelte";

	let { data, form }: PageProps = $props();

	let avatarVersion = $state(0);

	const displayName = $derived(form?.displayName ?? data.user.displayName ?? "");
	const name = $derived(form?.name ?? data.user.name);
	const hasAvatar = $derived(
		form?.avatarRemoved ? false : Boolean(form?.avatarSuccess) || data.user.hasAvatar,
	);
	const avatarSrc = $derived(hasAvatar ? `/api/users/me/avatar?v=${avatarVersion}` : null);
</script>

<AuthCard title={m.profile_title()} subtitle={m.profile_subtitle()} class="max-w-4xl">
	<div class="grid gap-8 md:grid-cols-2 md:items-start md:gap-10">
		<div class="flex flex-col gap-8">
			<section class="flex flex-col items-center gap-4" aria-labelledby="profile-avatar-title">
				<h2 id="profile-avatar-title" class="sr-only">{m.profile_avatar_title()}</h2>
				<Avatar name={displayName || name} src={avatarSrc} size="lg" />

				{#if form?.avatarSuccess}
					<FormStatus type="success">{m.profile_avatar_updated()}</FormStatus>
				{:else if form?.avatarRemoved}
					<FormStatus type="success">{m.profile_avatar_removed()}</FormStatus>
				{:else if form?.avatarError}
					<FormStatus type="error">{m.error_invalid_input()}</FormStatus>
				{/if}

				<div class="flex flex-wrap justify-center gap-2">
					<form
						method="POST"
						action="?/avatar"
						enctype="multipart/form-data"
						use:enhance={() => {
							return async ({ result, update }) => {
								await update();
								if (result.type === "success") {
									avatarVersion += 1;
									await invalidateAll();
								}
							};
						}}
					>
						<label class="inline-flex">
							<span class="sr-only"
								>{hasAvatar ? m.profile_avatar_replace() : m.profile_avatar_upload()}</span
							>
							<input
								class="sr-only"
								type="file"
								name="avatar"
								accept="image/jpeg,image/png,image/webp"
								onchange={(event) => {
									const input = event.currentTarget;
									if (input.files?.length) input.form?.requestSubmit();
								}}
							/>
							<span
								class="inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-peach-200 px-4 text-sm font-semibold text-coral-950 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-coral-600 hover:bg-peach-300"
							>
								{hasAvatar ? m.profile_avatar_replace() : m.profile_avatar_upload()}
							</span>
						</label>
					</form>

					{#if hasAvatar}
						<form
							method="POST"
							action="?/removeAvatar"
							use:enhance={() => {
								return async ({ update }) => {
									await update();
									await invalidateAll();
								};
							}}
						>
							<Button type="submit" variant="ghost" size="sm">{m.profile_avatar_remove()}</Button>
						</form>
					{/if}
				</div>
				<p class="text-sm text-sand-600">{m.wizard_picture_hint()}</p>
			</section>

			<form
				method="POST"
				action="?/profile"
				class="flex flex-col gap-5"
				use:enhance={() => {
					return async ({ update }) => {
						await update({ reset: false });
						await invalidateAll();
					};
				}}
			>
				{#if form?.profileSuccess}
					<FormStatus type="success">{m.profile_saved()}</FormStatus>
				{:else if form?.profileError}
					<FormStatus type="error">{m.error_invalid_input()}</FormStatus>
				{/if}

				<Input
					id="profile-email"
					name="email"
					type="email"
					label={m.profile_email_readonly()}
					value={data.user.email}
					readonly
					hint={m.profile_email_hint()}
					autocomplete="email"
				/>
				<Input
					id="profile-name"
					name="name"
					label={m.auth_name()}
					required
					autocomplete="name"
					value={name}
				/>
				<Input
					id="profile-display-name"
					name="displayName"
					label={m.auth_display_name()}
					hint={m.auth_display_name_hint()}
					autocomplete="nickname"
					value={displayName}
				/>

				<Button type="submit" fullWidth>{m.profile_save()}</Button>
			</form>
		</div>

		<section
			class="flex flex-col gap-5 md:border-l md:border-sand-200 md:pl-10"
			aria-labelledby="profile-password-title"
		>
			<div>
				<h2 id="profile-password-title" class="text-lg font-bold text-sand-950">
					{m.profile_password_title()}
				</h2>
				<p class="mt-1 text-sm text-sand-700">{m.profile_password_subtitle()}</p>
			</div>

			<form
				method="POST"
				action="?/password"
				class="flex flex-col gap-5"
				use:enhance={() => {
					return async ({ update }) => {
						await update();
					};
				}}
			>
				{#if form?.passwordSuccess}
					<FormStatus type="success">{m.profile_password_saved()}</FormStatus>
				{:else if form?.passwordError}
					<FormStatus type="error">
						{#if form.passwordError === "current"}
							{m.profile_password_current_error()}
						{:else if form.passwordError === "rate_limited"}
							{m.error_rate_limited()}
						{:else}
							{m.error_invalid_input()}
						{/if}
					</FormStatus>
				{/if}

				<Input
					id="profile-current-password"
					name="currentPassword"
					type="password"
					label={m.profile_password_current()}
					required
					minlength={8}
					maxlength={128}
					autocomplete="current-password"
				/>
				<Input
					id="profile-new-password"
					name="newPassword"
					type="password"
					label={m.auth_reset_new_password()}
					hint={m.auth_password_hint()}
					required
					minlength={8}
					maxlength={128}
					autocomplete="new-password"
				/>

				<Button type="submit" variant="secondary" fullWidth>{m.profile_password_save()}</Button>
			</form>
		</section>
	</div>
</AuthCard>
