<script lang="ts">
	import type { PageProps } from "./$types";
	import AnimalDetail from "$lib/components/app/AnimalDetail.svelte";

	let { data }: PageProps = $props();
	let animal = $state(data.animal);
	let lastId = $state(data.animal.id);

	$effect(() => {
		if (data.animal.id !== lastId) {
			lastId = data.animal.id;
			animal = data.animal;
		}
	});
</script>

<AnimalDetail bind:animal user={data.user} />
