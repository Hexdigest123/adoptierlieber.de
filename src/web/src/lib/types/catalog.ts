export type AnimalSpecies = "cat" | "dog" | "rabbit" | "guinea_pig" | "bird" | "reptile" | "other";

export type AnimalSex = "male" | "female" | "unknown" | null;
export type AnimalSize = "s" | "m" | "l" | "xl" | null;
export type Practical = "yes" | "no" | "unknown" | null;

export type PublicShelter = {
	id: string;
	org_name: string;
	city: string;
	zip: string;
	lat: number | null;
	lng: number | null;
};

export type PublicAnimal = {
	id: string;
	name: string;
	species: AnimalSpecies;
	breed: string | null;
	sex: AnimalSex;
	age_months: number | null;
	age_unknown: boolean;
	size: AnimalSize;
	colors: string[];
	traits: string[];
	tagline: string | null;
	description: string | null;
	photos: string[];
	status: "draft" | "live" | "found_home";
	vaccinated: Practical;
	neutered: Practical;
	chipped: Practical;
	house_trained: Practical;
	bonded_partner: string | null;
	bonded_animal_id: string | null;
	bond_group_id: string | null;
	bonded_partners: { id: string; name: string }[];
	like_count: number;
	impression_count: number;
	published_at: string | null;
	found_home_at: string | null;
	shelter: PublicShelter;
	lat: number | null;
	lng: number | null;
	distance_km: number | null;
	liked: boolean;
};

export type PublicExcerpt = {
	id: string;
	name: string;
	species: AnimalSpecies;
	age_months: number | null;
	age_unknown: boolean;
	tagline: string | null;
	photos: string[];
	shelter: {
		id: string;
		org_name: string;
		city: string;
	};
	lat: number | null;
	lng: number | null;
};

export type ListEnvelope<T> = {
	items: T[];
	page: number;
	per_page: number;
	total: number;
	in_range?: number;
};

export type GeocodeHit = {
	lat: number;
	lng: number;
	label: string;
	country: string | null;
};

export type PrefSpecies = "dog" | "cat" | "small" | "bird" | "open";

export type UserPreferences = {
	onboarded?: boolean;
	prefs_done?: boolean;
	species?: PrefSpecies | PrefSpecies[];
	home?: "apartment" | "house" | "yard";
	with?: Array<"kids" | "dog" | "cat" | "alone">;
	lifestyle?: "active" | "cuddle" | "first";
};

export const SPECIES_CHIPS: { id: string; species: AnimalSpecies[] }[] = [
	{ id: "dog", species: ["dog"] },
	{ id: "cat", species: ["cat"] },
	{ id: "small", species: ["rabbit", "guinea_pig"] },
	{ id: "bird", species: ["bird"] },
	{ id: "reptile", species: ["reptile"] },
	{ id: "other", species: ["other"] },
];

export const RANGE_STOPS = [5, 10, 15, 25, 50, 100, 200] as const;

export function listItems<T>(body: { items?: T[] | null } | null | undefined): T[] {
	return Array.isArray(body?.items) ? body.items : [];
}
