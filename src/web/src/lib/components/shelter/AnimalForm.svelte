<script lang="ts">
	import { browser } from "$app/environment";
	import { goto } from "$app/navigation";
	import { m } from "$lib/paraglide/messages";
	import Button from "$lib/components/ui/Button.svelte";
	import Checkbox from "$lib/components/ui/Checkbox.svelte";
	import Input from "$lib/components/ui/Input.svelte";
	import Textarea from "$lib/components/ui/Textarea.svelte";
	import FormStatus from "$lib/components/ui/FormStatus.svelte";
	import AnimalDetail from "$lib/components/app/AnimalDetail.svelte";
	import PawPrint from "lucide-svelte/icons/paw-print";
	import Heart from "lucide-svelte/icons/heart";
	import type { PublicAnimal } from "$lib/types/catalog";
	import {
		parsePublishMissing,
		photoSlot,
		photoUrl,
		publishMissing,
		type AnimalSex,
		type AnimalSize,
		type AnimalSpecies,
		type PublishField,
		type StaffAnimal,
		type Triad,
	} from "$lib/types/shelter";
	import { BREED_OTHER, breedsFor, isCuratedBreed, isKnownBreed } from "$lib/data/breeds";

	type Draft = {
		name: string;
		species: AnimalSpecies;
		breed: string;
		breedOther: boolean;
		sex: AnimalSex | "";
		ageUnknown: boolean;
		ageMonths: string;
		size: AnimalSize | "";
		tagline: string;
		description: string;
		vaccinated: Triad | "";
		neutered: Triad | "";
		chipped: Triad | "";
		houseTrained: Triad | "";
		colorsText: string;
		traitsText: string;
	};

	type Kind = "single" | "pair";
	type PartnerMode = "new" | "existing";
	type Companion =
		{ key: string; mode: "new"; draft: Draft } | { key: string; mode: "existing"; id: string };
	type StepId =
		| "type"
		| "partner"
		| "basics"
		| "story"
		| "care"
		| "review"
		| `partner_basics_${number}`
		| `partner_story_${number}`
		| `partner_care_${number}`;

	type Props = {
		shelterId: string;
		orgName: string;
		city: string;
		zip: string;
		lat: number | null;
		lng: number | null;
		verified: boolean;
		readonly: boolean;
		animal?: StaffAnimal | null;
		animals?: StaffAnimal[];
		startAsPair?: boolean;
	};

	let {
		shelterId,
		orgName,
		city,
		zip,
		lat,
		lng,
		verified,
		readonly,
		animal = null,
		animals = [],
		startAsPair = false,
	}: Props = $props();

	const creating = $derived(!animal);
	const wizard = $derived(creating && browser);

	function fromAnimal(row?: StaffAnimal | null, speciesFallback: AnimalSpecies = "cat"): Draft {
		const species = row?.species ?? speciesFallback;
		const breed = row?.breed ?? "";
		return {
			name: row?.name ?? "",
			species,
			breed,
			breedOther: Boolean(breed && !isCuratedBreed(species, breed)),
			sex: row?.sex ?? "",
			ageUnknown: row?.age_unknown ?? false,
			ageMonths: row?.age_months != null ? String(row.age_months) : "",
			size: row?.size ?? "",
			tagline: row?.tagline ?? "",
			description: row?.description ?? "",
			vaccinated: row?.vaccinated ?? "",
			neutered: row?.neutered ?? "",
			chipped: row?.chipped ?? "",
			houseTrained: row?.house_trained ?? "",
			colorsText: (row?.colors ?? []).join(", "),
			traitsText: (row?.traits ?? []).join(", "),
		};
	}

	let companionSeq = 1;

	function blankCompanion(species: AnimalSpecies = "cat"): Companion {
		const key = `c${companionSeq}`;
		companionSeq += 1;
		return { key, mode: "new", draft: fromAnimal(null, species) };
	}

	let primary = $state<Draft>(fromAnimal(animal));
	let kind = $state<Kind>(startAsPair ? "pair" : "single");
	let companions = $state<Companion[]>([blankCompanion(animal?.species ?? "cat")]);
	let selectedPartnerIds = $state<string[]>(
		animal?.bonded_partners?.map((row) => row.id) ??
			(animal?.bonded_animal_id ? [animal.bonded_animal_id] : []),
	);
	let bonded = $state(
		Boolean(animal?.bonded_partners?.length || animal?.bonded_partner || animal?.bond_group_id),
	);
	let bondedPartner = $state(animal?.bonded_partner ?? "");
	let photos = $state<string[]>(animal?.photos ?? []);
	let status = $state(animal?.status ?? "draft");
	let error = $state("");
	let saved = $state(false);
	let saving = $state(false);
	let publishAttempted = $state(false);
	let confirmUnpublish = $state(false);
	let confirmHome = $state(false);
	let homeNote = $state("");
	let previewOpen = $state(false);
	let step = $state(0);
	let stepError = $state(false);

	const speciesOptions: AnimalSpecies[] = [
		"cat",
		"dog",
		"rabbit",
		"guinea_pig",
		"bird",
		"reptile",
		"other",
	];

	const partnerChoices = $derived(
		animals.filter((row) => row.id !== animal?.id && row.status !== "found_home"),
	);

	const steps = $derived.by((): StepId[] => {
		if (!creating) return [];
		if (kind === "single") return ["type", "basics", "story", "care", "review"];
		const extra: StepId[] = [];
		companions.forEach((entry, index) => {
			if (entry.mode === "new") {
				extra.push(`partner_basics_${index}`, `partner_story_${index}`, `partner_care_${index}`);
			}
		});
		return ["type", "partner", "basics", "story", "care", ...extra, "review"];
	});

	const total = $derived(steps.length);
	const current = $derived(steps[step] ?? "type");

	function speciesLabel(value: AnimalSpecies): string {
		if (value === "cat") return m.species_cat();
		if (value === "dog") return m.species_dog();
		if (value === "rabbit") return m.species_rabbit();
		if (value === "guinea_pig") return m.species_guinea_pig();
		if (value === "bird") return m.shelter_species_bird();
		if (value === "reptile") return m.shelter_species_reptile();
		return m.shelter_species_other();
	}

	function sexLabel(value: AnimalSex | ""): string {
		if (value === "female") return m.shelter_sex_female();
		if (value === "male") return m.shelter_sex_male();
		if (value === "unknown") return m.shelter_unknown();
		return m.shelter_unset();
	}

	function neuteredFieldLabel(sex: AnimalSex | ""): string {
		if (sex === "female") return m.shelter_field_neutered_female();
		if (sex === "male") return m.shelter_field_neutered_male();
		return m.shelter_field_neutered();
	}

	function listFrom(text: string): string[] {
		return text
			.split(",")
			.map((value) => value.trim())
			.filter(Boolean);
	}

	function payload(
		draft: Draft,
		extra: {
			bonded_partner?: string | null;
			bonded_animal_id?: string | null;
			bonded_animal_ids?: string[];
		} = {},
	) {
		return {
			name: draft.name.trim(),
			species: draft.species,
			breed: draft.breed.trim() || null,
			sex: draft.sex || null,
			age_unknown: draft.ageUnknown,
			age_months:
				draft.ageUnknown || !draft.ageMonths || !Number.isFinite(Number(draft.ageMonths))
					? null
					: Number(draft.ageMonths),
			size: draft.size || null,
			tagline: draft.tagline.trim() || null,
			description: draft.description.trim() || null,
			vaccinated: draft.vaccinated || null,
			neutered: draft.neutered || null,
			chipped: draft.chipped || null,
			house_trained: draft.houseTrained || null,
			colors: listFrom(draft.colorsText),
			traits: listFrom(draft.traitsText),
			...extra,
		};
	}

	function existingChoices(index: number): StaffAnimal[] {
		const taken = new Set(
			companions.flatMap((entry, i) =>
				i !== index && entry.mode === "existing" && entry.id ? [entry.id] : [],
			),
		);
		return partnerChoices.filter((row) => !taken.has(row.id));
	}

	function companionName(entry: Companion): string {
		if (entry.mode === "new") return entry.draft.name.trim();
		return partnerChoices.find((row) => row.id === entry.id)?.name ?? "";
	}

	function partnerNames(): string[] {
		if (creating && kind === "pair") {
			return companions.map(companionName).filter(Boolean);
		}
		if (!bonded) return [];
		const picked = selectedPartnerIds
			.map((id) => partnerChoices.find((row) => row.id === id)?.name)
			.filter((name): name is string => Boolean(name));
		if (picked.length) return picked;
		return bondedPartner.trim() ? [bondedPartner.trim()] : [];
	}

	function partnerName(): string {
		return partnerNames().join(", ");
	}

	function onKind(value: Kind) {
		kind = value;
		bonded = value === "pair";
		if (value === "single") {
			selectedPartnerIds = [];
		}
		if (step >= steps.length) step = 0;
	}

	function setCompanionMode(index: number, mode: PartnerMode) {
		const current = companions[index];
		if (!current || current.mode === mode) return;
		if (mode === "new") {
			companions[index] = {
				key: current.key,
				mode: "new",
				draft: fromAnimal(null, primary.species),
			};
		} else {
			companions[index] = { key: current.key, mode: "existing", id: "" };
		}
		if (step >= steps.length) step = Math.min(step, 1);
	}

	function addCompanion() {
		if (companions.length >= 99) return;
		companions = [...companions, blankCompanion(primary.species)];
	}

	function removeCompanion(index: number) {
		if (companions.length <= 1) return;
		companions = companions.filter((_, i) => i !== index);
		if (step >= steps.length) step = Math.max(0, steps.length - 1);
	}

	function addSelectedPartner(id: string) {
		if (!id || selectedPartnerIds.includes(id) || selectedPartnerIds.length >= 99) return;
		selectedPartnerIds = [...selectedPartnerIds, id];
		const picked = partnerChoices.find((row) => row.id === id);
		if (picked) bondedPartner = "";
	}

	function removeSelectedPartner(id: string) {
		selectedPartnerIds = selectedPartnerIds.filter((entry) => entry !== id);
	}

	function show(id: StepId) {
		return !wizard || current === id;
	}

	function validBasics(draft: Draft) {
		return draft.name.trim().length > 0;
	}

	function currentPublishMissing(): PublishField[] {
		return publishMissing({
			name: primary.name,
			species: primary.species,
			photos,
			ageUnknown: primary.ageUnknown,
			ageMonths: primary.ageMonths,
			sex: primary.sex,
			tagline: primary.tagline,
			description: primary.description,
			vaccinated: primary.vaccinated,
			neutered: primary.neutered,
			chipped: primary.chipped,
			houseTrained: primary.houseTrained,
		});
	}

	const missing = $derived(publishAttempted ? currentPublishMissing() : []);

	function publishFieldLabel(field: PublishField): string {
		if (field === "name") return m.shelter_field_name();
		if (field === "species") return m.shelter_field_species();
		if (field === "photos") return m.shelter_photos_title();
		if (field === "age") return m.shelter_field_age();
		if (field === "sex") return m.shelter_field_sex();
		if (field === "tagline") return m.shelter_field_tagline();
		if (field === "description") return m.shelter_field_description();
		if (field === "vaccinated") return m.shelter_field_vaccinated();
		if (field === "neutered") return neuteredFieldLabel(primary.sex);
		if (field === "chipped") return m.shelter_field_chipped();
		return m.shelter_field_house();
	}

	function fieldError(prefix: string, field: PublishField): string | undefined {
		if (prefix !== "an" || !missing.includes(field)) return undefined;
		return m.shelter_publish_required();
	}

	function selectClass(invalid: boolean): string {
		return `h-11 rounded-xl border bg-white px-3.5 focus-ring ${
			invalid ? "border-coral-600" : "border-sand-300"
		}`;
	}

	function breedSelectValue(draft: Draft): string {
		if (draft.breedOther) return BREED_OTHER;
		return draft.breed.trim();
	}

	function onBreedSelect(draft: Draft, value: string) {
		if (value === BREED_OTHER) {
			draft.breedOther = true;
			if (isCuratedBreed(draft.species, draft.breed.trim())) {
				draft.breed = "";
			}
			return;
		}
		draft.breedOther = false;
		draft.breed = value;
	}

	function onSpeciesChange(draft: Draft) {
		const value = draft.breed.trim();
		if (!value) {
			draft.breedOther = false;
			return;
		}
		if (isCuratedBreed(draft.species, value)) {
			draft.breedOther = false;
			return;
		}
		if (isKnownBreed(value)) {
			draft.breed = "";
			draft.breedOther = false;
			return;
		}
		draft.breedOther = true;
	}

	function previewAgeMonths(): number | null {
		if (primary.ageUnknown || !primary.ageMonths.trim()) return null;
		const value = Number(primary.ageMonths);
		return Number.isFinite(value) ? value : null;
	}

	const previewAnimal = $derived.by((): PublicAnimal => {
		const partners = partnerNames().map((name, index) => ({
			id: selectedPartnerIds[index] ?? `preview-${index}`,
			name,
		}));
		return {
			id: animal?.id ?? "preview",
			name: primary.name.trim() || m.shelter_unset(),
			species: primary.species,
			breed: primary.breed.trim() || null,
			sex: primary.sex || null,
			age_months: previewAgeMonths(),
			age_unknown: primary.ageUnknown,
			size: primary.size || null,
			colors: listFrom(primary.colorsText),
			traits: listFrom(primary.traitsText),
			tagline: primary.tagline.trim() || null,
			description: primary.description.trim() || null,
			photos: animal ? photos.map((key) => photoUrl(shelterId, animal.id, key)) : [],
			status: status === "found_home" ? "found_home" : "live",
			vaccinated: primary.vaccinated || null,
			neutered: primary.neutered || null,
			chipped: primary.chipped || null,
			house_trained: primary.houseTrained || null,
			bonded_partner: partners.length ? null : bondedPartner.trim() || null,
			bonded_animal_id: selectedPartnerIds[0] ?? null,
			bond_group_id: animal?.bond_group_id ?? null,
			bonded_partners: partners,
			like_count: animal?.like_count ?? 0,
			impression_count: animal?.impression_count ?? 0,
			published_at: animal?.published_at ?? null,
			found_home_at: animal?.found_home_at ?? null,
			shelter: {
				id: shelterId,
				org_name: orgName,
				city,
				zip,
				lat,
				lng,
			},
			lat,
			lng,
			distance_km: null,
			liked: false,
		};
	});

	function validPartner() {
		if (kind !== "pair") return true;
		if (!companions.length) return false;
		return companions.every((entry) => entry.mode === "new" || Boolean(entry.id));
	}

	function partnerStepIndex(id: StepId): number | null {
		const match = /^partner_(?:basics|story|care)_(\d+)$/.exec(id);
		return match ? Number(match[1]) : null;
	}

	function next() {
		if (current === "partner" && !validPartner()) {
			stepError = true;
			return;
		}
		if (current === "basics" && !validBasics(primary)) {
			stepError = true;
			return;
		}
		const partnerIndex = partnerStepIndex(current);
		if (
			partnerIndex != null &&
			current.startsWith("partner_basics_") &&
			companions[partnerIndex]?.mode === "new" &&
			!validBasics(companions[partnerIndex].draft)
		) {
			stepError = true;
			return;
		}
		stepError = false;
		if (step < total - 1) step += 1;
	}

	function back() {
		stepError = false;
		if (step > 0) step -= 1;
	}

	async function save(): Promise<StaffAnimal | null> {
		if (readonly) return null;
		if (!validBasics(primary)) {
			error = m.error_invalid_input();
			return null;
		}
		if (creating && kind === "pair" && !validPartner()) {
			error = m.error_invalid_input();
			return null;
		}
		if (
			creating &&
			kind === "pair" &&
			companions.some((entry) => entry.mode === "new" && !validBasics(entry.draft))
		) {
			error = m.error_invalid_input();
			return null;
		}
		saving = true;
		error = "";
		saved = false;

		if (creating && kind === "pair") {
			const drafts = companions.filter((entry) => entry.mode === "new");
			const existingIds = companions.flatMap((entry) =>
				entry.mode === "existing" && entry.id ? [entry.id] : [],
			);
			if (drafts.length) {
				const response = await fetch(`/api/shelters/${shelterId}/animals/group`, {
					method: "POST",
					headers: { "content-type": "application/json" },
					body: JSON.stringify({
						members: [payload(primary), ...drafts.map((entry) => payload(entry.draft))],
					}),
				});
				if (!response.ok) {
					saving = false;
					error = m.error_invalid_input();
					return null;
				}
				const group = (await response.json()) as { members: StaffAnimal[] };
				const first = group.members[0];
				if (existingIds.length && first) {
					const patch = await fetch(`/api/shelters/${shelterId}/animals/${first.id}`, {
						method: "PATCH",
						headers: { "content-type": "application/json" },
						body: JSON.stringify({
							bonded_animal_ids: [...group.members.slice(1).map((row) => row.id), ...existingIds],
						}),
					});
					if (!patch.ok) {
						saving = false;
						error = m.error_invalid_input();
						return null;
					}
				}
				saving = false;
				if (first) await goto(`/shelter/animals/${first.id}`);
				return first ?? null;
			}

			const extra = { bonded_animal_ids: existingIds };
			const response = await fetch(`/api/shelters/${shelterId}/animals`, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload(primary, extra)),
			});
			if (!response.ok) {
				saving = false;
				error = m.error_invalid_input();
				return null;
			}
			const row = (await response.json()) as StaffAnimal;
			saving = false;
			await goto(`/shelter/animals/${row.id}`);
			return row;
		}

		const extra = bonded
			? selectedPartnerIds.length
				? { bonded_animal_ids: selectedPartnerIds }
				: { bonded_animal_ids: [] as string[], bonded_partner: partnerName() || null }
			: { bonded_animal_ids: [] as string[] };

		const isNew = !animal;
		const response = await fetch(
			isNew
				? `/api/shelters/${shelterId}/animals`
				: `/api/shelters/${shelterId}/animals/${animal.id}`,
			{
				method: isNew ? "POST" : "PATCH",
				headers: { "content-type": "application/json" },
				body: JSON.stringify(payload(primary, extra)),
			},
		);
		if (!response.ok) {
			saving = false;
			error = m.error_invalid_input();
			return null;
		}
		const row = (await response.json()) as StaffAnimal;
		saving = false;
		saved = true;
		if (isNew) {
			await goto(`/shelter/animals/${row.id}`);
		}
		selectedPartnerIds = row.bonded_partners?.map((entry) => entry.id) ?? selectedPartnerIds;
		bondedPartner = row.bonded_partner ?? bondedPartner;
		return row;
	}

	async function onPhoto(event: Event) {
		if (readonly || !animal) return;
		const input = event.currentTarget as HTMLInputElement;
		const file = input.files?.[0];
		if (!file) return;
		const body = new FormData();
		body.set("photo", file);
		const response = await fetch(`/api/shelters/${shelterId}/animals/${animal.id}/photos`, {
			method: "PUT",
			body,
		});
		if (!response.ok) {
			error = m.error_invalid_input();
			return;
		}
		const row = (await response.json()) as StaffAnimal;
		photos = row.photos;
		input.value = "";
	}

	async function movePhoto(index: number, delta: number) {
		if (readonly || !animal) return;
		const nextIndex = index + delta;
		if (nextIndex < 0 || nextIndex >= photos.length) return;
		const ordered = [...photos];
		const [item] = ordered.splice(index, 1);
		ordered.splice(nextIndex, 0, item);
		const response = await fetch(`/api/shelters/${shelterId}/animals/${animal.id}/photos`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ photos: ordered }),
		});
		if (response.ok) {
			const row = (await response.json()) as StaffAnimal;
			photos = row.photos;
		}
	}

	async function removePhoto(key: string) {
		if (readonly || !animal) return;
		if (!confirm(m.shelter_photo_delete_confirm())) return;
		const response = await fetch(
			`/api/shelters/${shelterId}/animals/${animal.id}/photos/${photoSlot(key)}`,
			{ method: "DELETE" },
		);
		if (response.ok) {
			const row = (await response.json()) as StaffAnimal;
			photos = row.photos;
		}
	}

	async function cloneListing() {
		if (!animal) return;
		const response = await fetch(`/api/shelters/${shelterId}/animals/${animal.id}/clone`, {
			method: "POST",
		});
		if (!response.ok) {
			error = m.error_invalid_input();
			return;
		}
		const row = (await response.json()) as StaffAnimal;
		await goto(`/shelter/animals/${row.id}`);
	}

	async function publish() {
		if (!animal || !verified) return;
		publishAttempted = true;
		error = "";
		if (currentPublishMissing().length) return;
		const savedRow = await save();
		if (!savedRow) return;
		const response = await fetch(`/api/shelters/${shelterId}/animals/${savedRow.id}/publication`, {
			method: "POST",
		});
		if (!response.ok) {
			if (response.status === 403) {
				error = m.shelter_publish_pending();
				return;
			}
			const body = (await response.json().catch(() => null)) as { error?: string } | null;
			const fromApi = parsePublishMissing(body?.error);
			const fields = (fromApi.length ? fromApi : currentPublishMissing()).map(publishFieldLabel);
			error = fields.length
				? m.shelter_publish_missing({ fields: fields.join(", ") })
				: m.error_invalid_input();
			return;
		}
		const row = (await response.json()) as StaffAnimal;
		publishAttempted = false;
		status = row.status;
		saved = true;
	}

	async function unpublish() {
		if (!animal) return;
		const response = await fetch(`/api/shelters/${shelterId}/animals/${animal.id}/publication`, {
			method: "DELETE",
		});
		if (response.ok) {
			status = "draft";
			confirmUnpublish = false;
		} else {
			error = m.error_generic();
		}
	}

	async function markHome() {
		if (!animal) return;
		const response = await fetch(`/api/shelters/${shelterId}/animals/${animal.id}/home`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ note: homeNote.trim() || undefined }),
		});
		if (response.ok) {
			status = "found_home";
			confirmHome = false;
		} else {
			error = m.error_generic();
		}
	}

	async function remove() {
		if (!animal) return;
		if (!confirm(m.shelter_animal_delete_confirm())) return;
		const response = await fetch(`/api/shelters/${shelterId}/animals/${animal.id}`, {
			method: "DELETE",
		});
		if (response.ok) {
			await goto("/shelter/animals");
		} else {
			error = m.shelter_animal_delete_blocked();
		}
	}

	function closePreviewOnKey(event: KeyboardEvent) {
		if (event.key === "Escape") previewOpen = false;
	}

	function careFields(draft: Draft) {
		return [
			{
				id: "vaccinated",
				label: m.shelter_field_vaccinated(),
				value: draft.vaccinated,
				set: (value: Triad | "") => (draft.vaccinated = value),
			},
			{
				id: "neutered",
				label: neuteredFieldLabel(draft.sex),
				value: draft.neutered,
				set: (value: Triad | "") => (draft.neutered = value),
			},
			{
				id: "chipped",
				label: m.shelter_field_chipped(),
				value: draft.chipped,
				set: (value: Triad | "") => (draft.chipped = value),
			},
			{
				id: "house",
				label: m.shelter_field_house(),
				value: draft.houseTrained,
				set: (value: Triad | "") => (draft.houseTrained = value),
			},
		];
	}
