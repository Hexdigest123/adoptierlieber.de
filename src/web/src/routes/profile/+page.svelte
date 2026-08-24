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
	import ProfileMfa from "$lib/components/profile/ProfileMfa.svelte";

	let { data, form }: PageProps = $props();

	let avatarVersion = $state(0);

	const displayName = $derived(form?.displayName ?? data.user.displayName ?? "");
	const name = $derived(form?.name ?? data.user.name);
	const street = $derived(form?.street ?? data.user.street ?? "");
	const zip = $derived(form?.zip ?? data.user.zip ?? "");
	const city = $derived(form?.city ?? data.user.city ?? "");
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
				<Input
					id="profile-street"
					name="street"
					label={m.auth_street()}
					required
					autocomplete="street-address"
					value={street}
				/>
				<div class="grid grid-cols-[7rem_1fr] gap-3">
					<Input
						id="profile-zip"
						name="zip"
						label={m.auth_zip()}
						required
						autocomplete="postal-code"
						value={zip}
					/>
					<Input
						id="profile-city"
						name="city"
						label={m.auth_city()}
						required
						autocomplete="address-level2"
						value={city}
					/>
				</div>

				<Button type="submit" fullWidth>{m.profile_save()}</Button>
			</form>

			<section class="flex flex-col gap-3" aria-labelledby="profile-home-title">
				<div>
					<h2 id="profile-home-title" class="text-lg font-bold text-sand-950">
						{m.app_profile_home()}
					</h2>
					<p class="mt-1 text-sm text-sand-700">{m.app_profile_home_hint()}</p>
				</div>
				{#if form?.homeSuccess}
					<FormStatus type="success">{m.app_profile_home_saved()}</FormStatus>
				{:else if form?.homeError}
					<FormStatus type="error">{m.app_location_none()}</FormStatus>
				{/if}
				<form method="POST" action="?/home" class="flex flex-col gap-3" use:enhance>
					<Input
						id="profile-home"
						name="home_query"
						label={m.app_location_place()}
						hint={m.app_location_place_hint()}
						value={data.user.home_query ?? data.user.home_label ?? ""}
					/>
					<Button type="submit" variant="secondary" fullWidth>{m.app_profile_home_save()}</Button>
				</form>
				<Button
					type="button"
					variant="ghost"
					fullWidth
					onclick={() => {
						if (!navigator.geolocation) return;
						navigator.geolocation.getCurrentPosition(async (pos) => {
							await fetch("/api/users/me", {
								method: "PATCH",
								headers: { "content-type": "application/json" },
								body: JSON.stringify({
									home_lat: pos.coords.latitude,
									home_lng: pos.coords.longitude,
									location_precision: "gps",
								}),
							});
							await invalidateAll();
						});
					}}>{m.app_profile_gps()}</Button
				>
				{#if data.user.home_label || data.user.home_lat}
					<form method="POST" action="?/homeClear" use:enhance>
						<Button type="submit" variant="ghost" fullWidth>{m.app_profile_home_clear()}</Button>
					</form>
				{/if}
			</section>
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

			<ProfileMfa user={data.user} passkeys={data.passkeys} {form} />

			<section
				class="flex flex-col gap-3 border-t border-sand-200 pt-8"
				aria-labelledby="profile-taste-title"
			>
				<div>
					<h2 id="profile-taste-title" class="text-lg font-bold text-sand-950">
						{m.app_profile_taste()}
					</h2>
					<p class="mt-1 text-sm text-sand-700">{m.app_profile_taste_hint()}</p>
				</div>
				{#if form?.tasteReset}
					<FormStatus type="success">{m.app_profile_taste_reset()}</FormStatus>
				{:else if form?.tasteError}
					<FormStatus type="error">{m.error_generic()}</FormStatus>
				{/if}
				<form method="POST" action="?/resetTaste" use:enhance>
					<Button type="submit" variant="ghost" fullWidth>{m.app_profile_taste_reset_cta()}</Button>
				</form>
			</section>

			<section class="flex flex-col gap-3" aria-labelledby="profile-seen-title">
				<div>
					<h2 id="profile-seen-title" class="text-lg font-bold text-sand-950">
						{m.app_profile_seen()}
					</h2>
					<p class="mt-1 text-sm text-sand-700">{m.app_profile_seen_hint()}</p>
				</div>
				{#if form?.seenReset}
					<FormStatus type="success">{m.app_profile_seen_reset()}</FormStatus>
				{:else if form?.seenError}
					<FormStatus type="error">{m.error_generic()}</FormStatus>
				{/if}
				<form method="POST" action="?/resetSeen" use:enhance>
					<Button type="submit" variant="ghost" fullWidth>{m.app_profile_seen_reset_cta()}</Button>
				</form>
			</section>

			<section
				class="flex flex-col gap-5 border-t border-sand-200 pt-8"
				aria-labelledby="profile-delete-title"
			>
				<div>
					<h2 id="profile-delete-title" class="text-lg font-bold text-sand-950">
						{m.profile_delete_title()}
					</h2>
					<p class="mt-1 text-sm text-sand-700">{m.profile_delete_subtitle()}</p>
				</div>

				{#if form?.deletionRequested}
					<form
						method="POST"
						action="?/confirmDeletion"
						class="flex flex-col gap-5"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
							};
						}}
					>
						{#if form?.deleteError}
							<FormStatus type="error">
								{#if form.deleteError === "token"}
									{m.profile_delete_token_error()}
								{:else if form.deleteError === "rate_limited"}
									{m.error_rate_limited()}
								{:else if form.deleteError === "last_owner"}
									{m.shelter_last_owner()}
								{:else}
									{m.error_invalid_input()}
								{/if}
							</FormStatus>
						{:else}
							<FormStatus type="success">{m.profile_delete_requested()}</FormStatus>
						{/if}

						<Input
							id="profile-deletion-token"
							name="deletionToken"
							label={m.profile_delete_token()}
							required
							autocomplete="one-time-code"
						/>

						<Button type="submit" variant="outline" fullWidth>{m.profile_delete_confirm()}</Button>
					</form>
				{:else}
					<form
						method="POST"
						action="?/requestDeletion"
						class="flex flex-col gap-5"
						use:enhance={() => {
							return async ({ update }) => {
								await update();
							};
						}}
					>
						{#if form?.deleteError}
							<FormStatus type="error">
								{#if form.deleteError === "mail"}
									{m.profile_delete_mail_error()}
								{:else if form.deleteError === "rate_limited"}
									{m.error_rate_limited()}
								{:else}
									{m.error_generic()}
								{/if}
							</FormStatus>
						{/if}

						<Button type="submit" variant="outline" fullWidth>{m.profile_delete_request()}</Button>
					</form>
				{/if}
			</section>
		</section>
	</div>
</AuthCard>
