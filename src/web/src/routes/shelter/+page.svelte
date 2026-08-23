<script lang="ts">
	import type { PageProps } from "./$types";
	import { m } from "$lib/paraglide/messages";
	import Card from "$lib/components/ui/Card.svelte";
	import Button from "$lib/components/ui/Button.svelte";
	import { photoUrl } from "$lib/types/shelter";

	let { data }: PageProps = $props();

	const kpis = $derived(data.dashboard.kpis);
	const tiles = $derived([
		{ label: m.shelter_kpi_live(), value: kpis.live, href: "/shelter/animals?status=live" },
		{ label: m.shelter_kpi_drafts(), value: kpis.drafts, href: "/shelter/animals?status=draft" },
		{ label: m.shelter_kpi_new(), value: kpis.new_threads, href: "/shelter/messages?filter=new" },
		{ label: m.shelter_kpi_unread(), value: kpis.unread, href: "/shelter/messages" },
		{ label: m.shelter_kpi_likes(), value: kpis.likes, href: "/shelter/animals?status=live" },
		{
			label: m.shelter_kpi_impressions(),
			value: kpis.impressions_7d,
			href: "/shelter/animals?status=live",
		},
	]);

	function attentionLabel(kind: string): string {
		if (kind === "stale_draft_no_photo") return m.shelter_attention_stale();
		if (kind === "live_no_photo") return m.shelter_attention_live_photo();
		if (kind === "unanswered") return m.shelter_attention_unanswered();
		if (kind === "pending") return m.shelter_attention_pending();
		return kind;
	}

	function timeLabel(iso: string): string {
		return new Date(iso).toLocaleString();
	}
</script>

<div class="flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="text-2xl font-black tracking-tight text-sand-950">{m.shelter_dash_title()}</h1>
		<p class="mt-1 text-sm text-sand-700">{m.shelter_dash_subtitle()}</p>
	</div>
	<div class="flex flex-wrap gap-2">
		{#if data.shelter?.checklist.dismissed}
			<Button
				variant="ghost"
				size="sm"
				onclick={() => {
					void fetch(`/api/shelters/${data.current!.shelter_id}/checklist`, {
						method: "PATCH",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({ dismissed: false }),
					}).then(() => location.reload());
				}}
			>
				{m.shelter_coach_title()}
			</Button>
		{/if}
		<Button href="/shelter/animals/new" size="sm"
			>{data.hasAnimals ? m.shelter_animal_add() : m.shelter_animal_new()}</Button
		>
	</div>
</div>

<ul class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
	{#each tiles as tile (tile.label)}
		<li>
			<a href={tile.href} class="block">
				<Card focusable class="h-full">
					<p class="text-xs font-semibold tracking-wide text-sand-500 uppercase">{tile.label}</p>
					<p class="mt-2 text-3xl font-black text-sand-950">{tile.value}</p>
				</Card>
			</a>
		</li>
	{/each}
</ul>
<p class="mt-2 text-xs text-sand-600">{m.shelter_impressions_hint()}</p>

{#if data.dashboard.attention.length}
	<section class="mt-8">
		<h2 class="text-lg font-bold text-sand-950">{m.shelter_attention_title()}</h2>
		<ul class="mt-3 flex flex-col gap-2">
			{#each data.dashboard.attention as row, i (row.kind + (row.animal_id ?? i))}
				<li class="rounded-xl border border-sand-200 bg-white px-4 py-3 text-sm text-sand-800">
					{attentionLabel(row.kind)}
				</li>
			{/each}
		</ul>
	</section>
{/if}

<section class="mt-8">
	<div class="flex items-center justify-between">
		<h2 class="text-lg font-bold text-sand-950">{m.shelter_recent_title()}</h2>
		<a href="/shelter/messages" class="text-sm font-semibold text-coral-700"
			>{m.shelter_recent_all()}</a
		>
	</div>
	{#if data.dashboard.recent_threads.length === 0}
		<p class="mt-3 text-sm text-sand-600">{m.shelter_messages_empty()}</p>
	{:else}
		<ul class="mt-3 flex flex-col gap-2">
			{#each data.dashboard.recent_threads as thread (thread.id)}
				<li>
					<a
						href="/shelter/messages/{thread.id}"
						class="flex items-center gap-3 rounded-xl border border-sand-200 bg-white px-3 py-2 focus-ring hover:bg-peach-50"
					>
						{#if thread.animal_photo && data.current}
							<img
								src={photoUrl(data.current.shelter_id, thread.animal_id, thread.animal_photo)}
								alt=""
								class="size-12 rounded-lg object-cover"
							/>
						{:else}
							<div class="size-12 rounded-lg bg-peach-200"></div>
						{/if}
						<div class="min-w-0 flex-1">
							<p class="truncate text-sm font-semibold text-sand-950">
								{thread.adopter_name}
								<span class="font-normal text-sand-600"> {thread.animal_name}</span>
							</p>
							<p class="text-xs text-sand-500">{timeLabel(thread.last_message_at)}</p>
						</div>
						{#if thread.unread}
							<span class="size-2.5 shrink-0 rounded-full bg-coral-600" aria-hidden="true"></span>
						{/if}
					</a>
				</li>
			{/each}
		</ul>
	{/if}
</section>
