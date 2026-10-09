export type VisitSection = "landing" | "app" | "animal" | "shelter" | "auth" | "other";

const AUTH_ROUTES = new Set([
	"/login",
	"/register",
	"/verify",
	"/forgot-password",
	"/reset-password",
	"/invite",
	"/mfa/setup",
]);

export function visitSection(routeId: string | null): VisitSection | null {
	if (!routeId) return null;
	if (routeId === "/") return "landing";
	if (routeId === "/admin" || routeId.startsWith("/admin/")) return null;
	if (routeId === "/api" || routeId.startsWith("/api/")) return null;
	if (routeId === "/app" || routeId.startsWith("/app/")) return "app";
	if (routeId.startsWith("/animals/")) return "animal";
	if (routeId === "/shelter" || routeId.startsWith("/shelter/")) return "shelter";
	if (AUTH_ROUTES.has(routeId)) return "auth";
	return "other";
}

function send(path: string, body: Record<string, string>): void {
	try {
		const json = JSON.stringify(body);
		const queued = navigator.sendBeacon?.(path, new Blob([json], { type: "application/json" }));
		if (!queued) {
			void fetch(path, {
				method: "POST",
				headers: { "content-type": "application/json" },
				body: json,
				keepalive: true,
				credentials: "omit",
			}).catch(() => {});
		}
	} catch {
		// counting must never get in the way of the page
	}
}

// re-navigating to the same path is not a new visit
let lastPath: string | null = null;

export function trackVisit(routeId: string | null, pathname: string): void {
	const section = visitSection(routeId);
	if (!section || pathname === lastPath) return;
	lastPath = pathname;
	send("/api/stats/visit", { section });
}

export function trackDonationClick(shelterId: string): void {
	send(`/api/shelters/${encodeURIComponent(shelterId)}/donation-click`, {});
}
