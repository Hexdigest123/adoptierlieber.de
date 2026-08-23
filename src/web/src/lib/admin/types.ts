import type { AnimalSpecies } from "$lib/types/catalog";

export type ListEnvelope<T> = {
	items: T[];
	page: number;
	per_page: number;
	total: number;
};

export type AdminUserCard = {
	id: string;
	name: string;
	display_name: string | null;
	email: string;
	has_avatar: boolean;
	city: string | null;
	platform_role: number;
	suspended_at: string | null;
	email_verified_at: string | null;
	created_at: string;
};

export type AdminUserDetail = AdminUserCard & {
	street: string | null;
	zip: string | null;
	lat: number | null;
	lng: number | null;
	last_used_at: string | null;
	memberships: {
		shelter_id: string;
		org_name: string;
		role: number;
		verification_status: "pending" | "verified" | "rejected";
	}[];
};

export type AdminShelterCard = {
	id: string;
	org_name: string;
	city: string;
	zip: string;
	street: string;
	website: string | null;
	registration_number: string | null;
	verification_status: "pending" | "verified" | "rejected";
	created_at: string;
	has_logo: boolean;
	owner_id: string | null;
	owner_name: string | null;
	owner_email: string | null;
};

export type AdminShelterDetail = {
	id: string;
	org_name: string;
	street: string;
	zip: string;
	city: string;
	website: string | null;
	registration_number: string | null;
	description: string | null;
	verification_status: "pending" | "verified" | "rejected";
	verification_reason: string | null;
	verification_decided_at: string | null;
	verification_decided_by: string | null;
	lat: number | null;
	lng: number | null;
	archived_at: string | null;
	created_at: string;
	animal_count: number;
	has_logo: boolean;
	orphaned: boolean;
	members: {
		user_id: string;
		name: string;
		email: string;
		role: number;
		has_avatar: boolean;
	}[];
	animals: AdminShelterAnimal[];
};

export type AdminShelterAnimal = {
	id: string;
	name: string;
	species: AnimalSpecies;
	status: string;
	photos: string[];
	age_months: number | null;
	age_unknown: boolean;
	tagline: string | null;
	traits: string[];
};

export type AdminAnimalCard = AdminShelterAnimal & {
	created_at: string;
	shelter_id: string;
	shelter_name: string;
	city: string;
};

export type AdminAnimalDetail = AdminAnimalCard & {
	sex: string | null;
	description: string | null;
};

export type AdminBanRow = {
	hash: string;
	reason: string;
	created_at: string;
	banned_by: string | null;
	banned_by_name: string | null;
};

export type AdminAuditRow = {
	id: string;
	created_at: string;
	action: string;
	actor_id: string | null;
	actor_name: string;
	actor_email: string;
	target_type: string;
	target_id: string | null;
	target_label: string;
	reason: string | null;
};

export type AdminOverview = {
	users: number;
	suspended: number;
	shelters_pending: number;
	shelters_verified: number;
	shelters_rejected: number;
	animals: number;
	pending_applications: number;
	recent_audit: {
		id: string;
		created_at: string;
		action: string;
		actor_name: string;
		target_label: string;
		reason: string | null;
	}[];
};

export type AdminTeam = {
	items: {
		id: string;
		name: string;
		email: string;
		platform_role: number;
		created_at: string;
		has_avatar: boolean;
	}[];
	invites: {
		id: string;
		email: string;
		expires_at: string;
		created_at: string;
		invited_by: string | null;
	}[];
};

export type AdminNote = {
	id: string;
	author_id: string | null;
	author_name: string;
	body: string;
	created_at: string;
};

export type AdminReviewRow = {
	id: string;
	user_id: string;
	name: string;
	stars: number;
	body: string;
	status: "pending" | "approved";
	decided_at: string | null;
	decided_by: string | null;
	created_at: string;
};

export type InvitePreview = {
	email: string;
	expires_at: string;
	existing_user: boolean;
};
