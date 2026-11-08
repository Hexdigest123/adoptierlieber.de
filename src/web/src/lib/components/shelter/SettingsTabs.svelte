<script lang="ts">
	import { goto } from "$app/navigation";
	import { resolve } from "$app/paths";
	import { page } from "$app/state";
	import { m } from "$lib/paraglide/messages";
	import Select from "$lib/components/ui/Select.svelte";
	import TabNav from "$lib/components/ui/TabNav.svelte";

	const path = $derived(page.url.pathname);

	const tabs = $derived([
		{
			href: resolve("/shelter/settings"),
			label: m.shelter_settings_profile(),
			match: "exact" as const,
		},
		{
			href: resolve("/shelter/settings/form"),
			label: m.shelter_settings_form(),
			match: "prefix" as const,
		},
		{
			href: resolve("/shelter/settings/team"),
			label: m.shelter_settings_team(),
			match: "prefix" as const,
		},
		{
			href: resolve("/shelter/settings/snippets"),
			label: m.shelter_snippets_title(),
			match: "prefix" as const,
		},
	]);

	function active(href: string, match: "exact" | "prefix") {
		if (match === "exact") return path === href;
		return path === href || path.startsWith(`${href}/`);
	}

	const current = $derived(tabs.find((tab) => active(tab.href, tab.match)) ?? tabs[0]);

	function onPick(event: Event & { currentTarget: HTMLSelectElement }) {
		const tab = tabs.find((entry) => entry.href === event.currentTarget.value);
		if (tab) void goto(tab.href);
	}
</script>

<div class="mt-6">
	<Select
		id="shelter-settings-nav"
		class="sm:hidden"
		label={m.shelter_settings_nav()}
		hideLabel
		options={tabs.map((tab) => ({ value: tab.href, label: tab.label }))}
		value={current.href}
		onchange={onPick}
	/>
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
