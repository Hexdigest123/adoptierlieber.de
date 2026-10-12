<script lang="ts">
	type Item = { href: string; label: string; active: boolean };

	let {
		label,
		items,
		class: className = "",
	}: {
		/** Accessible name of the nav landmark. */
		label: string;
		/** Links to sibling views; pass hrefs already resolved. */
		items: Item[];
		class?: string;
	} = $props();
</script>

<nav aria-label={label} class="flex gap-5 overflow-x-auto border-b border-sand-200 {className}">
	{#each items as item (item.href)}
		<!-- eslint-disable svelte/no-navigation-without-resolve -- callers pass resolved hrefs -->
		<a
			href={item.href}
			aria-current={item.active ? "page" : undefined}
			class="-mb-px shrink-0 border-b-2 px-0.5 py-2.5 text-sm font-medium focus-ring {item.active
				? 'border-coral-600 text-coral-800'
				: 'border-transparent text-sand-700 hover:border-sand-300 hover:text-sand-950'}"
		>
			{item.label}
		</a>
		<!-- eslint-enable svelte/no-navigation-without-resolve -->
	{/each}
</nav>
