<script lang="ts">
	import type { PageProps } from "./$types";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { enhance } from "$app/forms";
	import { browser } from "$app/environment";
	import { m } from "$lib/paraglide/messages";
	import AuthCard from "$lib/components/auth/AuthCard.svelte";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import Textarea from "$lib/components/ui/Textarea.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import PawPrint from "lucide-svelte/icons/paw-print";
	import House from "lucide-svelte/icons/house";

	let { form }: PageProps = $props();

	// preselect shelter form via ?type=shelter
	function initialType(): "adopter" | "shelter" {
		return form?.values?.accountType === "shelter" ||
			page.url.searchParams.get("type") === "shelter"
			? "shelter"
			: "adopter";
	}

	function seed() {
		return form?.values;
	}

	let accountType = $state<"adopter" | "shelter">(initialType());
	let wizard = $state(browser);
	let step = $state(0);
	let name = $state(seed()?.name ?? "");
	let displayName = $state(seed()?.displayName ?? "");
	let email = $state(seed()?.email ?? "");
	let password = $state("");
	let orgName = $state(seed()?.orgName ?? "");
	let street = $state(seed()?.street ?? "");
	let zip = $state(seed()?.zip ?? "");
	let city = $state(seed()?.city ?? "");
	let website = $state(seed()?.website ?? "");
	let registrationNumber = $state(seed()?.registrationNumber ?? "");
	let description = $state(seed()?.description ?? "");
	let previewUrl = $state<string | null>(null);
	let stepError = $state(false);
	let avatarInput: HTMLInputElement | undefined = $state();

	$effect(() => {
		const url = previewUrl;
		return () => {
			if (url) URL.revokeObjectURL(url);
		};
	});

	let lat = $state(seed()?.lat ?? "");
	let lng = $state(seed()?.lng ?? "");
	let geoBusy = $state(false);
	let geoHint = $state<"ok" | "fail" | null>(null);

	const steps = $derived(
		accountType === "shelter"
			? (["type", "account", "shelter", "review", "picture"] as const)
			: (["type", "account", "address", "review", "picture"] as const),
	);
	const total = $derived(steps.length);
	const current = $derived(steps[step] ?? "type");

	function onTypeChange(value: "adopter" | "shelter") {
		accountType = value;
		if (step >= (value === "shelter" ? 5 : 4)) step = 0;
	}

	function validAccount() {
		return (
			name.trim().length > 0 &&
			/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) &&
			password.length >= 8 &&
			password.length <= 128 &&
			/[A-Za-z]/.test(password) &&
			/\d/.test(password)
		);
	}

	function validAddress() {
		return street.trim().length > 0 && zip.trim().length > 0 && city.trim().length > 0;
	}

	function validShelter() {
		return orgName.trim().length > 0 && validAddress();
	}

	async function useLocation() {
		if (!navigator.geolocation) {
			geoHint = "fail";
			return;
		}
		geoBusy = true;
		geoHint = null;
		try {
			const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
				navigator.geolocation.getCurrentPosition(resolve, reject, {
					enableHighAccuracy: false,
					timeout: 10_000,
					maximumAge: 60_000,
				});
			});
			lat = String(pos.coords.latitude);
			lng = String(pos.coords.longitude);
			try {
				const res = await fetch("/api/geo/reverse", {
					method: "POST",
					headers: { "content-type": "application/json", accept: "application/json" },
					body: JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
				});
				if (res.ok) {
					const body = (await res.json()) as {
						item: { street: string | null; zip: string | null; city: string | null } | null;
					};
					const a = body.item;
					if (a?.street) street = a.street;
					if (a?.zip) zip = a.zip;
					if (a?.city) city = a.city;
				}
			} catch {
				// Reverse geocode optional. Lat/lng still saved.
			}
			geoHint = "ok";
		} catch {
			geoHint = "fail";
		} finally {
			geoBusy = false;
		}
	}

	function next() {
		if (current === "account" && !validAccount()) {
			stepError = true;
			return;
		}
		if (current === "address" && !validAddress()) {
			stepError = true;
			return;
		}
		if (current === "shelter" && !validShelter()) {
			stepError = true;
			return;
		}
		stepError = false;
		if (step < total - 1) step += 1;
	}

	function back() {
		stepError = false;
		if (step > 0) step -= 1;
	}

	function onAvatarChange(event: Event) {
		const input = event.currentTarget as HTMLInputElement;
		if (previewUrl) URL.revokeObjectURL(previewUrl);
		const file = input.files?.[0];
		previewUrl = file ? URL.createObjectURL(file) : null;
	}

	function skipPicture() {
		if (avatarInput) avatarInput.value = "";
		if (previewUrl) {
			URL.revokeObjectURL(previewUrl);
			previewUrl = null;
		}
	}

	function show(id: (typeof steps)[number]) {
		return !wizard || current === id;
	}

	const errorMessages = {
		email_taken: () => m.error_email_taken(),
		not_allowed: () => m.error_registration_not_allowed(),
		rate_limited: () => m.error_rate_limited(),
		invalid: () => m.error_invalid_input(),
		generic: () => m.error_generic(),
	};
