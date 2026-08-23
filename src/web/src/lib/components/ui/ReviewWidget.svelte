<script lang="ts">
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import { dialog } from "$lib/dialog";
	import Button from "$lib/components/ui/Button.svelte";
	import Textarea from "$lib/components/ui/Textarea.svelte";
	import Checkbox from "$lib/components/ui/Checkbox.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import Star from "lucide-svelte/icons/star";
	import type { SessionUser } from "$lib/types/session";

	let { user }: { user: SessionUser | null } = $props();

	let open = $state(false);
	let body = $state("");
	let stars = $state(0);
	let hover = $state(0);
	let website = $state("");
	let error = $state<"generic" | "already" | null>(null);
	let success = $state(false);
	let sending = $state(false);

	const path = $derived(page.url.pathname);
	const fabOffset = $derived(
		path.startsWith("/admin")
			? "bottom-36 lg:bottom-20"
			: path.startsWith("/app/animals/")
				? "bottom-52 md:bottom-40"
				: path.startsWith("/app") ||
					  path.startsWith("/shelter") ||
					  (path.startsWith("/profile") && page.data.chrome === "app")
					? "bottom-36 md:bottom-20"
					: "bottom-20",
	);
	const loginHref = $derived(`/login?next=${encodeURIComponent(`${path}${page.url.search}`)}`);
	const shownStars = $derived(hover || stars);

	function openModal() {
		success = false;
		error = null;
		open = true;
	}

	function close() {
		open = false;
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		if (!user) return;
		const trimmedBody = body.trim();
		if (!trimmedBody || stars < 1) {
			error = "generic";
			return;
		}

		sending = true;
		error = null;
		try {
			const response = await fetch("/api/reviews", {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify({
					body: trimmedBody,
					stars,
					website,
				}),
			});
			if (response.status === 409) {
				error = "already";
				return;
			}
			if (!response.ok) {
				error = "generic";
				return;
			}
			success = true;
			body = "";
			stars = 0;
			website = "";
		} catch {
			error = "generic";
		} finally {
			sending = false;
		}
	}
</script>

{#if !open}
	<button
		type="button"
		class="fixed right-4 {fabOffset} z-40 flex size-14 cursor-pointer items-center justify-center rounded-full bg-coral-600 text-white shadow-lg focus-ring hover:bg-coral-700 active:bg-coral-800"
		aria-label={m.reviews_open()}
		aria-expanded="false"
		onclick={openModal}
	>
		<Star class="size-6" aria-hidden="true" />
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
			aria-labelledby="review-title"
			use:dialog={close}
		>
			<h2 id="review-title" class="text-lg font-bold text-sand-950">{m.reviews_form_title()}</h2>
			<p class="mt-1 text-sm text-sand-700">{m.reviews_form_subtitle()}</p>

			{#if !user}
				<FormStatus type="error" class="mt-4">{m.reviews_form_login()}</FormStatus>
				<div class="mt-4 flex flex-col gap-2">
					<Button href={loginHref} fullWidth>{m.header_login()}</Button>
					<Button type="button" variant="ghost" fullWidth onclick={close}>{m.dialog_close()}</Button
					>
				</div>
			{:else if success}
				<FormStatus type="success" class="mt-4">{m.reviews_form_success()}</FormStatus>
				<div class="mt-4">
					<Button type="button" fullWidth onclick={close}>{m.dialog_close()}</Button>
				</div>
			{:else}
				{#if error === "already"}
					<FormStatus type="error" class="mt-4">{m.reviews_form_already()}</FormStatus>
				{:else if error}
					<FormStatus type="error" class="mt-4">{m.reviews_form_error()}</FormStatus>
				{/if}
				<form class="mt-4 flex flex-col gap-4" onsubmit={submit}>
					<fieldset>
						<legend class="mb-1.5 text-sm font-semibold text-sand-900">
							{m.reviews_form_stars()}
							<span class="text-coral-600" aria-hidden="true"> *</span>
						</legend>
						<div class="flex gap-1" role="radiogroup" aria-label={m.reviews_form_stars()}>
							{#each [1, 2, 3, 4, 5] as value (value)}
								<button
									type="button"
									class="flex size-11 cursor-pointer items-center justify-center rounded-full text-coral-600 focus-ring hover:bg-coral-50"
									aria-label={m.reviews_stars_aria({ count: value })}
									aria-checked={stars === value}
									role="radio"
									onclick={() => (stars = value)}
									onmouseenter={() => (hover = value)}
									onmouseleave={() => (hover = 0)}
								>
									<Star
										class="size-6 {shownStars >= value ? 'fill-current' : ''}"
										aria-hidden="true"
									/>
								</button>
							{/each}
						</div>
					</fieldset>
					<Textarea
						id="review-body"
						name="body"
						label={m.reviews_form_body()}
						required
						rows={4}
						bind:value={body}
					/>

					<div class="absolute -left-[9999px] h-0 w-0 overflow-hidden" aria-hidden="true">
						<label for="review-website">Website</label>
						<input
							id="review-website"
							name="website"
							type="text"
							tabindex="-1"
							autocomplete="off"
							bind:value={website}
						/>
					</div>

					<Checkbox id="review-privacy" name="privacy" required>
						{m.contact_privacy()}
						<a
							href={resolve("/datenschutz")}
							class="inline-flex min-h-11 items-center font-semibold text-coral-700 underline underline-offset-2 focus-ring hover:text-coral-800"
							>{m.contact_privacy_link_text()}</a
						>.
					</Checkbox>

					<div class="flex flex-col gap-2">
						<Button type="submit" fullWidth loading={sending}>{m.reviews_form_submit()}</Button>
						<Button type="button" variant="ghost" fullWidth onclick={close}>
							{m.dialog_close()}
						</Button>
					</div>
				</form>
			{/if}
		</div>
	</div>
{/if}
