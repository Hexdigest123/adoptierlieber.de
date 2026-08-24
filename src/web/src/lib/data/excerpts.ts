import { m } from "$lib/paraglide/messages";
import type { PublicExcerpt } from "$lib/types/catalog";
import { bondedNames, needTraits, speciesLabel } from "$lib/app/format";

export type ShowcaseCard = {
	id: string;
	name: string;
	image: string;
	species: string;
	age: string;
	location: string;
	shelterId: string;
	shelterName: string;
	tagline: string;
	needs: string[];
	bonded: string | null;
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
		tagline: item.tagline ?? "",
		needs: needTraits(item.traits ?? [], item.age_months, item.age_unknown),
		bonded: bondedNames(item.bonded_partners, item.bonded_partner),
	}));
}
