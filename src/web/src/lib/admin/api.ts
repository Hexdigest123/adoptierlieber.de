import { error } from "@sveltejs/kit";
import { searchParams } from "$lib/query";
import type { ListEnvelope } from "./types";

export const ADMIN_PAGE_SIZE = 24;

export type CatalogType = "users" | "shelters" | "animals";

export type CatalogFilters = {
	type: CatalogType;
	q: string;
	status: string;
	city: string;
	verified: string;
	species: string;
};

/** API list behind a catalog tab; the page load and "load more" must send the same filters. */
export function catalogListPath(filters: CatalogFilters, page: number): string {
	const { type, q, status, city, verified, species } = filters;
	const params = searchParams({
		page: String(page),
		per_page: String(ADMIN_PAGE_SIZE),
		q,
		city: type === "animals" ? "" : city,
		status: type === "shelters" ? "" : status,
		verification_status: type === "shelters" ? status : "",
		verified: type === "users" ? verified : "",
		species: type === "animals" ? species : "",
	});
	return `/api/admin/${type}?${params}`;
}

export async function adminFetch<T>(fetchFn: typeof fetch, path: string): Promise<T> {
	const response = await fetchFn(path);
	if (response.status === 404) {
		error(404, "Not found");
	}
	if (!response.ok) {
		error(response.status === 401 ? 401 : 502, "Request failed");
	}
	return (await response.json()) as T;
}

export async function adminList<T>(fetchFn: typeof fetch, path: string): Promise<ListEnvelope<T>> {
	return adminFetch<ListEnvelope<T>>(fetchFn, path);
}
