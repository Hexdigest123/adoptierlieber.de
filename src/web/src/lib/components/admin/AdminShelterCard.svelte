<script lang="ts">
	import { resolve } from "$app/paths";
	import type { AdminShelterCard } from "$lib/admin/types";
	import { m } from "$lib/paraglide/messages";
	import Avatar from "$lib/components/ui/Avatar.svelte";
	import StatusPill from "./StatusPill.svelte";

	let {
		shelter,
		href,
	}: {
		shelter: AdminShelterCard;
		href?: string;
	} = $props();

	const target = $derived(href ?? resolve("/admin/catalog/shelters/[id]", { id: shelter.id }));
</script>

<article
	class="relative h-full overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-sm"
>
	<a href={target} class="flex h-full flex-col focus-ring">
		<div class="relative flex aspect-4/5 items-center justify-center bg-peach-100">
			{#if shelter.has_logo}
				<img src="/api/shelters/{shelter.id}/logo" alt="" class="h-full w-full object-cover" />
			{:else}
				<Avatar name={shelter.org_name} size="lg" class="size-24" />
			{/if}
		</div>
		<div class="flex flex-1 flex-col gap-1.5 p-5">
			<div class="flex items-start justify-between gap-2">
				<p class="text-2xl font-bold text-sand-950">{shelter.org_name}</p>
				<StatusPill status={shelter.verification_status} />
			</div>
			<p class="text-sm font-semibold text-coral-700">{shelter.city}</p>
			<p class="truncate text-sm text-sand-700">{shelter.owner_name ?? m.admin_no_owner()}</p>
		</div>
	</a>
</article>
