<script lang="ts">
	import type { PageProps } from "./$types";
	import { enhance } from "$app/forms";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";

	let { data, form }: PageProps = $props();
</script>

<div class="mx-auto max-w-md rounded-2xl border border-sand-200 bg-white p-6">
	<h1 class="text-2xl font-black text-sand-950">{m.shelter_invite_title()}</h1>
	<p class="mt-2 text-sm text-sand-700">{m.shelter_invite_subtitle()}</p>
	{#if form?.error}
		<FormStatus class="mt-4" type="error">{m.shelter_invite_error()}</FormStatus>
	{/if}
	<form method="POST" use:enhance class="mt-6">
		<input type="hidden" name="token" value={data.token} />
		<Button type="submit">{m.shelter_invite_accept()}</Button>
	</form>
</div>
