import type { PageServerLoad } from "./$types";
import { adminList, catalogListPath, type CatalogFilters } from "$lib/admin/api";
import type { AdminAnimalCard, AdminShelterCard, AdminUserCard } from "$lib/admin/types";

const TYPES = new Set(["users", "shelters", "animals"]);

export const load: PageServerLoad = async ({ url, fetch }) => {
	const rawType = url.searchParams.get("type") ?? "";
	const filters: CatalogFilters = {
		type: TYPES.has(rawType) ? (rawType as CatalogFilters["type"]) : "users",
		q: url.searchParams.get("q") ?? "",
		status: url.searchParams.get("status") ?? "",
		city: url.searchParams.get("city") ?? "",
		verified: url.searchParams.get("verified") ?? "",
		species: url.searchParams.get("species") ?? "",
	};
	const path = catalogListPath(filters, 1);
	const list =
		filters.type === "users"
			? await adminList<AdminUserCard>(fetch, path)
			: filters.type === "shelters"
				? await adminList<AdminShelterCard>(fetch, path)
				: await adminList<AdminAnimalCard>(fetch, path);

	return { ...filters, list };
};
