import { dev } from "$app/environment";
import type { Cookies } from "@sveltejs/kit";
import type { ShelterMembershipSummary } from "$lib/types/session";

export const CURRENT_SHELTER_COOKIE = "currentShelterId";

export function resolveMembership(
	memberships: ShelterMembershipSummary[],
	cookies: Cookies,
): ShelterMembershipSummary | null {
	const wanted = getCurrentShelterCookie(cookies);
	return memberships.find((row) => row.shelter_id === wanted) ?? memberships[0] ?? null;
}

const base = {
	path: "/",
	httpOnly: true,
	secure: !dev,
	sameSite: "lax" as const,
	maxAge: 60 * 60 * 24 * 365,
};

export function setCurrentShelterCookie(cookies: Cookies, shelterId: string) {
	cookies.set(CURRENT_SHELTER_COOKIE, shelterId, base);
}

export function getCurrentShelterCookie(cookies: Cookies): string | undefined {
	return cookies.get(CURRENT_SHELTER_COOKIE);
}
