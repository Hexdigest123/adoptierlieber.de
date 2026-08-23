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

// Ring semantics (x86-style): lower integer = more privilege.
// grant check: user.role <= requiredRole
export function hasPrivilege(role: number, requiredRole: number): boolean {
  return role <= requiredRole;
}

export function isPlatformAdmin(role: number): boolean {
  return hasPrivilege(role, PLATFORM_ROLE.ADMIN);
}

export function isSuperAdmin(role: number): boolean {
  return role === PLATFORM_ROLE.SUPER_ADMIN;
}
