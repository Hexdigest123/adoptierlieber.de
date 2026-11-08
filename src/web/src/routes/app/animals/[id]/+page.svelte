<script lang="ts">
	import type { PageProps } from "./$types";
	import AnimalDetail from "$lib/components/app/AnimalDetail.svelte";

	let { data }: PageProps = $props();
	let animal = $derived(data.animal);
</script>

<AnimalDetail bind:animal user={data.user} />
