import { m } from "$lib/paraglide/messages";
import type { AnimalSex, AnimalSize, AnimalSpecies, Practical } from "$lib/types/catalog";

export function speciesLabel(species: AnimalSpecies): string {
	switch (species) {
		case "cat":
			return m.species_cat();
		case "dog":
			return m.species_dog();
		case "rabbit":
			return m.species_rabbit();
		case "guinea_pig":
			return m.species_guinea_pig();
		case "bird":
			return m.species_bird();
		case "reptile":
			return m.species_reptile();
		case "other":
			return m.species_other();
	}
}

export function chipLabel(id: string): string {
	switch (id) {
		case "dog":
			return m.app_species_dog();
		case "cat":
			return m.app_species_cat();
		case "small":
			return m.app_species_small();
		case "bird":
			return m.app_species_bird();
		case "reptile":
			return m.app_species_reptile();
		case "other":
			return m.app_species_other();
		default:
			return id;
	}
}

export function ageLabel(months: number | null, unknown: boolean): string {
	if (unknown || months == null) return m.app_age_unknown();
	if (months < 12) return m.animal_age_months({ count: months });
	return m.animal_age_years({ count: Math.floor(months / 12) });
}

export function distanceLabel(km: number | null, city: string): string {
	if (km == null) return city;
	if (km < 1) return m.app_distance_m({ count: Math.max(50, Math.round(km * 1000)) });
	return m.app_distance_km({ count: Math.round(km) });
}

export function sexLabel(sex: AnimalSex): string {
	if (sex === "female") return m.app_sex_female();
	if (sex === "male") return m.app_sex_male();
	return m.app_sex_unknown();
}

export function sizeLabel(size: AnimalSize): string {
	if (size === "s") return m.app_size_s();
	if (size === "m") return m.app_size_m();
	if (size === "l") return m.app_size_l();
	if (size === "xl") return m.app_size_xl();
	return "";
}

export function practicalLabel(value: Practical): string {
	if (value === "yes") return m.app_yes();
	if (value === "no") return m.app_no();
	return m.app_unknown();
}

export function coverPhoto(photos: string[]): string | null {
	return photos[0] ?? null;
}
