import { error, fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import type { ShelterInviteRow, ShelterMemberRow } from "$lib/types/shelter";
import { resolveMembership } from "$lib/server/shelter-cookie";

export const load: PageServerLoad = async ({ parent, fetch }) => {
	const { current, shelter, user } = await parent();
	if (!current) error(404, "not found");
	const response = await fetch(`/api/shelters/${current.shelter_id}/members`);
	if (!response.ok) error(502, "team");
	const body = (await response.json()) as {
		members: ShelterMemberRow[];
		invites: ShelterInviteRow[];
	};
	return {
		members: body.members,
		invites: body.invites,
		isOwner: current.role === 1,
		readonly: shelter?.verification_status === "rejected",
		selfId: user.id,
	};
};

export const actions: Actions = {
	invite: async ({ request, fetch, cookies, locals }) => {
		const current = resolveMembership(locals.user?.memberships ?? [], cookies);
		if (!current || current.role !== 1) return fail(403, { inviteError: true });
		const data = await request.formData();
		const email = String(data.get("email") ?? "")
			.trim()
			.toLowerCase();
		const response = await fetch(`/api/shelters/${current.shelter_id}/invites`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ email, role: 2 }),
		});
		if (!response.ok) {
			return fail(response.status === 409 ? 409 : 400, { inviteError: true });
		}
		await fetch(`/api/shelters/${current.shelter_id}/checklist`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ team: true }),
		});
		return { invited: true };
	},

	remove: async ({ request, fetch, cookies, locals }) => {
		const current = resolveMembership(locals.user?.memberships ?? [], cookies);
		if (!current || current.role !== 1) return fail(403, { teamError: true });
		const data = await request.formData();
		const userId = String(data.get("user_id") ?? "");
		const response = await fetch(`/api/shelters/${current.shelter_id}/members/${userId}`, {
			method: "DELETE",
		});
		if (!response.ok) return fail(response.status === 409 ? 409 : 400, { teamError: true });
		return { removed: true };
	},

	transfer: async ({ request, fetch, cookies, locals }) => {
		const current = resolveMembership(locals.user?.memberships ?? [], cookies);
		if (!current || current.role !== 1) return fail(403, { teamError: true });
		const data = await request.formData();
		const userId = String(data.get("user_id") ?? "");
		const response = await fetch(`/api/shelters/${current.shelter_id}/transfer`, {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ user_id: userId }),
		});
		if (!response.ok) return fail(400, { teamError: true });
		return { transferred: true };
	},
};
