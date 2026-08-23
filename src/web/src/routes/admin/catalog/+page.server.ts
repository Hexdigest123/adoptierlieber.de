import type { PageServerLoad } from "./$types";
import { adminList } from "$lib/admin/api";
import type { AdminAnimalCard, AdminShelterCard, AdminUserCard } from "$lib/admin/types";

const TYPES = new Set(["users", "shelters", "animals"]);

export const load: PageServerLoad = async ({ url, fetch }) => {
	const type = TYPES.has(url.searchParams.get("type") ?? "")
		? (url.searchParams.get("type") as "users" | "shelters" | "animals")
		: "users";
	const q = url.searchParams.get("q") ?? "";
	const status = url.searchParams.get("status") ?? "";
	const city = url.searchParams.get("city") ?? "";
	const verified = url.searchParams.get("verified") ?? "";
	const species = url.searchParams.get("species") ?? "";

	const params = new URLSearchParams();
	params.set("page", "1");
	params.set("per_page", "24");
	if (q) params.set("q", q);
	if (type !== "animals" && city) params.set("city", city);
	if (type === "users") {
		if (status) params.set("status", status);
		if (verified) params.set("verified", verified);
	} else if (type === "shelters") {
		if (status) params.set("verification_status", status);
	} else {
		if (status) params.set("status", status);
		if (species) params.set("species", species);
	}

	const path =
		type === "users"
			? `/api/admin/users?${params}`
			: type === "shelters"
				? `/api/admin/shelters?${params}`
				: `/api/admin/animals?${params}`;

	const list =
		type === "users"
			? await adminList<AdminUserCard>(fetch, path)
			: type === "shelters"
				? await adminList<AdminShelterCard>(fetch, path)
				: await adminList<AdminAnimalCard>(fetch, path);

	return { type, q, status, city, verified, species, list };
};
