import type { Cookies } from "@sveltejs/kit";
import type { ShelterMembershipSummary } from "$lib/types/session";
import { getLastHomeCookie } from "./session-cookie";

export function loginHomePath(
	user: { memberships?: ShelterMembershipSummary[] },
	cookies?: Cookies,
): "/shelter" | "/app" {
	const memberships = user.memberships ?? [];
	if (memberships.length === 0) return "/app";
	const last = cookies ? getLastHomeCookie(cookies) : null;
	if (last === "/app" || last === "/shelter") return last;
	return "/shelter";
}
