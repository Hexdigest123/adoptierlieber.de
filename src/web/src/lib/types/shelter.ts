export type VerificationStatus = "pending" | "verified" | "rejected";
export type AnimalStatus = "draft" | "live" | "found_home";
export type AnimalSpecies = "cat" | "dog" | "rabbit" | "guinea_pig" | "bird" | "reptile" | "other";
export type AnimalSex = "male" | "female" | "unknown";
export type AnimalSize = "s" | "m" | "l" | "xl";
export type Triad = "yes" | "no" | "unknown";
export type ApplicationFieldType = "short" | "long" | "select" | "yesno";

export type ApplicationField = {
	id: string;
	type: ApplicationFieldType;
	label: string;
	required: boolean;
	options?: string[];
	hidden?: boolean;
};

export type ShelterChecklist = {
	profile?: boolean;
	team?: boolean;
	notify?: boolean;
	form?: boolean;
	first_animal?: boolean;
	dismissed?: boolean;
};

export type StaffShelter = {
	id: string;
	org_name: string;
	street: string;
	zip: string;
	city: string;
	website: string | null;
	registration_number: string | null;
	description: string | null;
	verification_status: VerificationStatus;
	verification_reason: string | null;
	notify_email: string | null;
	notify_last_error: string | null;
	has_logo: boolean;
	lat: number | null;
	lng: number | null;
	geocoded_at: string | null;
	application_form: ApplicationField[];
	checklist: ShelterChecklist;
	created_at: string;
};

export type StaffAnimal = {
	id: string;
	shelter_id: string;
	name: string;
	species: AnimalSpecies;
	breed: string | null;
	sex: AnimalSex | null;
	age_months: number | null;
	age_unknown: boolean;
	size: AnimalSize | null;
	colors: string[];
	traits: string[];
	tagline: string | null;
	description: string | null;
	photos: string[];
	status: AnimalStatus;
	vaccinated: Triad | null;
	neutered: Triad | null;
	chipped: Triad | null;
	house_trained: Triad | null;
	bonded_partner: string | null;
	bonded_animal_id: string | null;
	bond_group_id: string | null;
	bonded_partners: { id: string; name: string }[];
	like_count: number;
	impression_count: number;
	published_at: string | null;
	found_home_at: string | null;
	found_home_note: string | null;
	created_at: string;
	updated_at: string;
	unread_threads: number;
	thread_count: number;
};

export type ShelterDashboard = {
	shelter: StaffShelter;
	kpis: {
		live: number;
		drafts: number;
		found_home: number;
		new_threads: number;
		unread: number;
		likes: number;
		impressions_7d: number;
	};
	recent_threads: {
		id: string;
		animal_id: string;
		animal_name: string;
		animal_photo: string | null;
		adopter_name: string;
		last_message_at: string;
		unread: boolean;
	}[];
	attention: { kind: string; animal_id?: string; thread_id?: string }[];
};

export type ShelterMemberRow = {
	user_id: string;
	name: string;
	display_name: string | null;
	email: string;
	has_avatar: boolean;
	role: number;
	joined_at: string;
};

export type ShelterInviteRow = {
	id: string;
	email: string;
	role: number;
	expires_at: string;
	created_at: string;
};

export type ChatThread = {
	id: string;
	shelter_id: string;
	animal_id: string;
	animal_name: string;
	animal_photo: string | null;
	animal_status: string | null;
	adopter_user_id: string;
	adopter_name: string;
	adopter_has_avatar: boolean;
	created_at: string;
	last_message_at: string;
	last_preview: string | null;
	unread_for_shelter: boolean;
	unread_for_me: boolean;
	unread_for_adopter: boolean;
	archived: boolean;
	assigned_user_id: string | null;
	assigned_name: string | null;
	email_granted: boolean;
	profile_granted: boolean;
	shelter_name: string;
};

export type ChatThreadDetail = ChatThread & {
	prior: { id: string; animal_id: string; animal_name: string; last_message_at: string }[];
	grant?: {
		email: string | null;
		profile: {
			display_name: string;
			city: string | null;
			zip: string | null;
			preferences: Record<string, unknown> | null;
		} | null;
		granted_at: string | null;
	};
};

export type ChatMessage = {
	id: string;
	thread_id: string;
	author_user_id: string | null;
	kind: "user" | "system";
	body: string;
	created_at: string;
};

export type InterestContext = {
	animal_id: string;
	animal_name: string;
	shelter_id: string;
	org_name: string;
	city: string;
	thread_id: string | null;
	other_animals: string[];
	fields: ApplicationField[];
};

export const PUBLISH_FIELDS = [
	"name",
	"species",
	"photos",
	"age",
	"sex",
	"tagline",
	"description",
	"vaccinated",
	"neutered",
	"chipped",
	"house_trained",
] as const;

export type PublishField = (typeof PUBLISH_FIELDS)[number];

export function isPublishField(value: string): value is PublishField {
	return (PUBLISH_FIELDS as readonly string[]).includes(value);
}

export function publishMissing(input: {
	name: string;
	species: string;
	photos: string[];
	ageUnknown: boolean;
	ageMonths: string | number | null;
	sex: string | null;
	tagline: string | null;
	description: string | null;
	vaccinated: string | null;
	neutered: string | null;
	chipped: string | null;
	houseTrained: string | null;
}): PublishField[] {
	const missing: PublishField[] = [];
	if (!input.name.trim()) missing.push("name");
	if (!input.species) missing.push("species");
	if (!input.photos.length) missing.push("photos");
	const ageMonths =
		typeof input.ageMonths === "string"
			? input.ageMonths.trim() === ""
				? null
				: Number(input.ageMonths)
			: input.ageMonths;
	if (!input.ageUnknown && ageMonths == null) missing.push("age");
	if (!input.sex) missing.push("sex");
	if (!input.tagline?.trim()) missing.push("tagline");
	if (!input.description?.trim()) missing.push("description");
	if (!input.vaccinated) missing.push("vaccinated");
	if (!input.neutered) missing.push("neutered");
	if (!input.chipped) missing.push("chipped");
	if (!input.houseTrained) missing.push("house_trained");
	return missing;
}

export function parsePublishMissing(message?: string): PublishField[] {
	if (!message?.startsWith("missing ")) return [];
	return message
		.slice("missing ".length)
		.split(",")
		.map((value) => value.trim())
		.filter(isPublishField);
}

export function photoSlot(key: string): string {
	return key.split("/").at(-1) ?? "0";
}

export function photoUrl(shelterId: string, animalId: string, key: string): string {
	return `/api/shelters/${shelterId}/animals/${animalId}/photos/${photoSlot(key)}`;
}
