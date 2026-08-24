import type { AnimalSpecies } from "$lib/types/shelter";

export const BREED_OTHER = "__other__";

const MIX = "Mischling";

function listed(...names: string[]): readonly string[] {
	const rest = names
		.filter((name) => name !== MIX)
		.sort((a, b) => a.localeCompare(b, "de"));
	return [MIX, ...rest];
}

const BY_SPECIES: Record<AnimalSpecies, readonly string[]> = {
	dog: listed(
		"Akita",
		"American Staffordshire Terrier",
		"Australian Shepherd",
		"Beagle",
		"Berner Sennenhund",
		"Border Collie",
		"Boxer",
		"Cane Corso",
		"Chihuahua",
		"Cocker Spaniel",
		"Collie",
		"Dackel",
		"Deutsche Dogge",
		"Deutscher Schäferhund",
		"Dobermann",
		"Französische Bulldogge",
		"Golden Retriever",
		"Greyhound",
		"Havaneser",
		"Husky",
		"Jack Russell Terrier",
		"Labrador Retriever",
		"Malinois",
		"Malteser",
		"Mops",
		"Pinscher",
		"Podenco",
		"Pudel",
		"Rhodesian Ridgeback",
		"Rottweiler",
		"Schnauzer",
		"Shih Tzu",
		"Spitz",
		"Staffordshire Bullterrier",
		"Weimaraner",
		"Yorkshire Terrier",
	),
	cat: listed(
		"Abessinier",
		"Bengal",
		"Britisch Kurzhaar",
		"Europäisch Kurzhaar",
		"Europäisch Langhaar",
		"Heilige Birma",
		"Kartäuser",
		"Maine Coon",
		"Norwegische Waldkatze",
		"Orientalisch Kurzhaar",
		"Perser",
		"Ragdoll",
		"Russian Blue",
		"Scottish Fold",
		"Siam",
		"Sphynx",
	),
	rabbit: listed(
		"Angora",
		"Deutscher Riese",
		"Farbenzwerg",
		"Hermelin",
		"Löwenkopf",
		"Rex",
		"Satin",
		"Teddy",
		"Widder",
		"Zwergkaninchen",
		"Zwergwidder",
	),
	guinea_pig: listed(
		"Alpaka",
		"CH-Teddy",
		"Coronet",
		"Crested",
		"Glatthaar",
		"Peruaner",
		"Rex",
		"Rosette",
		"Sheltie",
		"US-Teddy",
	),
	bird: listed(
		"Agapornide",
		"Amazone",
		"Ara",
		"Graupapagei",
		"Huhn",
		"Kakadu",
		"Kanarienvogel",
		"Nymphensittich",
		"Sperlingspapagei",
		"Taube",
		"Wellensittich",
		"Zebrafink",
	),
	reptile: listed(
		"Bartagame",
		"Chamäleon",
		"Kornnatter",
		"Königsnatter",
		"Königspython",
		"Landschildkröte",
		"Leguan",
		"Leopardgecko",
		"Wasserschildkröte",
	),
	other: listed(
		"Chinchilla",
		"Degu",
		"Esel",
		"Frettchen",
		"Goldhamster",
		"Igel",
		"Minischwein",
		"Pferd",
		"Pony",
		"Ratte",
		"Schaf",
		"Ziege",
		"Zwerghamster",
	),
};

export function breedsFor(species: AnimalSpecies): readonly string[] {
	return BY_SPECIES[species];
}

export function isCuratedBreed(species: AnimalSpecies, breed: string): boolean {
	return breedsFor(species).includes(breed);
}

export function isKnownBreed(breed: string): boolean {
	return Object.values(BY_SPECIES).some((names) => names.includes(breed));
}
