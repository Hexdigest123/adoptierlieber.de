<script lang="ts">
	import type { Snippet } from "svelte";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import { dialog } from "$lib/dialog";

	type Props = {
		open: boolean;
		title: string;
		text: string;
		action: string;
		confirmLabel?: string;
		danger?: boolean;
		typeValue?: string;
		typeLabel?: string;
		typeName?: string;
		children?: Snippet;
		onclose: () => void;
	};

	let {
		open,
		title,
		text,
		action,
		confirmLabel,
		danger = true,
		typeValue,
		typeLabel,
		typeName = "confirm",
		children,
		onclose,
	}: Props = $props();

	let typed = $state("");
	const matches = $derived(!typeValue || typed.trim().toLowerCase() === typeValue.toLowerCase());

	$effect(() => {
		if (!open) typed = "";
	});
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
		<button
			type="button"
			class="absolute inset-0 bg-sand-950/40"
			aria-label={m.admin_cancel()}
			onclick={onclose}
		></button>
		<div
			role="dialog"
			aria-modal="true"
			aria-labelledby="admin-confirm-title"
			use:dialog={onclose}
			class="relative z-10 w-full max-w-md rounded-2xl border border-sand-200 bg-white p-6 shadow-lg"
		>
			<h2 id="admin-confirm-title" class="text-lg font-bold text-sand-950">{title}</h2>
			<p class="mt-2 text-sm leading-relaxed text-sand-700">{text}</p>
			<form method="POST" {action} class="mt-5 flex flex-col gap-4">
				{#if children}{@render children()}{/if}
				{#if typeValue}
					<Input
						id="admin-confirm-type"
						name={typeName}
						label={typeLabel ?? m.admin_type_email()}
						required
						bind:value={typed}
						autocomplete="off"
					/>
				{/if}
				<div class="flex flex-wrap justify-end gap-2">
					<Button type="button" variant="ghost" size="sm" onclick={onclose}>
						{m.admin_cancel()}
					</Button>
					<Button
						type="submit"
						variant={danger ? "danger" : "primary"}
						size="sm"
						disabled={!matches}
					>
						{confirmLabel ?? m.admin_confirm()}
					</Button>
				</div>
			</form>
		</div>
	</div>
{/if}
