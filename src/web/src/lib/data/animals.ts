import { m } from "$lib/paraglide/messages";

export type Animal = {
	id: string;
	name: string;
	image: string;
	/** Localized species label. */
	species: () => string;
	/** Localized age label. */
	age: () => string;
	location: string;
	shelterId: string;
	lat: number;
	lng: number;
	/** Localized tagline. */
	tagline: () => string;
};

/** Placeholder animals for the landing-page showcase deck and map. */
export const animals: Animal[] = [
	{
		id: "findus",
		name: "Findus",
		image: "/animals/cat-1.svg",
		species: () => m.species_cat(),
		age: () => m.animal_age_years({ count: 3 }),
		location: "Berlin",
		shelterId: "berlin",
		lat: 52.528,
		lng: 13.418,
		tagline: () => m.animal_1_tagline(),
	},
	{
		id: "balu",
		name: "Balu",
		image: "/animals/dog-1.svg",
		species: () => m.species_dog(),
		age: () => m.animal_age_years({ count: 2 }),
		location: "Hamburg",
		shelterId: "hamburg",
		lat: 53.559,
		lng: 10.008,
		tagline: () => m.animal_2_tagline(),
	},
	{
		id: "hoppel",
		name: "Hoppel",
		image: "/animals/rabbit-1.svg",
		species: () => m.species_rabbit(),
		age: () => m.animal_age_months({ count: 8 }),
		location: "München",
		shelterId: "muenchen",
		lat: 48.143,
		lng: 11.596,
		tagline: () => m.animal_3_tagline(),
	},
	{
		id: "kruemel",
		name: "Krümel",
		image: "/animals/guinea-pig-1.svg",
		species: () => m.species_guinea_pig(),
		age: () => m.animal_age_years({ count: 1 }),
		location: "Köln",
		shelterId: "koeln",
		lat: 50.945,
		lng: 6.974,
		tagline: () => m.animal_4_tagline(),
	},
	{
		id: "rio",
		name: "Rio",
		image: "/animals/parrot-1.svg",
		species: () => m.species_parrot(),
		age: () => m.animal_age_years({ count: 5 }),
		location: "Leipzig",
		shelterId: "leipzig",
		lat: 51.3475,
		lng: 12.387,
		tagline: () => m.animal_5_tagline(),
	},
	{
		id: "minka",
		name: "Minka",
		image: "/animals/cat-2.svg",
		species: () => m.species_cat(),
		age: () => m.animal_age_years({ count: 7 }),
		location: "Dresden",
		shelterId: "dresden",
		lat: 51.058,
		lng: 13.751,
		tagline: () => m.animal_6_tagline(),
	},
	{
		id: "paula",
		name: "Paula",
		image: "/animals/dog-2.svg",
		species: () => m.species_dog(),
		age: () => m.animal_age_months({ count: 10 }),
		location: "Hannover",
		shelterId: "hannover",
		lat: 52.3835,
		lng: 9.746,
		tagline: () => m.animal_7_tagline(),
	},
	{
		id: "max",
		name: "Max",
		image: "/animals/rabbit-2.svg",
		species: () => m.species_rabbit(),
		age: () => m.animal_age_years({ count: 2 }),
		location: "Nürnberg",
		shelterId: "nuernberg",
		lat: 49.46,
		lng: 11.09,
		tagline: () => m.animal_8_tagline(),
	},
];
