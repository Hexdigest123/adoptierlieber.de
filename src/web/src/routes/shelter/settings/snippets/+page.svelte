<script lang="ts">
	import type { PageProps } from "./$types";
	import { invalidateAll } from "$app/navigation";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import Textarea from "$lib/components/ui/Textarea.svelte";

	let { data }: PageProps = $props();

	let title = $state("");
	let body = $state("");
	let saving = $state(false);

	async function add() {
		if (!data.current || data.readonly) return;
		saving = true;
		await fetch(`/api/shelters/${data.current.shelter_id}/snippets`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ title: title.trim(), body: body.trim() }),
		});
		saving = false;
		title = "";
		body = "";
		await invalidateAll();
	}

	async function remove(id: string) {
		if (!data.current) return;
		await fetch(`/api/shelters/${data.current.shelter_id}/snippets/${id}`, { method: "DELETE" });
		await invalidateAll();
	}
</script>

<p class="text-center text-sm text-sand-700">{m.shelter_snippets_hint()}</p>

{#if !data.readonly}
	<form
		class="mt-6 flex flex-col gap-3"
		onsubmit={(event) => {
			event.preventDefault();
			void add();
		}}
	>
		<Input id="snippet-title" label={m.shelter_snippet_title()} bind:value={title} required />
		<Textarea id="snippet-body" label={m.shelter_snippet_body()} bind:value={body} required />
		<Button type="submit" loading={saving}>{m.shelter_snippet_add()}</Button>
	</form>
{/if}

{#if data.snippets.length === 0}
	<p class="mt-6 text-sm text-sand-600">{m.shelter_snippet_empty()}</p>
{:else}
	<ul class="mt-6 flex flex-col gap-3">
		{#each data.snippets as snippet (snippet.id)}
			<li class="rounded-2xl border border-sand-200 bg-white p-4">
				<p class="font-semibold text-sand-950">{snippet.title}</p>
				<p class="mt-1 text-sm text-sand-700">{snippet.body}</p>
				{#if !data.readonly}
					<div class="mt-3">
						<Button type="button" variant="ghost" size="sm" onclick={() => void remove(snippet.id)}>
							{m.app_search_delete()}
						</Button>
					</div>
				{/if}
			</li>
		{/each}
	</ul>
{/if}
