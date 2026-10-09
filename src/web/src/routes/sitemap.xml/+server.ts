import { SITE_ORIGIN } from "$lib/seo";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ fetch }) => {
	const urls = ["", "/login", "/register"].map(
		(path) => `<url><loc>${SITE_ORIGIN}${path || "/"}</loc></url>`,
	);

	let complete = false;
	try {
		// Relative, through the /api proxy, so the API rate-limits per crawler IP
		// instead of one shared bucket for this worker.
		const res = await fetch("/api/animals/sitemap");
		if (res.ok) {
			const body = (await res.json()) as { items?: { id?: string; updated_at?: string }[] };
			for (const row of body.items ?? []) {
				if (!row.id || !row.updated_at) continue;
				urls.push(
					`<url><loc>${SITE_ORIGIN}/animals/${encodeURIComponent(row.id)}</loc><lastmod>${row.updated_at.slice(0, 10)}</lastmod></url>`,
				);
			}
			complete = true;
		}
	} catch {
		// marketing urls still useful
	}

	const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;

	return new Response(xml, {
		headers: {
			"content-type": "application/xml; charset=utf-8",
			// public + s-maxage: the adapter-cloudflare worker stores this in the edge
			// cache (caches.default) and answers repeats without calling the API.
			// A partial sitemap (API down or rate-limited) is not cached.
			"cache-control": complete ? "public, max-age=3600, s-maxage=3600" : "no-store",
		},
	});
};
