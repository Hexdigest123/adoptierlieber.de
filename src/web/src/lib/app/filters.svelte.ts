import { SPECIES_CHIPS, type AnimalSpecies } from "$lib/types/catalog";

const STORAGE_KEY = "adoptierlieber.app.species";

function readStored(): AnimalSpecies[] {
	if (typeof sessionStorage === "undefined") return [];
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		const allowed = new Set(SPECIES_CHIPS.flatMap((chip) => chip.species));
		return parsed.filter((value): value is AnimalSpecies =>
			typeof value === "string" && allowed.has(value as AnimalSpecies),
		);
	} catch {
		return [];
	}
}

let species = $state<AnimalSpecies[]>([]);
let hydrated = false;

export function hydrateSpecies(): void {
	if (hydrated) return;
	hydrated = true;
	species = readStored();
}

export function selectedSpecies(): AnimalSpecies[] {
	return species;
}

export function setSelectedSpecies(next: AnimalSpecies[]): void {
	species = next;
	try {
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// private mode
	}
}

export function toggleChip(chipId: string): void {
	const chip = SPECIES_CHIPS.find((entry) => entry.id === chipId);
	if (!chip) return;
	const allOn = chip.species.every((s) => species.includes(s));
	if (allOn) {
		setSelectedSpecies(species.filter((s) => !chip.species.includes(s)));
	} else {
		setSelectedSpecies([...new Set([...species, ...chip.species])]);
	}
}

export function speciesQuery(): string {
	return species.join(",");
}

export function chipActive(chipId: string): boolean {
	const chip = SPECIES_CHIPS.find((entry) => entry.id === chipId);
	if (!chip) return false;
	return chip.species.every((s) => species.includes(s));
}
