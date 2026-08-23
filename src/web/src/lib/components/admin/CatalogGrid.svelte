<script lang="ts">
	import type { Snippet } from "svelte";
	import { m } from "$lib/paraglide/messages";
	import Spinner from "$lib/components/ui/Spinner.svelte";

	type Props = {
		shown: number;
		total: number;
		hasMore: boolean;
		loading?: boolean;
		onMore?: () => void;
		children: Snippet;
	};

	let { shown, total, hasMore, loading = false, onMore, children }: Props = $props();

	let sentinel: HTMLDivElement | undefined = $state();

	$effect(() => {
		if (!sentinel || !onMore) return;
		const node = sentinel;
		const observer = new IntersectionObserver(
			(entries) => {
				if (entries.some((entry) => entry.isIntersecting) && hasMore && !loading) {
					onMore();
				}
			},
			{ rootMargin: "240px" },
		);
		observer.observe(node);
		return () => observer.disconnect();
	});
</script>

<div class="mb-3 text-sm text-sand-600 tabular-nums">
	{m.admin_catalog_count({ shown: String(shown), total: String(total) })}
</div>
<div class="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
	{@render children()}
</div>
{#if hasMore}
	<div bind:this={sentinel} class="flex justify-center py-6">
		{#if loading}
			<Spinner class="size-6 text-coral-600" />
		{/if}
	</div>
{/if}
