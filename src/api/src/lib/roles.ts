import { secretsEqual } from "./hashing";

// Platform privilege lives on users.platform_role, never on a membership.
// The DB rejects any other shelter_members.role value (migration 0016).
export const SHELTER_ROLE = {
  OWNER: 1,
  STAFF: 2,
} as const;

export type ShelterRole = (typeof SHELTER_ROLE)[keyof typeof SHELTER_ROLE];

export function isShelterRole(role: number): role is ShelterRole {
  return role === SHELTER_ROLE.OWNER || role === SHELTER_ROLE.STAFF;
}

export const PLATFORM_ROLE = {
  SUPER_ADMIN: 0,
  ADMIN: 1,
  USER: 2,
} as const;

export type PlatformRole = (typeof PLATFORM_ROLE)[keyof typeof PLATFORM_ROLE];

export type RoleSubject = {
  email: string;
  platformRole: number;
  emailVerifiedAt?: Date | null;
  passwordChangedAt?: Date | null;
};

// Ring semantics (x86-style): lower integer = more privilege.
// grant check: user.role <= requiredRole
export function hasPrivilege(role: number, requiredRole: number): boolean {
  return role <= requiredRole;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Comma-separated allowlist. Empty / unset = no break-glass. */
export function parseSuperAdminEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const emails: string[] = [];
  for (const part of raw.split(",")) {
    const email = normalizeEmail(part);
    if (!email || seen.has(email)) continue;
    seen.add(email);
    emails.push(email);
  }
  return emails;
}

export function isBreakGlassEmail(email: string, allowlist: readonly string[]): boolean {
  const needle = normalizeEmail(email);
  if (!needle || allowlist.length === 0) return false;
  let matched = false;
  for (const allowed of allowlist) {
    if (secretsEqual(needle, allowed)) matched = true;
  }
  return matched;
}

/**
 * Break-glass needs the password to be set on or after verification (reset
 * link, admin invite). A password from before that may belong to whoever
 * registered the address first, not to the inbox owner who clicked verify.
 */
export function passwordSetAfterVerification(subject: RoleSubject): boolean {
  if (!subject.emailVerifiedAt || !subject.passwordChangedAt) return false;
  return subject.passwordChangedAt.getTime() >= subject.emailVerifiedAt.getTime();
}

export function isSuperAdmin(subject: RoleSubject, allowlist: readonly string[]): boolean {
  if (subject.platformRole === PLATFORM_ROLE.SUPER_ADMIN) return true;
  if (!passwordSetAfterVerification(subject)) return false;
  return isBreakGlassEmail(subject.email, allowlist);
}

export function isPlatformAdmin(subject: RoleSubject, allowlist: readonly string[]): boolean {
  return hasPrivilege(subject.platformRole, PLATFORM_ROLE.ADMIN) || isSuperAdmin(subject, allowlist);
}

export function effectivePlatformRole(
  subject: RoleSubject,
  allowlist: readonly string[],
): number {
  return isSuperAdmin(subject, allowlist) ? PLATFORM_ROLE.SUPER_ADMIN : subject.platformRole;
}
