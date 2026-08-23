<script lang="ts">
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";

	const path = $derived(page.url.pathname);

	const tabs = $derived([
		{
			href: "/shelter/settings",
			label: m.shelter_settings_profile(),
			match: "exact" as const,
		},
		{
			href: "/shelter/settings/form",
			label: m.shelter_settings_form(),
			match: "prefix" as const,
		},
		{
			href: "/shelter/settings/team",
			label: m.shelter_settings_team(),
			match: "prefix" as const,
		},
		{
			href: "/shelter/settings/snippets",
			label: m.shelter_snippets_title(),
			match: "prefix" as const,
		},
	]);

	function active(href: string, match: "exact" | "prefix") {
		if (match === "exact") return path === href;
		return path === href || path.startsWith(`${href}/`);
	}

	const current = $derived(tabs.find((tab) => active(tab.href, tab.match)) ?? tabs[0]);
</script>

<nav class="mt-6 flex justify-center" aria-label={m.shelter_settings_nav()}>
	<label class="sr-only sm:hidden" for="shelter-settings-nav">{m.shelter_settings_nav()}</label>
	<select
		id="shelter-settings-nav"
		class="h-11 w-full max-w-sm rounded-full border border-sand-200 bg-white px-4 text-sm font-semibold focus-ring sm:hidden"
		value={current.href}
		onchange={(event) => {
			location.href = event.currentTarget.value;
		}}
	>
		{#each tabs as tab (tab.href)}
			<option value={tab.href}>{tab.label}</option>
		{/each}
	</select>
	<div
		class="hidden max-w-full justify-center gap-1 rounded-full border border-sand-200 bg-white p-1 shadow-sm sm:inline-flex"
	>
		{#each tabs as tab (tab.href)}
			<a
				href={tab.href}
				class="rounded-full px-4 py-2 text-sm font-semibold focus-ring {active(tab.href, tab.match)
					? 'bg-coral-600 text-white'
					: 'text-sand-700 hover:bg-peach-100 hover:text-coral-700'}"
				aria-current={active(tab.href, tab.match) ? "page" : undefined}
			>
				{tab.label}
			</a>
		{/each}
	</div>
</nav>
