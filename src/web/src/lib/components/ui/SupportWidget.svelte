<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import { untrack } from "svelte";
	import { dialog } from "$lib/dialog";
	import { widgetRequest } from "$lib/components/ui/widgets.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import Textarea from "$lib/components/ui/Textarea.svelte";
	import Checkbox from "$lib/components/ui/Checkbox.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import Turnstile from "$lib/components/ui/Turnstile.svelte";
	import { isTurnstileRejection, turnstileSiteKey } from "$lib/turnstile";
	import LifeBuoy from "lucide-svelte/icons/life-buoy";
	import type { SessionUser } from "$lib/types/session";

	let { user, fab = true }: { user: SessionUser | null; fab?: boolean } = $props();

	let open = $state(false);
	let name = $state("");
	let email = $state("");
	let message = $state("");
	let website = $state("");
	let error = $state<"generic" | "captcha" | null>(null);
	let success = $state(false);
	let sending = $state(false);
	let captcha: ReturnType<typeof Turnstile> | undefined = $state();
	let captchaToken = $state("");
	const captchaPending = $derived(Boolean(turnstileSiteKey()) && !captchaToken);

	const path = $derived(page.url.pathname);
	// Public pages get a smaller button on phones; the footer reserves space below it.
	const fabClass = $derived(
		path.startsWith("/admin")
			? "bottom-20 size-14 lg:bottom-4"
			: path.startsWith("/shelter")
				? "bottom-20 size-14 md:bottom-4"
				: "bottom-4 size-11 sm:size-14",
	);

	function openModal() {
		success = false;
		error = null;
		if (user) {
			if (!name.trim()) name = user.displayName ?? user.name;
			if (!email.trim()) email = user.email;
		}
		open = true;
	}

	function close() {
		open = false;
	}

	$effect(() => {
		if (widgetRequest.kind !== "support") return;
		widgetRequest.kind = null;
		untrack(openModal);
	});

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const trimmedName = name.trim();
		const trimmedEmail = email.trim();
		const trimmedMessage = message.trim();
		if (!trimmedName || !trimmedMessage) {
			error = "generic";
			return;
		}

		sending = true;
		error = null;
		try {
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: trimmedName,
					email: trimmedEmail,
					message: trimmedMessage,
					website,
					turnstileToken: captchaToken,
				}),
			});
			if (!response.ok) {
				error = (await isTurnstileRejection(response)) ? "captcha" : "generic";
				return;
			}
			success = true;
			message = "";
			website = "";
		} catch {
			error = "generic";
		} finally {
			sending = false;
			// Tokens are single-use; after a failure the retry needs a fresh one.
			if (!success) captcha?.reset();
		}
	}
</script>

{#if fab && !open}
	<button
		type="button"
		class="fixed right-4 {fabClass} z-40 flex cursor-pointer items-center justify-center rounded-full bg-coral-600 text-white shadow-lg focus-ring hover:bg-coral-700 active:bg-coral-800"
		aria-label={m.support_open()}
		aria-expanded="false"
		onclick={openModal}
	>
		<LifeBuoy class="size-5 sm:size-6" aria-hidden="true" />
	</button>
{/if}

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-end sm:justify-end">
		<button
			type="button"
			class="absolute inset-0 bg-sand-950/40"
			aria-label={m.dialog_close()}
			onclick={close}
		></button>
		<div
			class="relative z-10 max-h-full w-full max-w-sm overflow-y-auto rounded-2xl border border-sand-200 bg-white p-5 shadow-lg sm:mb-4"
			role="dialog"
			aria-modal="true"
			aria-labelledby="support-title"
			use:dialog={close}
		>
			<h2 id="support-title" class="text-lg font-bold text-sand-950">{m.support_title()}</h2>
			<p class="mt-1 text-sm text-sand-700">{m.support_subtitle()}</p>

			{#if success}
				<FormStatus type="success" class="mt-4">{m.contact_success()}</FormStatus>
				<div class="mt-4">
					<Button type="button" fullWidth onclick={close}>{m.dialog_close()}</Button>
				</div>
			{:else}
				{#if error}
					<FormStatus type="error" class="mt-4">
						{error === "captcha" ? m.turnstile_failed() : m.contact_error()}
					</FormStatus>
				{/if}
				<form class="mt-4 flex flex-col gap-4" onsubmit={submit}>
					<Input
						id="support-name"
						name="name"
						label={m.contact_name()}
						required
						autocomplete="name"
						bind:value={name}
					/>
					<Input
						id="support-email"
						name="email"
						type="email"
						label={m.support_email()}
						autocomplete="email"
						bind:value={email}
					/>
					<Textarea
						id="support-message"
						name="message"
						label={m.support_issue()}
						required
						rows={4}
						bind:value={message}
					/>

					<div class="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
						<label for="support-website">Website</label>
						<input
							id="support-website"
							name="website"
							type="text"
							tabindex="-1"
							autocomplete="off"
							bind:value={website}
						/>
					</div>

					<Checkbox id="support-privacy" name="privacy" required>
						{m.contact_privacy()}
						<a
							href={resolve("/datenschutz")}
							class="inline-flex min-h-11 items-center font-semibold text-coral-700 underline underline-offset-2 focus-ring hover:text-coral-800"
							>{m.contact_privacy_link_text()}</a
						>.
					</Checkbox>

					<Turnstile action="contact" bind:this={captcha} bind:token={captchaToken} />

					<div class="flex gap-2">
						<Button type="button" variant="ghost" class="flex-1" onclick={close}>
							{m.dialog_close()}
						</Button>
						<Button
							type="submit"
							class="flex-1 disabled:cursor-not-allowed disabled:opacity-60"
							loading={sending}
							disabled={captchaPending}
						>
							{m.support_submit()}
						</Button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}
