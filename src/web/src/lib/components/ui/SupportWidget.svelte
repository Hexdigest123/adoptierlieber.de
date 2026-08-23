<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import { dialog } from "$lib/dialog";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import Textarea from "$lib/components/ui/Textarea.svelte";
	import Checkbox from "$lib/components/ui/Checkbox.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import LifeBuoy from "lucide-svelte/icons/life-buoy";
	import type { SessionUser } from "$lib/types/session";

	let { user }: { user: SessionUser | null } = $props();

	let open = $state(false);
	let name = $state("");
	let email = $state("");
	let message = $state("");
	let website = $state("");
	let error = $state(false);
	let success = $state(false);
	let sending = $state(false);

	const path = $derived(page.url.pathname);
	const fabOffset = $derived(
		path.startsWith("/admin")
			? "bottom-20 lg:bottom-4"
			: path.startsWith("/app/animals/")
				? "bottom-36 md:bottom-24"
				: path.startsWith("/app") ||
					  path.startsWith("/shelter") ||
					  (path.startsWith("/profile") && page.data.chrome === "app")
					? "bottom-20 md:bottom-4"
					: "bottom-4",
	);

	function openModal() {
		success = false;
		error = false;
		if (user) {
			if (!name.trim()) name = user.displayName ?? user.name;
			if (!email.trim()) email = user.email;
		}
		open = true;
	}

	function close() {
		open = false;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		const trimmedName = name.trim();
		const trimmedEmail = email.trim();
		const trimmedMessage = message.trim();
		if (!trimmedName || !trimmedMessage) {
			error = true;
			return;
		}

		sending = true;
		error = false;
		try {
			const response = await fetch("/api/contact", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					name: trimmedName,
					email: trimmedEmail,
					message: trimmedMessage,
					website,
				}),
			});
			if (!response.ok) {
				error = true;
				return;
			}
			success = true;
			message = "";
			website = "";
		} catch {
			error = true;
		} finally {
			sending = false;
		}
	}
</script>

{#if !open}
	<button
		type="button"
		class="fixed right-4 {fabOffset} z-40 flex size-14 cursor-pointer items-center justify-center rounded-full bg-coral-600 text-white shadow-lg focus-ring hover:bg-coral-700 active:bg-coral-800"
		aria-label={m.support_open()}
		aria-expanded="false"
		onclick={openModal}
	>
		<LifeBuoy class="size-6" aria-hidden="true" />
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
			class="relative z-10 w-full max-w-sm rounded-2xl border border-sand-200 bg-white p-5 shadow-lg sm:mb-4"
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
					<FormStatus type="error" class="mt-4">{m.contact_error()}</FormStatus>
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

					<div class="flex gap-2">
						<Button type="button" variant="ghost" class="flex-1" onclick={close}>
							{m.dialog_close()}
						</Button>
						<Button type="submit" class="flex-1" loading={sending}>{m.support_submit()}</Button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}
