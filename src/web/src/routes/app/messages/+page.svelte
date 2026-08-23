<script lang="ts">
	import type { PageProps } from "./$types";
	import { resolve } from "$app/paths";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";

	let { data }: PageProps = $props();

	function timeLabel(iso: string): string {
		return new Date(iso).toLocaleString();
	}
</script>

<div class="flex flex-col gap-4">
	<h1 class="text-2xl font-black text-sand-950">{m.app_messages_title()}</h1>

	{#if data.threads.length === 0}
		<div class="rounded-3xl border-2 border-dashed border-sand-300 bg-white p-8 text-center">
			<p class="text-xl font-bold text-sand-900">{m.app_messages_empty_title()}</p>
			<p class="mt-2 text-sm text-sand-700">{m.app_messages_empty_text()}</p>
			<div class="mt-4">
				<Button href={resolve("/app")}>{m.app_tab_discover()}</Button>
			</div>
		</div>
	{:else}
		<ul class="flex flex-col gap-2">
			{#each data.threads as thread (thread.id)}
				<li>
					<a
						href={resolve(`/app/messages/${thread.id}`)}
						class="flex items-center gap-3 rounded-xl border border-sand-200 bg-white px-3 py-3 focus-ring hover:bg-peach-50"
					>
						{#if thread.animal_photo}
							<img
								src="/api/animals/{thread.animal_id}/photos/0"
								alt=""
								class="size-12 rounded-lg object-cover"
							/>
						{:else}
							<div class="size-12 rounded-lg bg-peach-200"></div>
						{/if}
						<div class="min-w-0 flex-1">
							<p class="truncate font-semibold text-sand-950">
								{thread.animal_name}
								<span class="font-normal text-sand-600"> {thread.shelter_name}</span>
							</p>
							<p class="truncate text-sm text-sand-600">{thread.last_preview ?? ""}</p>
							<p class="text-xs text-sand-500">{timeLabel(thread.last_message_at)}</p>
						</div>
						{#if thread.unread_for_me}
							<span class="size-2.5 shrink-0 rounded-full bg-coral-600" aria-hidden="true"></span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</div>
