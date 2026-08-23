<script lang="ts">
	import type { LayoutProps } from "./$types";
	import ShelterChrome from "$lib/components/shelter/ShelterChrome.svelte";
	import Coachmark from "$lib/components/shelter/Coachmark.svelte";

	let { data, children }: LayoutProps = $props();
</script>

<div class="flex min-h-dvh flex-col bg-peach-50">
	<ShelterChrome
		user={data.user}
		memberships={data.memberships}
		current={data.current}
		shelter={data.shelter}
		unread={data.unread}
	/>
	<main id="content" class="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:px-6 md:pb-10">
		{@render children()}
	</main>
	{#if data.shelter && data.current}
		<Coachmark
			shelter={data.shelter}
			readonly={data.shelter.verification_status === "rejected"}
			hasAnimals={data.hasAnimals}
		/>
	{/if}
</div>
