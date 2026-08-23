import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import { getCurrentShelterCookie, setCurrentShelterCookie } from "$lib/server/shelter-cookie";
import { setLastHomeCookie } from "$lib/server/session-cookie";
import type { ShelterDashboard, StaffShelter } from "$lib/types/shelter";

export const load: LayoutServerLoad = async ({ locals, cookies, url, fetch }) => {
	if (!locals.user) {
		redirect(303, `/login?next=${encodeURIComponent(url.pathname + url.search)}`);
	}

	const invitePath = url.pathname === "/shelter/invite";
	const memberships = locals.user.memberships ?? [];
	if (!invitePath && memberships.length === 0) {
		redirect(303, "/app");
	}

	const wanted = url.searchParams.get("shelter") ?? getCurrentShelterCookie(cookies);
	const current = memberships.find((row) => row.shelter_id === wanted) ?? memberships[0] ?? null;

	if (current) {
		setCurrentShelterCookie(cookies, current.shelter_id);
		setLastHomeCookie(cookies, "/shelter");
	}

	let shelter: StaffShelter | null = null;
	let unread = 0;
	let hasAnimals = false;
	if (current) {
		const [shelterRes, dashRes] = await Promise.all([
			fetch(`/api/shelters/${current.shelter_id}`),
			fetch(`/api/shelters/${current.shelter_id}/dashboard`),
		]);
		if (shelterRes.ok) {
			shelter = (await shelterRes.json()) as StaffShelter;
		}
		if (dashRes.ok) {
			const dash = (await dashRes.json()) as Pick<ShelterDashboard, "kpis">;
			const kpis = dash.kpis;
			unread = kpis?.unread ?? 0;
			hasAnimals = Boolean(kpis && kpis.live + kpis.drafts + kpis.found_home > 0);
		}
		if (shelter?.checklist.first_animal) {
			hasAnimals = true;
		}
	}

	return {
		user: locals.user,
		memberships,
		current,
		shelter,
		unread,
		hasAnimals,
	};
};
