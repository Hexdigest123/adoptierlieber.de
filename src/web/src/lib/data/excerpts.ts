import { m } from "$lib/paraglide/messages";
import type { PublicExcerpt } from "$lib/types/catalog";
import { speciesLabel } from "$lib/app/format";

export type ShowcaseCard = {
	id: string;
	name: string;
	image: string;
	species: string;
	age: string;
	location: string;
	shelterId: string;
	shelterName: string;
	lat: number | null;
	lng: number | null;
	tagline: string;
};

function ageFromMonths(months: number | null, unknown: boolean): string {
	if (unknown || months == null) return m.app_age_unknown();
	if (months < 12) return m.animal_age_months({ count: months });
	return m.animal_age_years({ count: Math.floor(months / 12) });
}

export function excerptsToCards(items: PublicExcerpt[]): ShowcaseCard[] {
	return items.map((item) => ({
		id: item.id,
		name: item.name,
		image: item.photos[0] ?? "",
		species: speciesLabel(item.species),
		age: ageFromMonths(item.age_months, item.age_unknown),
		location: item.shelter.city,
		shelterId: item.shelter.id,
		shelterName: item.shelter.org_name,
		lat: item.lat,
		lng: item.lng,
		tagline: item.tagline ?? "",
	}));
}
