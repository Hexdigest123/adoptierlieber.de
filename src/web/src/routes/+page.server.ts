import { fail } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";
import type { PublicExcerpt, PublicMapShelter } from "$lib/types/catalog";
import type { PublicReview } from "$lib/types/review";
import { excerptsToCards } from "$lib/data/excerpts";

export const load: PageServerLoad = async ({ fetch }) => {
	const [showcase, shelters, reviews] = await Promise.all([
		loadShowcase(fetch),
		loadShelters(fetch),
		loadReviews(fetch),
	]);
	return { showcase, shelters, reviews };
};

async function loadShowcase(fetchFn: typeof fetch) {
	try {
		const response = await fetchFn("/api/animals/excerpts");
		if (response.ok) {
			const body = (await response.json()) as { items?: PublicExcerpt[] };
			return excerptsToCards(body.items ?? []);
		}
	} catch {
		// empty showcase
	}
	return [];
}

async function loadShelters(fetchFn: typeof fetch): Promise<PublicMapShelter[]> {
	try {
		const response = await fetchFn("/api/shelters/map");
		if (response.ok) {
			const body = (await response.json()) as { items?: PublicMapShelter[] };
			return body.items ?? [];
		}
	} catch {
		// empty map
	}
	return [];
}

async function loadReviews(fetchFn: typeof fetch): Promise<PublicReview[]> {
	try {
		const response = await fetchFn("/api/reviews");
		if (response.ok) {
			const body = (await response.json()) as { items?: PublicReview[] };
			return (body.items ?? []).slice(0, 10);
		}
	} catch {
		// empty reviews
	}
	return [];
}

export const actions: Actions = {
	contact: async ({ request, fetch }) => {
		const data = await request.formData();
		const name = String(data.get("name") ?? "").trim();
		const email = String(data.get("email") ?? "")
			.trim()
			.toLowerCase();
		const message = String(data.get("message") ?? "").trim();
		const website = String(data.get("website") ?? "").trim();
		const privacy = data.get("privacy") === "on";

		const values = { name, email, message };

		// privacy consent is mandatory (DSGVO); honeypot is forwarded as-is (API drops bots)
		if (!name || !email || !message || !privacy) {
			return fail(400, { contactError: true, contactValues: values });
		}

		const response = await fetch("/api/contact", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({ name, email, message, website }),
		});

		if (!response.ok) {
			return fail(response.status === 429 ? 429 : 502, {
				contactError: true,
				contactValues: values,
			});
		}

		return { contactSuccess: true };
	},
};
