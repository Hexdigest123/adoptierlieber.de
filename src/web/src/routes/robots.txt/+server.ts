import { SITE_ORIGIN } from "$lib/seo";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = () => {
	const body = `User-agent: *
Allow: /
Disallow: /api/
Disallow: /app
Disallow: /admin
Disallow: /shelter
Disallow: /profile
Disallow: /invite
Disallow: /logout
Disallow: /verify
Disallow: /forgot-password
Disallow: /reset-password
Disallow: /mfa/setup
Disallow: /impressum
Disallow: /datenschutz
Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;
	return new Response(body, {
		headers: { "content-type": "text/plain; charset=utf-8" },
	});
};
