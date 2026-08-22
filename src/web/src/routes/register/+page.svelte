<script lang="ts">
	import type { PageProps } from "./$types";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import AuthCard from "$lib/components/auth/AuthCard.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import Textarea from "$lib/components/ui/Textarea.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import PawPrint from "lucide-svelte/icons/paw-print";
	import House from "lucide-svelte/icons/house";

	let { form }: PageProps = $props();

	// preselect shelter form via ?type=shelter (e.g. from the hero CTA)
	function initialType(): "adopter" | "shelter" {
		return form?.values?.accountType === "shelter" ||
			page.url.searchParams.get("type") === "shelter"
			? "shelter"
			: "adopter";
	}
	let accountType = $state<"adopter" | "shelter">(initialType());

	function onTypeChange(value: "adopter" | "shelter") {
		accountType = value;
	}

	const errorMessages = {
		email_taken: () => m.error_email_taken(),
		rate_limited: () => m.error_rate_limited(),
		invalid: () => m.error_invalid_input(),
		generic: () => m.error_generic(),
	};
</script>

<svelte:head><title>{m.auth_register_title()} – {m.brand_name()}</title></svelte:head>

{#if form?.registerSuccess}
	<AuthCard title={m.auth_register_success_title()}>
		<FormStatus type="success">
			<p>{m.auth_register_success_text()}</p>
			{#if form.accountType === "shelter"}
				<p class="mt-2">{m.auth_register_success_shelter_note()}</p>
			{/if}
		</FormStatus>
		<Button
			href="{resolve('/verify')}?email={encodeURIComponent(form.email ?? '')}"
			fullWidth
			class="mt-6"
		>
			{m.auth_register_success_cta()}
		</Button>
	</AuthCard>
{:else}
	<AuthCard title={m.auth_register_title()} subtitle={m.auth_register_subtitle()}>
		<form method="POST" class="flex flex-col gap-5">
			<fieldset>
				<legend class="sr-only">{m.auth_register_subtitle()}</legend>
				<div class="grid grid-cols-2 gap-3">
					<label
						class="flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-4 transition-colors focus-within:ring-2 focus-within:ring-coral-600 focus-within:ring-offset-2 {accountType ===
						'adopter'
							? 'border-coral-600 bg-coral-50'
							: 'border-sand-200 bg-white hover:border-sand-300'}"
					>
						<input
							type="radio"
							name="accountType"
							value="adopter"
							checked={accountType === "adopter"}
							onchange={() => onTypeChange("adopter")}
							class="sr-only"
						/>
						<PawPrint class="size-6 text-coral-700" aria-hidden="true" />
						<span class="text-sm font-bold text-sand-950">{m.auth_register_type_adopter()}</span>
						<span class="text-xs text-sand-600">{m.auth_register_type_adopter_hint()}</span>
					</label>
					<label
						class="flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-4 transition-colors focus-within:ring-2 focus-within:ring-coral-600 focus-within:ring-offset-2 {accountType ===
						'shelter'
							? 'border-coral-600 bg-coral-50'
							: 'border-sand-200 bg-white hover:border-sand-300'}"
					>
						<input
							type="radio"
							name="accountType"
							value="shelter"
							checked={accountType === "shelter"}
							onchange={() => onTypeChange("shelter")}
							class="sr-only"
						/>
						<House class="size-6 text-coral-700" aria-hidden="true" />
						<span class="text-sm font-bold text-sand-950">{m.auth_register_type_shelter()}</span>
						<span class="text-xs text-sand-600">{m.auth_register_type_shelter_hint()}</span>
					</label>
				</div>
			</fieldset>

			{#if form?.registerError}
				<FormStatus type="error">{errorMessages[form.registerError]()}</FormStatus>
			{/if}

			<div class="flex flex-col gap-5">
				<h2 class="text-sm font-bold tracking-wide text-sand-700 uppercase">
					{m.auth_register_account_section()}
				</h2>
				<Input
					id="register-name"
					name="name"
					label={m.auth_name()}
					required
					autocomplete="name"
					value={form?.values?.name ?? ""}
				/>
				<Input
					id="register-email"
					name="email"
					type="email"
					label={m.auth_email()}
					required
					autocomplete="email"
					value={form?.values?.email ?? ""}
				/>
				<Input
					id="register-password"
					name="password"
					type="password"
					label={m.auth_password()}
					hint={m.auth_password_hint()}
					required
					minlength={8}
					maxlength={128}
					autocomplete="new-password"
				/>
			</div>

			{#if accountType === "shelter"}
				<div class="flex flex-col gap-5">
					<h2 class="text-sm font-bold tracking-wide text-sand-700 uppercase">
						{m.auth_register_shelter_section()}
					</h2>
					<Input
						id="register-org-name"
						name="orgName"
						label={m.auth_org_name()}
						required
						autocomplete="organization"
						value={form?.values?.orgName ?? ""}
					/>
					<Input
						id="register-street"
						name="street"
						label={m.auth_street()}
						required
						autocomplete="street-address"
						value={form?.values?.street ?? ""}
					/>
					<div class="grid grid-cols-[7rem_1fr] gap-3">
						<Input
							id="register-zip"
							name="zip"
							label={m.auth_zip()}
							required
							autocomplete="postal-code"
							value={form?.values?.zip ?? ""}
						/>
						<Input
							id="register-city"
							name="city"
							label={m.auth_city()}
							required
							autocomplete="address-level2"
							value={form?.values?.city ?? ""}
						/>
					</div>
					<Input
						id="register-website"
						name="website"
						type="url"
						label={m.auth_website()}
						autocomplete="url"
						placeholder="https://"
						value={form?.values?.website ?? ""}
					/>
					<Input
						id="register-registration-number"
						name="registrationNumber"
						label={m.auth_registration_number()}
						value={form?.values?.registrationNumber ?? ""}
					/>
					<Textarea
						id="register-description"
						name="description"
						label={m.auth_description()}
						rows={3}
						value={form?.values?.description ?? ""}
					/>
				</div>
			{/if}

			<Button type="submit" fullWidth>{m.auth_register_submit()}</Button>

			<p class="text-center text-sm text-sand-700">
				{m.auth_register_have_account()}
				<a
					href={resolve("/login")}
					class="font-semibold text-coral-700 underline underline-offset-2 focus-ring hover:text-coral-800"
				>
					{m.auth_register_login_link()}
				</a>
			</p>
		</form>
	</AuthCard>
{/if}
