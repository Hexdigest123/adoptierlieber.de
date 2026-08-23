import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import { resolveMembership } from "$lib/server/shelter-cookie";

export const load: PageServerLoad = async ({ parent }) => {
	const { current, shelter } = await parent();
	return {
		isOwner: current?.role === 1,
		readonly: shelter?.verification_status === "rejected",
	};
};

export const actions: Actions = {
	default: async ({ request, fetch, cookies, locals }) => {
		const current = resolveMembership(locals.user?.memberships ?? [], cookies);
		if (!current || current.role !== 1 || current.verification_status === "rejected") {
			return fail(403, { error: true });
		}
		const data = await request.formData();
		const body = {
			org_name: String(data.get("org_name") ?? "").trim(),
			street: String(data.get("street") ?? "").trim(),
			zip: String(data.get("zip") ?? "").trim(),
			city: String(data.get("city") ?? "").trim(),
			website: String(data.get("website") ?? "").trim() || null,
			registration_number: String(data.get("registration_number") ?? "").trim() || null,
			description: String(data.get("description") ?? "").trim() || null,
			notify_email: String(data.get("notify_email") ?? "").trim(),
		};
		const response = await fetch(`/api/shelters/${current.shelter_id}`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify(body),
		});
		if (!response.ok) {
			return fail(response.status === 400 ? 400 : 502, { error: true });
		}
		await fetch(`/api/shelters/${current.shelter_id}/checklist`, {
			method: "PATCH",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ profile: true, notify: true }),
		});
		return { success: true };
	},
};
