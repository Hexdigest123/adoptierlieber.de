export type ShelterMembershipSummary = {
	shelter_id: string;
	org_name: string;
	role: number;
	verification_status: "pending" | "verified" | "rejected";
};

export type SessionUser = {
	id: string;
	name: string;
	displayName: string | null;
	email: string;
	hasAvatar: boolean;
	platform_role: number;
	suspended_at: string | null;
	street: string | null;
	zip: string | null;
	city: string | null;
	lat: number | null;
	lng: number | null;
	home_query: string | null;
	home_label: string | null;
	home_country: string | null;
	home_lat: number | null;
	home_lng: number | null;
	location_precision: "place" | "gps" | null;
	max_range_km: number | null;
	preferences: Record<string, unknown> | null;
	memberships: ShelterMembershipSummary[];
	totp_enabled: boolean;
	passkey_count: number;
	mfa_required: boolean;
	session_kind: "full" | "setup";
};
