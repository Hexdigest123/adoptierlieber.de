import type { PublicUser, ShelterMembershipSummary, User } from "../types";
import { effectivePlatformRole } from "./roles";

export function toPublicUser(
  row: User,
  memberships: ShelterMembershipSummary[] = [],
  allowlist: readonly string[] = [],
  extras: {
    totp_enabled: boolean;
    passkey_count: number;
    mfa_required: boolean;
    session_kind: "full" | "setup";
  } = {
    totp_enabled: false,
    passkey_count: 0,
    mfa_required: false,
    session_kind: "full",
  },
): PublicUser {
  return {
    id: row.id,
    name: row.name,
    displayName: row.displayName,
    email: row.email,
    hasAvatar: Boolean(row.avatarKey),
    platform_role: effectivePlatformRole(row, allowlist),
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
    totp_enabled: extras.totp_enabled,
    passkey_count: extras.passkey_count,
    mfa_required: extras.mfa_required,
    session_kind: extras.session_kind,
  };
}
