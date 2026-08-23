<script lang="ts">
	import type { PageProps } from "./$types";
	import { m } from "$lib/paraglide/messages";
	import AnimalForm from "$lib/components/shelter/AnimalForm.svelte";

	let { data }: PageProps = $props();
</script>

<div class="mx-auto mb-6 w-full max-w-xl text-center">
	<h1 class="text-2xl font-black tracking-tight text-sand-950">
		{data.hasAnimals || data.animals.length > 0 ? m.shelter_animal_add() : m.shelter_animal_new()}
	</h1>
</div>
<AnimalForm
	shelterId={data.current!.shelter_id}
	orgName={data.shelter!.org_name}
	city={data.shelter!.city}
	zip={data.shelter!.zip}
	lat={data.shelter!.lat}
	lng={data.shelter!.lng}
	verified={data.verified}
	readonly={data.readonly}
	animals={data.animals}
	startAsPair={data.startAsPair}
/>
