<script lang="ts">
	import deFlag from "$lib/assets/flags/de.svg";
	import euFlag from "$lib/assets/flags/eu.svg";
	import { m } from "$lib/paraglide/messages";
	import { getLocale, setLocale, locales, type Locale } from "$lib/paraglide/runtime";

	const languages: Record<Locale, { flag: string; name: string }> = {
		de: { flag: deFlag, name: "Deutsch" },
		en: { flag: euFlag, name: "English" },
	};

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
			aria-label={languages[locale].name}
			title={languages[locale].name}
			lang={locale}
			class="grid min-h-11 cursor-pointer place-items-center rounded-full focus-ring {variant ===
			'segmented'
				? 'min-w-11 px-2'
				: 'px-4 py-2'} {getLocale() === locale ? 'bg-coral-600' : 'hover:bg-sand-100'}"
		>
			<img
				src={languages[locale].flag}
				alt=""
				aria-hidden="true"
				width="24"
				height="16"
				class="rounded-sm object-cover ring-1 ring-black/10 {variant === 'segmented'
					? 'h-4 w-6'
					: 'h-5 w-7.5'}"
			/>
		</button>
	{/each}
</div>
