<script lang="ts">
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import Checkbox from "$lib/components/ui/Checkbox.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import Textarea from "$lib/components/ui/Textarea.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import type { ApplicationField, InterestContext } from "$lib/types/shelter";
	import { dialog } from "$lib/dialog";

	type Props = {
		context: InterestContext;
		open?: boolean;
		onclose?: () => void;
	};

	let { context, open = $bindable(true), onclose }: Props = $props();

	let grantEmail = $state(false);
	let grantProfile = $state(false);
	let message = $state("");
	let answers = $state<Record<string, string>>({});
	let error = $state("");
	let saving = $state(false);
	let sentId = $state<string | null>(null);

	function close() {
		open = false;
		onclose?.();
	}

	async function submit(event: Event) {
		event.preventDefault();
		if (!grantEmail || !grantProfile) {
			error = m.shelter_interest_grants_required();
			return;
		}
		saving = true;
		error = "";
		const payload = {
			animal_id: context.animal_id,
			grant_email: true,
			grant_profile: true,
			message: message.trim() || undefined,
			answers: context.fields.map((field) => ({
				field_id: field.id,
				value: answers[field.id] ?? "",
			})),
		};
		const response = await fetch("/api/chats", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(payload),
		});
		saving = false;
		if (!response.ok) {
			error = m.error_invalid_input();
			return;
		}
		const thread = (await response.json()) as { id: string };
		sentId = thread.id;
	}

	function fieldControl(field: ApplicationField) {
		return field;
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
		<button
			type="button"
			class="absolute inset-0 bg-sand-950/40"
			aria-label={m.dialog_close()}
			onclick={close}
		></button>
		<div
			class="relative z-10 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:rounded-2xl"
			role="dialog"
			aria-modal="true"
			aria-labelledby="interest-title"
			use:dialog={close}
		>
			{#if sentId}
				<h2 id="interest-title" class="text-xl font-black text-sand-950">
					{m.shelter_interest_sent()}
				</h2>
				<p class="mt-2 text-sm text-sand-700">{m.shelter_interest_sent_text()}</p>
				<div class="mt-4 flex flex-wrap gap-2">
					<Button href={resolve(`/app/messages/${sentId}`)}>{m.shelter_interest_open()}</Button>
					<Button variant="ghost" onclick={close}>{m.dialog_close()}</Button>
				</div>
			{:else if context.thread_id}
				<h2 id="interest-title" class="text-xl font-black text-sand-950">
					{m.shelter_interest_open()}
				</h2>
				<p class="mt-2 text-sm text-sand-700">{m.shelter_interest_existing()}</p>
				<div class="mt-4 flex flex-wrap gap-2">
					<Button href={resolve(`/app/messages/${context.thread_id}`)}
						>{m.shelter_interest_open()}</Button
					>
					<Button variant="ghost" onclick={close}>{m.dialog_close()}</Button>
				</div>
			{:else}
				<h2 id="interest-title" class="text-xl font-black text-sand-950">
					{m.shelter_interest_title({ animal: context.animal_name })}
				</h2>
				<p class="mt-1 text-sm text-sand-700">
					{m.shelter_interest_org({ org: context.org_name })}
				</p>
				{#if context.other_animals.length}
					<p class="mt-2 text-sm text-sand-600">
						{m.shelter_interest_others({ names: context.other_animals.join(", ") })}
					</p>
				{/if}

				<form class="mt-5 flex flex-col gap-4" onsubmit={submit}>
					<Checkbox
						id="grant-email"
						checked={grantEmail}
						onchange={(event) => (grantEmail = event.currentTarget.checked)}
					>
						{m.shelter_interest_grant_email({ org: context.org_name })}
					</Checkbox>
					<Checkbox
						id="grant-profile"
						checked={grantProfile}
						onchange={(event) => (grantProfile = event.currentTarget.checked)}
					>
						{m.shelter_interest_grant_profile()}
					</Checkbox>

					{#each context.fields as field (field.id)}
						{@const _ = fieldControl(field)}
						{#if field.type === "long"}
							<Textarea
								id="f-{field.id}"
								label={field.label}
								required={field.required}
								bind:value={answers[field.id]}
							/>
						{:else if field.type === "select"}
							<div class="flex flex-col gap-1.5">
								<label for="f-{field.id}" class="text-sm font-semibold text-sand-900">
									{field.label}
									{#if field.required}<span class="text-coral-600" aria-hidden="true"> *</span>{/if}
								</label>
								<select
									id="f-{field.id}"
									required={field.required}
									bind:value={answers[field.id]}
									class="h-11 w-full rounded-xl border border-sand-300 bg-white px-3.5 text-base text-sand-900 focus-ring"
								>
									<option value="">{m.shelter_interest_select()}</option>
									{#each field.options ?? [] as option (option)}
										<option value={option}>{option}</option>
									{/each}
								</select>
							</div>
						{:else if field.type === "yesno"}
							<div class="flex flex-col gap-1.5">
								<p class="text-sm font-semibold text-sand-900">
									{field.label}
									{#if field.required}<span class="text-coral-600" aria-hidden="true"> *</span>{/if}
								</p>
								<div class="flex gap-3">
									<label class="text-sm text-sand-800">
										<input
											type="radio"
											name="f-{field.id}"
											value="yes"
											required={field.required}
											bind:group={answers[field.id]}
										/>
										{m.shelter_yes()}
									</label>
									<label class="text-sm text-sand-800">
										<input
											type="radio"
											name="f-{field.id}"
											value="no"
											bind:group={answers[field.id]}
										/>
										{m.shelter_no()}
									</label>
								</div>
							</div>
						{:else}
							<Input
								id="f-{field.id}"
								label={field.label}
								required={field.required}
								bind:value={answers[field.id]}
							/>
						{/if}
					{/each}

					<Textarea
						id="interest-message"
						label={m.shelter_interest_message()}
						bind:value={message}
					/>

					{#if error}
						<FormStatus type="error">{error}</FormStatus>
					{/if}

					<div class="flex flex-wrap gap-2">
						<Button type="submit" loading={saving}>{m.shelter_interest_submit()}</Button>
						<Button type="button" variant="ghost" onclick={close}
							>{m.shelter_interest_cancel()}</Button
						>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}
