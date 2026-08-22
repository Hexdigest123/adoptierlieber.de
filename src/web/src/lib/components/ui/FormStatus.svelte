<script lang="ts">
	import type { Snippet } from "svelte";
	import CircleCheck from "lucide-svelte/icons/circle-check";
	import CircleAlert from "lucide-svelte/icons/circle-alert";

	type Props = {
		type: "success" | "error";
		children: Snippet;
		class?: string;
	};

	let { type, children, class: className = "" }: Props = $props();

	const styles = {
		success: "border-emerald-700 bg-emerald-50 text-emerald-900",
		error: "border-coral-700 bg-coral-50 text-coral-900",
	};
</script>

<div
	role={type === "error" ? "alert" : "status"}
	aria-live={type === "error" ? "assertive" : "polite"}
	class="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm {styles[type]} {className}"
>
	<span class="mt-0.5 shrink-0" aria-hidden="true">
		{#if type === "success"}
			<CircleCheck class="size-5" />
		{:else}
			<CircleAlert class="size-5" />
		{/if}
	</span>
	<div>{@render children()}</div>
</div>
