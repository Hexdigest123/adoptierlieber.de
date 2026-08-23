<script lang="ts">
	import type { ActionData } from "../../../routes/$types";
	import { enhance } from "$app/forms";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import Card from "$lib/components/ui/Card.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import Textarea from "$lib/components/ui/Textarea.svelte";
	import Checkbox from "$lib/components/ui/Checkbox.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";

	let { form }: { form: ActionData } = $props();

	let dismissed = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	const showSuccess = $derived(Boolean(form?.contactSuccess) && !dismissed);

	$effect(() => {
		if (!form?.contactSuccess || dismissed) return;
		timer = setTimeout(() => {
			dismissed = true;
		}, 10_000);
		return () => {
			if (timer) clearTimeout(timer);
		};
	});
</script>

<section
	id="contact"
	class="scroll-mt-16 bg-peach-50 px-4 py-16 sm:px-6 sm:py-24"
	aria-labelledby="contact-title"
>
	<div class="mx-auto max-w-2xl">
		<div class="text-center">
			<h2 id="contact-title" class="text-3xl font-black tracking-tight text-sand-950 sm:text-4xl">
				{m.contact_title()}
			</h2>
			<p class="mt-4 text-lg text-sand-700">{m.contact_subtitle()}</p>
		</div>

		<Card class="mt-10" padding="lg">
			{#if showSuccess}
				<FormStatus type="success">{m.contact_success()}</FormStatus>
			{:else}
				{#if form?.contactError}
					<FormStatus type="error" class="mb-6">{m.contact_error()}</FormStatus>
				{/if}
				<form
					method="POST"
					action="?/contact#contact"
					class="flex flex-col gap-5"
					use:enhance={() => {
						return async ({ result, update }) => {
							dismissed = false;
							await update({ reset: result.type === "success" });
						};
					}}
				>
					<Input
						id="contact-name"
						name="name"
						label={m.contact_name()}
						required
						autocomplete="name"
						value={form?.contactValues?.name ?? ""}
					/>
					<Input
						id="contact-email"
						name="email"
						type="email"
						label={m.contact_email()}
						required
						autocomplete="email"
						value={form?.contactValues?.email ?? ""}
					/>
					<Textarea
						id="contact-message"
						name="message"
						label={m.contact_message()}
						required
						value={form?.contactValues?.message ?? ""}
					/>

					<!-- Honeypot: invisible to humans, bots fill it and get silently dropped. -->
					<div class="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
						<label for="contact-website">Website</label>
						<input
							id="contact-website"
							name="website"
							type="text"
							tabindex="-1"
							autocomplete="off"
						/>
					</div>

					<Checkbox id="contact-privacy" name="privacy" required>
						{m.contact_privacy()}
						<a
							href={resolve("/datenschutz")}
							class="inline-flex min-h-11 items-center font-semibold text-coral-700 underline underline-offset-2 focus-ring hover:text-coral-800"
							>{m.contact_privacy_link_text()}</a
						>.
					</Checkbox>

					<Button type="submit" fullWidth>{m.contact_submit()}</Button>
				</form>
			{/if}
		</Card>
	</div>
</section>
