import type { PageServerLoad } from "./$types";
import { adminFetch, adminList } from "$lib/admin/api";
import type { AdminAuditRow, AdminTeam } from "$lib/admin/types";

export const load: PageServerLoad = async ({ url, fetch }) => {
	const q = url.searchParams.get("q") ?? "";
	const action = url.searchParams.get("action") ?? "";
	const actorId = url.searchParams.get("actor_id") ?? "";
	const from = url.searchParams.get("from") ?? "";
	const to = url.searchParams.get("to") ?? "";
	const params = new URLSearchParams();
	params.set("page", "1");
	params.set("per_page", "24");
	if (q) params.set("q", q);
	if (action) params.set("action", action);
	if (actorId) params.set("actor_id", actorId);
	if (from) params.set("from", from);
	if (to) params.set("to", to);
	const [list, team] = await Promise.all([
		adminList<AdminAuditRow>(fetch, `/api/admin/audit?${params}`),
		adminFetch<AdminTeam>(fetch, "/api/admin/admins"),
	]);
	return { q, action, actorId, from, to, list, admins: team.items };
};
