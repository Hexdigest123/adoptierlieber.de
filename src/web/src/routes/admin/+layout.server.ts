import { error, redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";
import type { ListEnvelope } from "$lib/admin/types";

export const load: LayoutServerLoad = async ({ locals, url, fetch }) => {
	if (!locals.user) {
		const next = `${url.pathname}${url.search}`;
		redirect(303, `/login?next=${encodeURIComponent(next)}`);
	}
	if (locals.user.platform_role > 1) {
		error(404, "Not found");
	}

	let pendingCount = 0;
	let pendingReviewCount = 0;
	try {
		const [applications, reviews] = await Promise.all([
			fetch("/api/admin/applications?verification_status=pending&per_page=1"),
			fetch("/api/admin/reviews?status=pending&per_page=1"),
		]);
		if (applications.ok) {
			const body = (await applications.json()) as ListEnvelope<unknown>;
			pendingCount = body.total;
		}
		if (reviews.ok) {
			const body = (await reviews.json()) as ListEnvelope<unknown>;
			pendingReviewCount = body.total;
		}
	} catch {
		pendingCount = 0;
		pendingReviewCount = 0;
	}

	return { pendingCount, pendingReviewCount };
};
