import { m } from "$lib/paraglide/messages";

/** Public origin used in canonical, Open Graph, and JSON-LD. */
export const SITE_ORIGIN = "https://adoptierlieber.de";
export const OG_IMAGE_PATH = "/og.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

const NOINDEX_ROUTES = new Set([
	"/profile",
	"/app",
	"/admin",
	"/shelter",
	"/invite",
	"/logout",
	"/verify",
	"/forgot-password",
	"/reset-password",
	"/delete-account",
]);

type PageMeta = {
	title: () => string;
	description: () => string;
};

const pages: Record<string, PageMeta> = {
	"/": {
		title: () => m.meta_home_title(),
		description: () => m.meta_home_description(),
	},
	"/login": {
		title: () => m.meta_login_title(),
		description: () => m.meta_login_description(),
	},
	"/register": {
		title: () => m.meta_register_title(),
		description: () => m.meta_register_description(),
	},
	"/impressum": {
		title: () => m.meta_impressum_title(),
		description: () => m.meta_impressum_description(),
	},
	"/datenschutz": {
		title: () => m.meta_datenschutz_title(),
		description: () => m.meta_datenschutz_description(),
	},
	"/profile": {
		title: () => m.meta_profile_title(),
		description: () => m.meta_profile_description(),
	},
	"/app": {
		title: () => m.meta_app_title(),
		description: () => m.meta_app_description(),
	},
	"/app/map": {
		title: () => m.meta_app_map_title(),
		description: () => m.meta_app_description(),
	},
	"/app/catalog": {
		title: () => m.meta_app_catalog_title(),
		description: () => m.meta_app_description(),
	},
	"/app/likes": {
		title: () => m.meta_app_likes_title(),
		description: () => m.meta_app_description(),
	},
	"/app/search": {
		title: () => m.meta_app_search_title(),
		description: () => m.meta_app_description(),
	},
	"/app/messages": {
		title: () => m.meta_app_messages_title(),
		description: () => m.meta_app_description(),
	},
	"/verify": {
		title: () => m.meta_verify_title(),
		description: () => m.meta_verify_description(),
	},
	"/forgot-password": {
		title: () => m.meta_forgot_title(),
		description: () => m.meta_forgot_description(),
	},
	"/reset-password": {
		title: () => m.meta_reset_title(),
		description: () => m.meta_reset_description(),
	},
	"/delete-account": {
		title: () => m.meta_delete_account_title(),
		description: () => m.meta_delete_account_description(),
	},
	"/admin": {
		title: () => m.meta_admin_title(),
		description: () => m.meta_admin_description(),
	},
	"/shelter": {
		title: () => m.meta_shelter_title(),
		description: () => m.meta_shelter_description(),
	},
	"/invite": {
		title: () => m.meta_invite_title(),
		description: () => m.meta_invite_description(),
	},
};

export type Seo = {
	title: string;
	description: string;
	robots: string;
	canonical: string;
	image: string;
};

export function canonicalUrl(pathname: string): string {
	const path = pathname === "/" ? "/" : pathname.replace(/\/+$/, "");
	return `${SITE_ORIGIN}${path}`;
}

export function seoForRoute(routeId: string | null, pathname: string, status = 200): Seo {
	const canonical = canonicalUrl(pathname);
	const image = `${SITE_ORIGIN}${OG_IMAGE_PATH}`;

	if (status >= 400) {
		return {
			title: m.meta_error_title(),
			description: m.meta_error_description(),
			robots: "noindex, nofollow",
			canonical,
			image,
		};
	}

	const pageKey = routeId
		? pages[routeId]
			? routeId
			: (["/admin", "/invite", "/app", "/shelter"].find(
					(prefix) => routeId === prefix || routeId.startsWith(`${prefix}/`),
				) ?? routeId)
		: null;
	const page = (pageKey && pages[pageKey]) || {
		title: () => m.meta_home_title(),
		description: () => m.meta_home_description(),
	};
	const noindex =
		Boolean(pageKey && NOINDEX_ROUTES.has(pageKey)) ||
		Boolean(
			routeId &&
			(routeId.startsWith("/admin") || routeId.startsWith("/invite") || routeId.startsWith("/app")),
		);

	return {
		title: page.title(),
		description: page.description(),
		robots: noindex ? "noindex, nofollow" : "index, follow",
		canonical,
		image,
	};
}

export function jsonLd(seo: Seo, locale: string): string {
	return JSON.stringify({
		"@context": "https://schema.org",
		"@graph": [
			{
				"@type": "Organization",
				"@id": `${SITE_ORIGIN}/#organization`,
				name: "Adoptier Lieber",
				legalName: "Merckel & Witzdam GbR",
				url: SITE_ORIGIN,
				logo: {
					"@type": "ImageObject",
					url: `${SITE_ORIGIN}/apple-touch-icon.png`,
					width: 180,
					height: 180,
				},
				email: "pierre@adoptierlieber.de",
				telephone: "+49-175-9521503",
				sameAs: ["https://x.com/h3xdigest", "https://merckel.dev"],
				address: {
					"@type": "PostalAddress",
					streetAddress: "Im Winkel 23",
					postalCode: "45896",
					addressLocality: "Gelsenkirchen",
					addressCountry: "DE",
				},
			},
			{
				"@type": "WebSite",
				"@id": `${SITE_ORIGIN}/#website`,
				url: SITE_ORIGIN,
				name: "Adoptier Lieber",
				description: m.meta_home_description(),
				inLanguage: ["de", "en"],
				publisher: { "@id": `${SITE_ORIGIN}/#organization` },
			},
			{
				"@type": "WebPage",
				"@id": `${seo.canonical}#webpage`,
				url: seo.canonical,
				name: seo.title,
				description: seo.description,
				inLanguage: locale,
				isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
				about: { "@id": `${SITE_ORIGIN}/#organization` },
				primaryImageOfPage: {
					"@type": "ImageObject",
					url: seo.image,
					width: OG_IMAGE_WIDTH,
					height: OG_IMAGE_HEIGHT,
				},
			},
		],
	});
}
