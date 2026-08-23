import type { PublicUser, ShelterMembershipSummary, User } from "../types";

export function toPublicUser(
  row: User,
  memberships: ShelterMembershipSummary[] = [],
): PublicUser {
  return {
    id: row.id,
    name: row.name,
    displayName: row.displayName,
    email: row.email,
    hasAvatar: Boolean(row.avatarKey),
    platform_role: row.platformRole,
    suspended_at: row.suspendedAt ? row.suspendedAt.toISOString() : null,
    street: row.street,
    zip: row.zip,
    city: row.city,
    lat: row.lat,
    lng: row.lng,
    home_query: row.homeQuery,
    home_label: row.homeLabel,
    home_country: row.homeCountry,
    home_lat: row.homeLat,
    home_lng: row.homeLng,
    location_precision: row.locationPrecision,
    max_range_km: row.maxRangeKm,
    preferences: row.preferences ?? null,
    memberships,
  };
}
