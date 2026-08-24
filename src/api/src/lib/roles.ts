import { secretsEqual } from "./hashing";

export const SHELTER_ROLE = {
  // Unused leftover. Platform privilege lives on users.platform_role.
  // Do not assign this. New checks use PLATFORM_ROLE only.
  GLOBAL_ADMIN: 0,
  OWNER: 1,
  STAFF: 2,
} as const;

export type ShelterRole = (typeof SHELTER_ROLE)[keyof typeof SHELTER_ROLE];

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

export function isSuperAdmin(subject: RoleSubject, allowlist: readonly string[]): boolean {
  if (subject.platformRole === PLATFORM_ROLE.SUPER_ADMIN) return true;
  if (!subject.emailVerifiedAt) return false;
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
