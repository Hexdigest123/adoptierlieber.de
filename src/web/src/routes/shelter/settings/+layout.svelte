<script lang="ts">
	import type { LayoutProps } from "./$types";
	import { m } from "$lib/paraglide/messages";
	import SettingsTabs from "$lib/components/shelter/SettingsTabs.svelte";

	let { children }: LayoutProps = $props();
</script>

<div class="mx-auto w-full max-w-2xl">
	<header class="text-center">
		<h1 class="text-2xl font-black tracking-tight text-sand-950">{m.shelter_settings_title()}</h1>
	</header>
	<SettingsTabs />
	<div class="mt-8">
		{@render children()}
	</div>
</div>
