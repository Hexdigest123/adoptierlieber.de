<script lang="ts">
	import { m } from "$lib/paraglide/messages";
	import { getLocale, setLocale, locales } from "$lib/paraglide/runtime";

	let {
		variant = "segmented",
		itemRole,
		class: className = "",
	}: {
		/** `segmented` is the bordered toggle for bars; `inline` is the larger borderless row for menus. */
		variant?: "segmented" | "inline";
		/** Set to `menuitem` when rendered inside a `role="menu"`. */
		itemRole?: "menuitem";
		class?: string;
	} = $props();
</script>

<div
	class="flex items-center {variant === 'segmented'
		? 'rounded-full border border-sand-200 p-0.5'
		: 'gap-2'} {className}"
	role="group"
	aria-label={m.header_locale_label()}
>
	{#each locales as locale (locale)}
		<button
			type="button"
			role={itemRole}
			onclick={() => setLocale(locale)}
			aria-pressed={getLocale() === locale}
			class="min-h-11 cursor-pointer rounded-full font-semibold uppercase focus-ring {variant ===
			'segmented'
				? 'min-w-11 px-2 text-xs'
				: 'px-4 py-2 text-sm'} {getLocale() === locale
				? 'bg-coral-600 text-white'
				: 'text-sand-600 hover:text-coral-700'}"
		>
			{locale}
		</button>
	{/each}
</div>
