import { env } from "$env/dynamic/public";
import { SITE_ORIGIN } from "$lib/seo";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ fetch }) => {
	const urls = ["", "/login", "/register", "/impressum", "/datenschutz"].map(
		(path) => `<url><loc>${SITE_ORIGIN}${path || "/"}</loc></url>`,
	);

	try {
		const res = await fetch(`${env.PUBLIC_API_URL ?? ""}/api/animals/sitemap`);
		if (res.ok) {
			const body = (await res.json()) as { items: { id: string; updated_at: string }[] };
			for (const row of body.items) {
				urls.push(
					`<url><loc>${SITE_ORIGIN}/animals/${row.id}</loc><lastmod>${row.updated_at.slice(0, 10)}</lastmod></url>`,
				);
			}
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
			"cache-control": "public, max-age=3600",
		},
	});
};
