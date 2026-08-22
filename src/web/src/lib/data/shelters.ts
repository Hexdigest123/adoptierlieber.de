export type Shelter = {
	id: string;
	name: string;
	city: string;
	lat: number;
	lng: number;
};

/** Placeholder shelters for the landing-page map. One per dummy-animal city. */
export const shelters: Shelter[] = [
	{ id: "berlin", name: "Tierheim Pankow", city: "Berlin", lat: 52.52, lng: 13.405 },
	{ id: "hamburg", name: "Tierheim Süderelbe", city: "Hamburg", lat: 53.5511, lng: 9.9937 },
	{ id: "muenchen", name: "Tierschutzverein München", city: "München", lat: 48.1351, lng: 11.582 },
	{ id: "koeln", name: "Kölner Tierschutz", city: "Köln", lat: 50.9375, lng: 6.9603 },
	{ id: "leipzig", name: "Tierheim Leipzig-Ost", city: "Leipzig", lat: 51.3397, lng: 12.3731 },
	{ id: "dresden", name: "Tierschutz Dresden", city: "Dresden", lat: 51.0504, lng: 13.7373 },
	{ id: "hannover", name: "Tierheim Bothfeld", city: "Hannover", lat: 52.3759, lng: 9.732 },
	{ id: "nuernberg", name: "Nürnberger Tierschutz", city: "Nürnberg", lat: 49.4521, lng: 11.0767 },
];

export function shelterById(id: string): Shelter | undefined {
	return shelters.find((shelter) => shelter.id === id);
}
