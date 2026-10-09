<script lang="ts">
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import TabNav from "$lib/components/ui/TabNav.svelte";

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

<div class="mt-6">
	<label class="sr-only" for="shelter-settings-nav">{m.shelter_settings_nav()}</label>
	<select
		id="shelter-settings-nav"
		class="h-11 w-full rounded-xl border border-sand-300 bg-white px-3.5 text-sm font-medium focus-ring sm:hidden"
		value={current.href}
		onchange={(event) => {
			location.href = event.currentTarget.value;
		}}
	>
		{#each tabs as tab (tab.href)}
			<option value={tab.href}>{tab.label}</option>
		{/each}
	</select>
	<TabNav
		label={m.shelter_settings_nav()}
		class="max-sm:hidden"
		items={tabs.map((tab) => ({
			href: tab.href,
			label: tab.label,
			active: active(tab.href, tab.match),
		}))}
	/>
</div>