</script>

<svelte:window onkeydown={closePreviewOnKey} />

{#snippet draftFields(draft: Draft, prefix: string, section: "basics" | "story" | "care")}
	{#if section === "basics"}
		<div class="grid gap-4 sm:grid-cols-2">
			<Input
				id="{prefix}-name"
				label={m.shelter_field_name()}
				required
				error={fieldError(prefix, "name")}
				bind:value={draft.name}
				disabled={readonly}
			/>
			<div class="flex flex-col gap-1.5">
				<label for="{prefix}-species" class="text-sm font-semibold text-sand-900"
					>{m.shelter_field_species()}
					<span class="text-coral-600" aria-hidden="true"> *</span></label
				>
				<select
					id="{prefix}-species"
					bind:value={draft.species}
					disabled={readonly}
					aria-invalid={fieldError(prefix, "species") ? true : undefined}
					aria-describedby={fieldError(prefix, "species") ? `${prefix}-species-error` : undefined}
					class={selectClass(Boolean(fieldError(prefix, "species")))}
					onchange={() => onSpeciesChange(draft)}
				>
					{#each speciesOptions as option (option)}
						<option value={option}>{speciesLabel(option)}</option>
					{/each}
				</select>
				{#if fieldError(prefix, "species")}
					<p id="{prefix}-species-error" class="text-sm text-coral-700">
						{fieldError(prefix, "species")}
					</p>
				{/if}
			</div>
			<div class="flex flex-col gap-1.5">
				<label for="{prefix}-breed" class="text-sm font-semibold text-sand-900"
					>{m.shelter_field_breed()}</label
				>
				<select
					id="{prefix}-breed"
					value={breedSelectValue(draft)}
					disabled={readonly}
					class={selectClass(false)}
					onchange={(event) => onBreedSelect(draft, event.currentTarget.value)}
				>
					<option value="">{m.shelter_unset()}</option>
					{#each breedsFor(draft.species) as option (option)}
						<option value={option}>{option}</option>
					{/each}
					<option value={BREED_OTHER}>{m.shelter_breed_other()}</option>
				</select>
				{#if breedSelectValue(draft) === BREED_OTHER}
					<Input
						id="{prefix}-breed-custom"
						label={m.shelter_breed_custom()}
						maxlength={80}
						bind:value={draft.breed}
						disabled={readonly}
					/>
				{/if}
			</div>
			<div class="flex flex-col gap-1.5">
				<label for="{prefix}-sex" class="text-sm font-semibold text-sand-900"
					>{m.shelter_field_sex()}
					{#if !creating}<span class="text-coral-600" aria-hidden="true"> *</span>{/if}</label
				>
				<select
					id="{prefix}-sex"
					bind:value={draft.sex}
					disabled={readonly}
					aria-invalid={fieldError(prefix, "sex") ? true : undefined}
					aria-describedby={fieldError(prefix, "sex") ? `${prefix}-sex-error` : undefined}
					class={selectClass(Boolean(fieldError(prefix, "sex")))}
				>
					<option value="">{m.shelter_unset()}</option>
					<option value="female">{m.shelter_sex_female()}</option>
					<option value="male">{m.shelter_sex_male()}</option>
					<option value="unknown">{m.shelter_unknown()}</option>
				</select>
				{#if fieldError(prefix, "sex")}
					<p id="{prefix}-sex-error" class="text-sm text-coral-700">{fieldError(prefix, "sex")}</p>
				{/if}
			</div>
			<Input
				id="{prefix}-age"
				label={m.shelter_field_age()}
				type="number"
				min="0"
				required={!creating}
				error={fieldError(prefix, "age")}
				bind:value={draft.ageMonths}
				disabled={readonly || draft.ageUnknown}
			/>
			<div class="flex flex-col gap-1.5">
				<span class="invisible text-sm font-semibold select-none" aria-hidden="true">&nbsp;</span>
				<div class="flex h-11 items-center">
					<Checkbox
						id="{prefix}-age-unknown"
						checked={draft.ageUnknown}
						disabled={readonly}
						onchange={(event) => (draft.ageUnknown = event.currentTarget.checked)}
					>
						{m.shelter_age_unknown()}
					</Checkbox>
				</div>
			</div>
			<div class="flex flex-col gap-1.5">
				<label for="{prefix}-size" class="text-sm font-semibold text-sand-900"
					>{m.shelter_field_size()}</label
				>
				<select
					id="{prefix}-size"
					bind:value={draft.size}
					disabled={readonly}
					class={selectClass(false)}
				>
					<option value="">{m.shelter_unset()}</option>
					<option value="s">S</option>
					<option value="m">M</option>
					<option value="l">L</option>
					<option value="xl">XL</option>
				</select>
			</div>
		</div>
		<p class="mt-3 text-sm text-sand-600">{m.shelter_location_inherited({ zip, city })}</p>
	{:else if section === "story"}
		<div class="flex flex-col gap-4">
			<Input
				id="{prefix}-tagline"
				label={m.shelter_field_tagline()}
				required={!creating}
				error={fieldError(prefix, "tagline")}
				bind:value={draft.tagline}
				disabled={readonly}
			/>
			<Input
				id="{prefix}-colors"
				label={m.shelter_field_colors()}
				hint={m.shelter_field_comma_hint()}
				bind:value={draft.colorsText}
				disabled={readonly}
			/>
			<Input
				id="{prefix}-traits"
				label={m.shelter_field_traits()}
				hint={m.shelter_field_comma_hint()}
				bind:value={draft.traitsText}
				disabled={readonly}
			/>
			<Textarea
				id="{prefix}-desc"
				label={m.shelter_field_description()}
				required={!creating}
				error={fieldError(prefix, "description")}
				bind:value={draft.description}
				disabled={readonly}
			/>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2">
			{#each careFields(draft) as field (field.id)}
				{@const careKey =
					field.id === "house"
						? "house_trained"
						: (field.id as Exclude<PublishField, "house_trained">)}
				{@const careError = fieldError(prefix, careKey)}
				<div class="flex flex-col gap-1.5">
					<label for="{prefix}-{field.id}" class="text-sm font-semibold text-sand-900"
						>{field.label}
						{#if !creating}<span class="text-coral-600" aria-hidden="true"> *</span>{/if}</label
					>
					<select
						id="{prefix}-{field.id}"
						value={field.value}
						disabled={readonly}
						aria-invalid={careError ? true : undefined}
						aria-describedby={careError ? `${prefix}-${field.id}-error` : undefined}
						onchange={(event) => field.set(event.currentTarget.value as Triad | "")}
						class={selectClass(Boolean(careError))}
					>
						<option value="">{m.shelter_unset()}</option>
						<option value="yes">{m.shelter_yes()}</option>
						<option value="no">{m.shelter_no()}</option>
						<option value="unknown">{m.shelter_unknown()}</option>
					</select>
					{#if careError}
						<p id="{prefix}-{field.id}-error" class="text-sm text-coral-700">{careError}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
{/snippet}

<form
	class="flex flex-col gap-6 {creating ? 'mx-auto w-full max-w-xl' : ''}"
	novalidate
	onsubmit={async (event) => {
		event.preventDefault();
		if (wizard && current !== "review") {
			next();
			return;
		}
		await save();
	}}
>
	{#if wizard}
		<p class="text-sm font-semibold text-sand-600">
			{m.wizard_step({ current: step + 1, total })}
		</p>
		<ol class="flex gap-2" aria-hidden="true">
			{#each steps as _, index (index)}
				<li class="h-1.5 flex-1 rounded-full {index <= step ? 'bg-coral-600' : 'bg-sand-200'}"></li>
			{/each}
		</ol>
	{/if}

	{#if creating}
		<fieldset class="wizard-step" class:hidden={!show("type")}>
			<legend class="mb-3 text-lg font-bold text-sand-950">{m.shelter_wizard_type_title()}</legend>
			<p class="mb-4 text-sm text-sand-700">{m.shelter_wizard_type_subtitle()}</p>
			<div class="grid gap-3 sm:grid-cols-2">
				<label
					class="flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-4 transition-colors focus-within:ring-2 focus-within:ring-coral-600 focus-within:ring-offset-2 {kind ===
					'single'
						? 'border-coral-600 bg-coral-50'
						: 'border-sand-200 bg-white hover:border-sand-300'}"
				>
					<input
						type="radio"
						name="animal-kind"
						value="single"
						checked={kind === "single"}
						onchange={() => onKind("single")}
						class="sr-only"
						disabled={readonly}
					/>
					<PawPrint class="size-6 text-coral-700" aria-hidden="true" />
					<span class="text-sm font-bold text-sand-950">{m.shelter_wizard_type_single()}</span>
					<span class="text-xs text-sand-600">{m.shelter_wizard_type_single_hint()}</span>
				</label>
				<label
					class="flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-4 transition-colors focus-within:ring-2 focus-within:ring-coral-600 focus-within:ring-offset-2 {kind ===
					'pair'
						? 'border-coral-600 bg-coral-50'
						: 'border-sand-200 bg-white hover:border-sand-300'}"
				>
					<input
						type="radio"
						name="animal-kind"
						value="pair"
						checked={kind === "pair"}
						onchange={() => onKind("pair")}
						class="sr-only"
						disabled={readonly}
					/>
					<Heart class="size-6 text-coral-700" aria-hidden="true" />
					<span class="text-sm font-bold text-sand-950">{m.shelter_wizard_type_pair()}</span>
					<span class="text-xs text-sand-600">{m.shelter_wizard_type_pair_hint()}</span>
				</label>
			</div>
		</fieldset>

		<fieldset
			class="wizard-step flex flex-col gap-4"
			class:hidden={kind !== "pair" || !show("partner")}
		>
			<legend class="text-lg font-bold text-sand-950">{m.shelter_animal_pair()}</legend>
			<p class="text-sm text-sand-700">{m.shelter_animal_pair_hint()}</p>
			<ul class="flex flex-col gap-3">
				{#each companions as entry, index (entry.key)}
					<li class="rounded-xl border border-sand-200 bg-white p-4">
						<div class="mb-3 flex items-center justify-between gap-2">
							<p class="text-sm font-bold text-sand-950">
								{m.shelter_wizard_partner_name()}
								{index + 1}
							</p>
							{#if companions.length > 1 && !readonly}
								<button
									type="button"
									class="text-xs font-semibold text-coral-800"
									onclick={() => removeCompanion(index)}
								>
									{m.shelter_wizard_partner_remove()}
								</button>
							{/if}
						</div>
						<div class="grid gap-3 sm:grid-cols-2">
							<label
								class="flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-3 transition-colors {entry.mode ===
								'new'
									? 'border-coral-600 bg-coral-50'
									: 'border-sand-200 bg-white hover:border-sand-300'}"
							>
								<input
									type="radio"
									name="partner-mode-{entry.key}"
									value="new"
									checked={entry.mode === "new"}
									onchange={() => setCompanionMode(index, "new")}
									class="sr-only"
									disabled={readonly}
								/>
								<span class="text-sm font-bold text-sand-950">{m.shelter_wizard_partner_new()}</span
								>
							</label>
							<label
								class="flex cursor-pointer flex-col gap-1 rounded-xl border-2 p-3 transition-colors {entry.mode ===
								'existing'
									? 'border-coral-600 bg-coral-50'
									: 'border-sand-200 bg-white hover:border-sand-300'} {existingChoices(index)
									.length === 0
									? 'pointer-events-none opacity-50'
									: ''}"
							>
								<input
									type="radio"
									name="partner-mode-{entry.key}"
									value="existing"
									checked={entry.mode === "existing"}
									onchange={() => setCompanionMode(index, "existing")}
									class="sr-only"
									disabled={readonly || existingChoices(index).length === 0}
								/>
								<span class="text-sm font-bold text-sand-950"
									>{m.shelter_wizard_partner_existing()}</span
								>
							</label>
						</div>
						{#if entry.mode === "existing"}
							{#if existingChoices(index).length === 0}
								<p class="mt-3 text-sm text-sand-600">{m.shelter_wizard_partner_empty()}</p>
							{:else}
								<div class="mt-3 flex flex-col gap-1.5">
									<label
										for="an-partner-pick-{entry.key}"
										class="text-sm font-semibold text-sand-900"
										>{m.shelter_wizard_partner_pick()}</label
									>
									<select
										id="an-partner-pick-{entry.key}"
										value={entry.id}
										disabled={readonly}
										onchange={(event) => {
											const current = companions[index];
											if (current?.mode === "existing") {
												current.id = event.currentTarget.value;
											}
										}}
										class="h-11 rounded-xl border border-sand-300 bg-white px-3.5 focus-ring"
									>
										<option value="">{m.shelter_unset()}</option>
										{#each existingChoices(index) as row (row.id)}
											<option value={row.id}>{row.name} {speciesLabel(row.species)}</option>
										{/each}
									</select>
								</div>
							{/if}
						{/if}
					</li>
				{/each}
			</ul>
			{#if !readonly && companions.length < 99}
				<button
					type="button"
					class="self-start text-sm font-semibold text-coral-800"
					onclick={addCompanion}
				>
					{m.shelter_wizard_partner_add()}
				</button>
			{/if}
		</fieldset>
	{/if}

	<section
		class="wizard-step rounded-2xl border border-sand-200 bg-white p-5"
		class:hidden={!show("basics")}
	>
		<h2 class="text-lg font-bold text-sand-950">{m.shelter_animal_basics()}</h2>
		<div class="mt-4">
			{@render draftFields(primary, "an", "basics")}
		</div>
	</section>

	<section
		class="wizard-step rounded-2xl border border-sand-200 bg-white p-5"
		class:hidden={!show("story")}
	>
		<h2 class="text-lg font-bold text-sand-950">{m.shelter_animal_story()}</h2>
		<div class="mt-4">
			{@render draftFields(primary, "an", "story")}
		</div>
	</section>

	<section
		class="wizard-step rounded-2xl border border-sand-200 bg-white p-5"
		class:hidden={!show("care")}
	>
		<h2 class="text-lg font-bold text-sand-950">{m.shelter_animal_care()}</h2>
		<div class="mt-4">
			{@render draftFields(primary, "an", "care")}
		</div>
		{#if !creating}
			<label class="mt-4 flex items-center gap-2 text-sm text-sand-800">
				<input type="checkbox" bind:checked={bonded} disabled={readonly} />
				{m.shelter_field_bonded()}
			</label>
			{#if bonded}
				<div class="mt-3 flex flex-col gap-3">
					{#if selectedPartnerIds.length}
						<ul class="flex flex-col gap-2">
							{#each selectedPartnerIds as id (id)}
								{@const row = partnerChoices.find((entry) => entry.id === id)}
								<li class="flex items-center justify-between gap-2 rounded-xl bg-sand-50 px-3 py-2">
									<span class="text-sm font-semibold text-sand-900">
										{row ? `${row.name} ${speciesLabel(row.species)}` : id}
									</span>
									{#if !readonly}
										<button
											type="button"
											class="text-xs font-semibold text-coral-800"
											onclick={() => removeSelectedPartner(id)}
										>
											{m.shelter_wizard_partner_remove()}
										</button>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
					{#if partnerChoices.length}
						<div class="flex flex-col gap-1.5">
							<label for="an-partner-edit" class="text-sm font-semibold text-sand-900"
								>{m.shelter_wizard_partner_add()}</label
							>
							<select
								id="an-partner-edit"
								value=""
								disabled={readonly}
								onchange={(event) => {
									addSelectedPartner(event.currentTarget.value);
									event.currentTarget.value = "";
								}}
								class="h-11 rounded-xl border border-sand-300 bg-white px-3.5 focus-ring"
							>
								<option value="">{m.shelter_unset()}</option>
								{#each partnerChoices.filter((row) => !selectedPartnerIds.includes(row.id)) as row (row.id)}
									<option value={row.id}>{row.name} {speciesLabel(row.species)}</option>
								{/each}
							</select>
						</div>
					{/if}
					{#if !selectedPartnerIds.length}
						<Input
							id="an-partner"
							label={m.shelter_field_partner()}
							bind:value={bondedPartner}
							disabled={readonly}
						/>
					{/if}
				</div>
			{/if}
		{/if}
	</section>

	{#if creating && kind === "pair"}
		{#each companions as entry, index (entry.key)}
			{#if entry.mode === "new"}
				<section
					class="wizard-step rounded-2xl border border-sand-200 bg-white p-5"
					class:hidden={!show(`partner_basics_${index}`)}
				>
					<h2 class="text-lg font-bold text-sand-950">
						{m.shelter_animal_basics()}
						{entry.draft.name.trim() || m.shelter_wizard_partner_name()}
					</h2>
					<div class="mt-4">
						{@render draftFields(entry.draft, `bn-${entry.key}`, "basics")}
					</div>
				</section>
				<section
					class="wizard-step rounded-2xl border border-sand-200 bg-white p-5"
					class:hidden={!show(`partner_story_${index}`)}
				>
					<h2 class="text-lg font-bold text-sand-950">
						{m.shelter_animal_story()}
						{entry.draft.name.trim() || m.shelter_wizard_partner_name()}
					</h2>
					<div class="mt-4">
						{@render draftFields(entry.draft, `bn-${entry.key}`, "story")}
					</div>
				</section>
				<section
					class="wizard-step rounded-2xl border border-sand-200 bg-white p-5"
					class:hidden={!show(`partner_care_${index}`)}
				>
					<h2 class="text-lg font-bold text-sand-950">
						{m.shelter_animal_care()}
						{entry.draft.name.trim() || m.shelter_wizard_partner_name()}
					</h2>
					<div class="mt-4">
						{@render draftFields(entry.draft, `bn-${entry.key}`, "care")}
					</div>
				</section>
			{/if}
		{/each}
	{/if}

	{#if creating}
		<section class="wizard-step flex flex-col gap-4" class:hidden={!show("review")}>
			<h2 class="text-lg font-bold text-sand-950">{m.wizard_review_title()}</h2>
			<p class="text-sm text-sand-700">{m.wizard_review_subtitle()}</p>
			<div class="rounded-2xl border border-sand-200 bg-white p-5">
				<p class="text-xs font-semibold tracking-wide text-sand-500 uppercase">
					{m.shelter_animal_basics()}
				</p>
				<p class="mt-1 font-bold text-sand-950">{primary.name.trim() || "—"}</p>
				<p class="text-sm text-sand-700">
					{speciesLabel(primary.species)}
					{#if primary.sex}
						{sexLabel(primary.sex)}{/if}
				</p>
				{#if primary.tagline.trim()}
					<p class="mt-2 text-sm text-sand-700">{primary.tagline.trim()}</p>
				{/if}
				{#if kind === "pair" && partnerName()}
					<p class="mt-3 text-sm font-semibold text-coral-800">
						{m.shelter_wizard_review_pair({ name: partnerName() })}
					</p>
				{/if}
			</div>
			<p class="text-sm text-sand-600">{m.shelter_photos_hint()}</p>
		</section>
	{/if}

	{#if animal}
		<section
			class="rounded-2xl border bg-white p-5 {missing.includes('photos')
				? 'border-coral-600'
				: 'border-sand-200'}"
		>
			<h2 class="text-lg font-bold text-sand-950">
				{m.shelter_photos_title()}
				<span class="text-coral-600" aria-hidden="true"> *</span>
			</h2>
			<p class="mt-1 text-sm text-sand-600">{m.shelter_photos_hint()}</p>
			{#if missing.includes("photos")}
				<p class="mt-1 text-sm text-coral-700">{m.shelter_publish_required()}</p>
			{/if}
			<ul class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
				{#each photos as key, index (key)}
					<li class="relative">
						<img
							src={photoUrl(shelterId, animal.id, key)}
							alt=""
							class="aspect-square w-full rounded-xl object-cover"
						/>
						{#if !readonly}
							<div class="absolute inset-x-1 bottom-1 flex justify-between gap-1">
								<button
									type="button"
									class="rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-sand-800 disabled:opacity-40"
									disabled={index === 0}
									onclick={() => movePhoto(index, -1)}
								>
									{m.shelter_photo_up()}
								</button>
								<button
									type="button"
									class="rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-sand-800 disabled:opacity-40"
									disabled={index === photos.length - 1}
									onclick={() => movePhoto(index, 1)}
								>
									{m.shelter_photo_down()}
								</button>
							</div>
							<button
								type="button"
								class="absolute top-1 right-1 rounded-full bg-white/90 px-2 py-1 text-xs font-semibold text-coral-800"
								onclick={() => removePhoto(key)}
							>
								{m.shelter_photo_delete()}
							</button>
						{/if}
					</li>
				{/each}
			</ul>
			{#if !readonly && photos.length < 8}
				<label class="mt-3 inline-flex">
					<span class="sr-only">{m.shelter_photo_add()}</span>
					<input
						type="file"
						accept="image/jpeg,image/png,image/webp"
						class="sr-only"
						onchange={onPhoto}
					/>
					<span
						class="inline-flex h-10 cursor-pointer items-center rounded-full bg-peach-200 px-4 text-sm font-semibold text-coral-950"
					>
						{m.shelter_photo_add()}
					</span>
				</label>
			{/if}
		</section>
	{/if}

	{#if error || stepError || missing.length}
		<FormStatus type="error">
			{error ||
				(missing.length
					? m.shelter_publish_missing({
							fields: missing.map(publishFieldLabel).join(", "),
						})
					: m.error_invalid_input())}
		</FormStatus>
	{:else if saved}
		<FormStatus type="success">{m.shelter_saved()}</FormStatus>
	{/if}

	{#if wizard}
		<div class="flex flex-col gap-3">
			{#if current === "review"}
				{#if !readonly}
					<Button type="submit" fullWidth loading={saving}>{m.shelter_wizard_create()}</Button>
				{/if}
			{:else}
				<Button type="button" fullWidth onclick={next}>{m.wizard_next()}</Button>
			{/if}
			{#if step > 0}
				<Button type="button" variant="ghost" fullWidth onclick={back}>{m.wizard_back()}</Button>
			{/if}
		</div>
	{:else}
		<div class="flex flex-wrap gap-2">
			{#if !readonly}
				<Button type="submit" loading={saving}>{m.profile_save()}</Button>
			{/if}
			<Button type="button" variant="outline" onclick={() => (previewOpen = true)}>
				{m.shelter_preview()}
			</Button>
			{#if !readonly && animal && status === "draft"}
				<Button
					type="button"
					variant="secondary"
					disabled={!verified}
					title={!verified ? m.shelter_publish_pending() : undefined}
					onclick={publish}
				>
					{m.shelter_publish()}
				</Button>
				<Button type="button" variant="ghost" onclick={remove}>{m.shelter_animal_delete()}</Button>
			{/if}
			{#if !readonly && animal && status === "live"}
				<Button type="button" variant="outline" onclick={() => (confirmUnpublish = true)}>
					{m.shelter_unpublish()}
				</Button>
				<Button type="button" variant="secondary" onclick={() => (confirmHome = true)}>
					{m.shelter_found_home()}
				</Button>
			{/if}
			{#if !readonly && animal && status === "found_home"}
				<Button type="button" variant="secondary" onclick={() => void cloneListing()}>
					{m.shelter_animal_clone()}
				</Button>
			{/if}
		</div>
	{/if}
</form>

{#if previewOpen}
	<div
		class="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-sand-950/50 p-4"
		onclick={(event) => {
			if (event.currentTarget === event.target) previewOpen = false;
		}}
		role="presentation"
	>
		<div
			class="my-4 w-full max-w-2xl rounded-3xl bg-peach-50 p-4 shadow-xl sm:p-6"
			role="dialog"
			aria-modal="true"
			aria-label={m.shelter_preview_title()}
		>
			<div class="mb-3 flex items-start justify-between gap-3">
				<p class="text-sm font-semibold text-sand-700">{m.shelter_preview_title()}</p>
				<Button type="button" variant="ghost" size="sm" onclick={() => (previewOpen = false)}>
					{m.shelter_preview_close()}
				</Button>
			</div>
			<AnimalDetail animal={previewAnimal} preview showBack={false} />
		</div>
	</div>
{/if}

{#if confirmUnpublish}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-sand-950/40 p-4">
		<div class="w-full max-w-md rounded-2xl bg-white p-6">
			<p class="font-semibold text-sand-950">{m.shelter_unpublish_confirm()}</p>
			<div class="mt-4 flex gap-2">
				<Button onclick={unpublish}>{m.shelter_unpublish()}</Button>
				<Button variant="ghost" onclick={() => (confirmUnpublish = false)}
					>{m.shelter_interest_cancel()}</Button
				>
			</div>
		</div>
	</div>
{/if}

{#if confirmHome}
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-sand-950/40 p-4">
		<div class="w-full max-w-md rounded-2xl bg-white p-6">
			<p class="font-semibold text-sand-950">{m.shelter_home_confirm()}</p>
			<div class="mt-3">
				<Input id="home-note" label={m.shelter_home_note()} bind:value={homeNote} />
			</div>
			<div class="mt-4 flex gap-2">
				<Button onclick={markHome}>{m.shelter_found_home()}</Button>
				<Button variant="ghost" onclick={() => (confirmHome = false)}
					>{m.shelter_interest_cancel()}</Button
				>
			</div>
		</div>
	</div>
{/if}
