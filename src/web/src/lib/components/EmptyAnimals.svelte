<script lang="ts">
	let {
		title,
		text = "",
		class: className = "",
	}: {
		title: string;
		text?: string;
		class?: string;
	} = $props();
</script>

<div
	class="flex w-full max-w-md flex-col overflow-hidden rounded-3xl border border-sand-200 bg-white shadow-lg {className}"
>
	<img src="/animals/empty.svg" alt="" width="400" height="500" class="h-88 w-full object-cover" />
	<div class="flex flex-col items-center gap-1.5 p-6 text-center">
		<p class="text-xl font-bold text-sand-900">{title}</p>
		{#if text}
			<p class="text-sm text-sand-700">{text}</p>
		{/if}
	</div>
</div>
