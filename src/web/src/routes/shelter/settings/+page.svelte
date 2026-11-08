<script lang="ts">
	import type { PageProps } from "./$types";
	import { enhance } from "$app/forms";
	import { invalidateAll } from "$app/navigation";
	import { m } from "$lib/paraglide/messages";
	import StatusPill from "$lib/components/admin/StatusPill.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import Textarea from "$lib/components/ui/Textarea.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";

	let { data, form }: PageProps = $props();

	const shelter = $derived(data.shelter);
	const locked = $derived(!data.isOwner || data.readonly);
	const identityLocked = $derived(locked || data.identityLocked);

	// The logo URL is cached for a day; a new version must show right after the change.
	let logoVersion = $state(0);
	let logoError = $state(false);

	async function changeLogo(method: "PUT" | "DELETE", file?: File) {
		if (!shelter) return;
		logoError = false;
		let body: FormData | undefined;
		if (file) {
			body = new FormData();
			body.set("logo", file);
		}
		try {
			const response = await fetch(`/api/shelters/${shelter.id}/logo`, { method, body });
			if (!response.ok) {
				logoError = true;
				return;
			}
			logoVersion = Date.now();
			await invalidateAll();
		} catch {
			logoError = true;
		}
	}
</script>

<p class="text-center text-sm text-sand-700">{m.shelter_settings_subtitle()}</p>

{#if shelter}
	<form
		method="POST"
		class="mt-6 flex flex-col gap-4"
		use:enhance={() => {
			return async ({ update }) => {
				await update({ reset: false });
			};
		}}
	>
		<Input
			id="org_name"
			name="org_name"
			label={m.shelter_field_org()}
			hint={data.identityLocked ? m.shelter_identity_locked_hint() : undefined}
			value={shelter.org_name}
			required
			disabled={identityLocked}
		/>
		<Input
			id="street"
			name="street"
			label={m.shelter_field_street()}
			value={shelter.street}
			required
			disabled={locked}
		/>
		<div class="grid gap-4 sm:grid-cols-2">
			<Input
				id="zip"
				name="zip"
				label={m.shelter_field_zip()}
				value={shelter.zip}
				required
				disabled={locked}
			/>
			<Input
				id="city"
				name="city"
				label={m.shelter_field_city()}
				value={shelter.city}
				required
				disabled={locked}
			/>
		</div>
		<Input
			id="website"
			name="website"
			label={m.shelter_field_website()}
			value={shelter.website ?? ""}
			disabled={locked}
		/>
		<Input
			id="donation_url"
			name="donation_url"
			label={m.shelter_field_donation_url()}
			hint={m.shelter_donation_url_hint()}
			value={shelter.donation_url ?? ""}
			disabled={locked}
		/>
		<Textarea
			id="donation_description"
			name="donation_description"
			label={m.shelter_field_donation_desc()}
			hint={m.shelter_donation_desc_hint()}
			value={shelter.donation_description ?? ""}
			disabled={locked}
		/>
		<Input
			id="registration_number"
			name="registration_number"
			label={m.shelter_field_reg()}
			hint={data.identityLocked ? m.shelter_identity_locked_hint() : undefined}
			value={shelter.registration_number ?? ""}
			disabled={identityLocked}
		/>
		<Textarea
			id="description"
			name="description"
			label={m.shelter_field_org_desc()}
			value={shelter.description ?? ""}
			disabled={locked}
		/>
		<section class="flex flex-col gap-3" aria-labelledby="shelter-logo-title">
			<div>
				<h2 id="shelter-logo-title" class="text-lg font-bold text-sand-950">
					{m.shelter_logo_title()}
				</h2>
				<p class="mt-1 text-sm text-sand-700">{m.shelter_logo_hint()}</p>
			</div>
			{#if shelter.has_logo}
				<img
					src="/api/shelters/{shelter.id}/logo{logoVersion ? `?v=${logoVersion}` : ''}"
					alt=""
					class="size-20 rounded-xl border border-sand-200 object-cover"
				/>
			{/if}
			{#if !locked}
				<label
					class="inline-flex w-fit rounded-full outline-2 outline-offset-2 outline-transparent has-focus-visible:outline-coral-600"
				>
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						class="sr-only"
						onchange={async (event) => {
							const input = event.currentTarget;
							const file = input.files?.[0];
							if (!file) return;
							await changeLogo("PUT", file);
							input.value = "";
						}}
					/>
					<span
						class="inline-flex h-10 cursor-pointer items-center rounded-full bg-peach-200 px-4 text-sm font-semibold text-coral-950"
					>
						{m.shelter_logo_add()}
					</span>
				</label>
				{#if shelter.has_logo}
					<Button type="button" variant="ghost" size="sm" onclick={() => void changeLogo("DELETE")}
						>{m.shelter_logo_remove()}</Button
					>
				{/if}
				{#if logoError}
					<FormStatus type="error">{m.error_invalid_input()}</FormStatus>
				{/if}
			{/if}
		</section>
		<Input
			id="notify_email"
			name="notify_email"
			type="email"
			label={m.shelter_field_notify()}
			hint={m.shelter_notify_hint()}
			value={shelter.notify_email ?? ""}
			required
			disabled={locked}
		/>
		{#if shelter.notify_last_error}
			<FormStatus type="error"
				>{m.shelter_notify_error({ error: shelter.notify_last_error })}</FormStatus
			>
		{/if}
		<p class="flex items-center gap-2 text-sm text-sand-600">
			{m.shelter_verification()}: <StatusPill status={shelter.verification_status} />
		</p>
		{#if form?.success}
			<FormStatus type="success">{m.shelter_saved()}</FormStatus>
		{:else if form?.identityLocked}
			<FormStatus type="error">{m.shelter_identity_locked_error()}</FormStatus>
		{:else if form?.error}
			<FormStatus type="error">{m.error_invalid_input()}</FormStatus>
		{/if}
		{#if !locked}
			<Button type="submit">{m.profile_save()}</Button>
		{/if}
	</form>
{/if}
