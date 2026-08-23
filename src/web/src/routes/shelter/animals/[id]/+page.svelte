<script lang="ts">
	import type { PageProps } from "./$types";
	import { m } from "$lib/paraglide/messages";
	import AnimalForm from "$lib/components/shelter/AnimalForm.svelte";

	let { data }: PageProps = $props();
</script>

<h1 class="mb-6 text-2xl font-black tracking-tight text-sand-950">{data.animal.name}</h1>
<AnimalForm
	shelterId={data.current!.shelter_id}
	orgName={data.shelter!.org_name}
	city={data.shelter!.city}
	zip={data.shelter!.zip}
	lat={data.shelter!.lat}
	lng={data.shelter!.lng}
	verified={data.verified}
	readonly={data.readonly}
	animal={data.animal}
	animals={data.animals}
/>