</script>

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
	<AuthCard title={m.auth_register_title()} subtitle={m.auth_register_subtitle()} wide>
		{#if wizard}
			<p class="mb-4 text-sm font-semibold text-sand-600">
				{m.wizard_step({ current: step + 1, total })}
			</p>
			<ol class="mb-6 flex gap-2" aria-hidden="true">
				{#each steps as _, index (index)}
					<li
						class="h-1.5 flex-1 rounded-full {index <= step ? 'bg-coral-600' : 'bg-sand-200'}"
					></li>
				{/each}
			</ol>
		{/if}

		<form method="POST" enctype="multipart/form-data" class="flex flex-col gap-5" use:enhance>
			{#if form?.registerError}
				<FormStatus type="error">{errorMessages[form.registerError]()}</FormStatus>
			{:else if stepError}
				<FormStatus type="error">{m.error_invalid_input()}</FormStatus>
			{/if}

			<fieldset class="wizard-step" class:hidden={!show("type")}>
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

			<div class="wizard-step flex flex-col gap-5" class:hidden={!show("account")}>
				<h2 class="text-sm font-bold tracking-wide text-sand-700 uppercase">
					{m.auth_register_account_section()}
				</h2>
				<Input
					id="register-name"
					name="name"
					label={m.auth_name()}
					required={!wizard || current === "account"}
					autocomplete="name"
					bind:value={name}
				/>
				<Input
					id="register-display-name"
					name="displayName"
					label={m.auth_display_name()}
					hint={m.auth_display_name_hint()}
					autocomplete="nickname"
					bind:value={displayName}
				/>
				<Input
					id="register-email"
					name="email"
					type="email"
					label={m.auth_email()}
					required={!wizard || current === "account"}
					autocomplete="email"
					bind:value={email}
				/>
				<Input
					id="register-password"
					name="password"
					type="password"
					label={m.auth_password()}
					hint={m.auth_password_hint()}
					required={!wizard || current === "account"}
					minlength={8}
					maxlength={128}
					autocomplete="new-password"
					bind:value={password}
				/>
			</div>

			<div class="wizard-step flex flex-col gap-5" class:hidden={!show("shelter")}>
				<h2 class="text-sm font-bold tracking-wide text-sand-700 uppercase">
					{m.auth_register_shelter_section()}
				</h2>
				<Input
					id="register-org-name"
					name="orgName"
					label={m.auth_org_name()}
					required={accountType === "shelter" && (!wizard || current === "shelter")}
					autocomplete="organization"
					bind:value={orgName}
				/>
				<Input
					id="register-street"
					name="street"
					label={m.auth_street()}
					required={accountType === "shelter" && (!wizard || current === "shelter")}
					autocomplete="street-address"
					bind:value={street}
				/>
				<div class="grid grid-cols-[7rem_1fr] gap-3">
					<Input
						id="register-zip"
						name="zip"
						label={m.auth_zip()}
						required={accountType === "shelter" && (!wizard || current === "shelter")}
						autocomplete="postal-code"
						bind:value={zip}
					/>
					<Input
						id="register-city"
						name="city"
						label={m.auth_city()}
						required={accountType === "shelter" && (!wizard || current === "shelter")}
						autocomplete="address-level2"
						bind:value={city}
					/>
				</div>
				<Input
					id="register-website"
					name="website"
					type="url"
					label={m.auth_website()}
					autocomplete="url"
					placeholder="https://"
					bind:value={website}
				/>
				<Input
					id="register-registration-number"
					name="registrationNumber"
					label={m.auth_registration_number()}
					bind:value={registrationNumber}
				/>
				<Textarea
					id="register-description"
					name="description"
					label={m.auth_description()}
					rows={3}
					bind:value={description}
				/>
				<input type="hidden" name="lat" value={lat} />
				<input type="hidden" name="lng" value={lng} />
				<Button type="button" variant="ghost" onclick={useLocation} disabled={geoBusy}>
					{m.auth_use_location()}
				</Button>
				{#if geoHint === "ok"}
					<p class="text-sm text-sand-600">{m.auth_use_location_ok()}</p>
				{:else if geoHint === "fail"}
					<p class="text-sm text-sand-600">{m.auth_use_location_fail()}</p>
				{/if}
			</div>

			<div
				class="wizard-step flex flex-col gap-5"
				class:hidden={accountType !== "adopter" || !show("address")}
			>
				<h2 class="text-sm font-bold tracking-wide text-sand-700 uppercase">
					{m.auth_register_address_section()}
				</h2>
				<p class="text-sm text-sand-700">{m.auth_register_address_hint()}</p>
				<Input
					id="register-adopter-street"
					name="street"
					label={m.auth_street()}
					required={accountType === "adopter" && (!wizard || current === "address")}
					autocomplete="street-address"
					bind:value={street}
				/>
				<div class="grid grid-cols-[7rem_1fr] gap-3">
					<Input
						id="register-adopter-zip"
						name="zip"
						label={m.auth_zip()}
						required={accountType === "adopter" && (!wizard || current === "address")}
						autocomplete="postal-code"
						bind:value={zip}
					/>
					<Input
						id="register-adopter-city"
						name="city"
						label={m.auth_city()}
						required={accountType === "adopter" && (!wizard || current === "address")}
						autocomplete="address-level2"
						bind:value={city}
					/>
				</div>
				<input type="hidden" name="lat" value={lat} />
				<input type="hidden" name="lng" value={lng} />
				<Button type="button" variant="ghost" onclick={useLocation} disabled={geoBusy}>
					{m.auth_use_location()}
				</Button>
				{#if geoHint === "ok"}
					<p class="text-sm text-sand-600">{m.auth_use_location_ok()}</p>
				{:else if geoHint === "fail"}
					<p class="text-sm text-sand-600">{m.auth_use_location_fail()}</p>
				{/if}
			</div>

			<div class="wizard-step flex flex-col gap-4" class:hidden={!show("review")}>
				<h2 class="text-sm font-bold tracking-wide text-sand-700 uppercase">
					{m.wizard_review_title()}
				</h2>
				<p class="text-sm text-sand-700">{m.wizard_review_subtitle()}</p>
				<dl class="divide-y divide-sand-200 rounded-xl border border-sand-200 bg-sand-50">
					<div class="px-4 py-3">
						<dt class="text-xs font-bold tracking-wide text-sand-600 uppercase">
							{m.wizard_review_account()}
						</dt>
						<dd class="mt-1 text-sm text-sand-900">
							{name}{displayName ? ` (${displayName})` : ""}
							<br />
							{email}
						</dd>
					</div>
					<div class="px-4 py-3">
						<dt class="text-xs font-bold tracking-wide text-sand-600 uppercase">
							{accountType === "shelter"
								? m.auth_register_shelter_section()
								: m.auth_register_address_section()}
						</dt>
						<dd class="mt-1 text-sm text-sand-900">
							{#if accountType === "shelter"}{orgName}<br />{/if}
							{street}<br />
							{zip}
							{city}
							{#if accountType === "shelter" && website}<br />{website}{/if}
						</dd>
					</div>
				</dl>
			</div>

			<div class="wizard-step flex flex-col items-center gap-4" class:hidden={!show("picture")}>
				<h2 class="text-sm font-bold tracking-wide text-sand-700 uppercase">
					{m.wizard_picture_title()}
				</h2>
				<p class="text-center text-sm text-sand-700">{m.wizard_picture_subtitle()}</p>
				<Avatar name={displayName || name} src={previewUrl} size="lg" />
				<label class="inline-flex">
					<span class="sr-only"
						>{previewUrl ? m.wizard_picture_change() : m.wizard_picture_choose()}</span
					>
					<input
						bind:this={avatarInput}
						class="sr-only"
						type="file"
						name="avatar"
						accept="image/jpeg,image/png,image/webp"
						onchange={onAvatarChange}
					/>
					<span
						class="inline-flex h-10 cursor-pointer items-center justify-center rounded-full bg-peach-200 px-4 text-sm font-semibold text-coral-950 hover:bg-peach-300"
					>
						{previewUrl ? m.wizard_picture_change() : m.wizard_picture_choose()}
					</span>
				</label>
				<p class="text-sm text-sand-600">{m.wizard_picture_hint()}</p>
			</div>

			{#if wizard}
				<div class="wizard-nav flex flex-col gap-3">
					{#if current === "picture"}
						<Button type="submit" fullWidth>{m.auth_register_submit()}</Button>
						<Button type="submit" variant="ghost" fullWidth onclick={skipPicture}
							>{m.wizard_skip()}</Button
						>
					{:else}
						<Button type="button" fullWidth onclick={next}>{m.wizard_next()}</Button>
					{/if}
					{#if step > 0}
						<Button type="button" variant="ghost" fullWidth onclick={back}>{m.wizard_back()}</Button
						>
					{/if}
				</div>
			{:else}
				<Button type="submit" fullWidth>{m.auth_register_submit()}</Button>
			{/if}

			<p class="text-center text-sm text-sand-700">
				{m.auth_register_have_account()}
				<a
					href={resolve("/login")}
					class="inline-flex min-h-11 items-center font-semibold text-coral-700 underline underline-offset-2 focus-ring hover:text-coral-800"
				>
					{m.auth_register_login_link()}
				</a>
			</p>
		</form>
	</AuthCard>
{/if}
