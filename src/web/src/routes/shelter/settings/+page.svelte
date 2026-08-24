<script lang="ts">
	import type { PageProps } from "./$types";
	import { enhance } from "$app/forms";
	import { m } from "$lib/paraglide/messages";
	import Input from "$lib/components/ui/Input.svelte";
	import Textarea from "$lib/components/ui/Textarea.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";

	let { data, form }: PageProps = $props();

	const shelter = $derived(data.shelter);
	const locked = $derived(!data.isOwner || data.readonly);
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
			value={shelter.org_name}
			required
			disabled={locked}
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
			id="registration_number"
			name="registration_number"
			label={m.shelter_field_reg()}
			value={shelter.registration_number ?? ""}
			disabled={locked}
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
					src="/api/shelters/{shelter.id}/logo"
					alt=""
					class="size-20 rounded-xl border border-sand-200 object-cover"
				/>
			{/if}
			{#if !locked}
				<label class="inline-flex">
					<span class="sr-only">{m.shelter_logo_add()}</span>
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						class="sr-only"
						onchange={async (event) => {
							const file = event.currentTarget.files?.[0];
							if (!file) return;
							const body = new FormData();
							body.set("logo", file);
							await fetch(`/api/shelters/${shelter.id}/logo`, { method: "PUT", body });
							location.reload();
						}}
					/>
					<span
						class="inline-flex h-10 cursor-pointer items-center rounded-full bg-peach-200 px-4 text-sm font-semibold text-coral-950"
					>
						{m.shelter_logo_add()}
					</span>
				</label>
				{#if shelter.has_logo}
					<Button
						type="button"
						variant="ghost"
						size="sm"
						onclick={async () => {
							await fetch(`/api/shelters/${shelter.id}/logo`, { method: "DELETE" });
							location.reload();
						}}>{m.shelter_logo_remove()}</Button
					>
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
		<p class="text-sm text-sand-600">
			{m.shelter_verification()}: {shelter.verification_status}
		</p>
		{#if form?.success}
			<FormStatus type="success">{m.shelter_saved()}</FormStatus>
		{:else if form?.error}
			<FormStatus type="error">{m.error_invalid_input()}</FormStatus>
		{/if}
		{#if !locked}
			<Button type="submit">{m.profile_save()}</Button>
		{/if}
	</form>
{/if}
