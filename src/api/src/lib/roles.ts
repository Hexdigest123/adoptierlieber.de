export const SHELTER_ROLE = {
  GLOBAL_ADMIN: 0, // platform-wide, bypasses shelter checks
  OWNER: 1, // full control of one shelter
  STAFF: 2, // limited member
} as const;

export type ShelterRole = (typeof SHELTER_ROLE)[keyof typeof SHELTER_ROLE];

// Ring semantics (x86-style): lower integer = more privilege.
// grant check: user.role <= requiredRole
export function hasPrivilege(role: number, requiredRole: ShelterRole): boolean {
  return role <= requiredRole;
}
