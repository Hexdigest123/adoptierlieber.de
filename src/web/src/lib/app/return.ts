import { resolve } from "$app/paths";
import type { ResolvedPathname } from "$app/types";

const ORIGIN_PATHS = {
	catalog: "/app/catalog",
	likes: "/app/likes",
	search: "/app/search",
} as const;

export type AnimalOrigin = keyof typeof ORIGIN_PATHS;
export type OriginPath = (typeof ORIGIN_PATHS)[AnimalOrigin] | "/app";

export function isAnimalOrigin(value: string | null): value is AnimalOrigin {
	return value !== null && value in ORIGIN_PATHS;
}

export function backPath(from: string | null): OriginPath {
	if (isAnimalOrigin(from)) return ORIGIN_PATHS[from];
	return "/app";
}

/** In-app animal page that remembers the list it was opened from (for its back link). */
export function animalHref(id: string, from: string | null): ResolvedPathname {
	if (!isAnimalOrigin(from)) return resolve("/app/animals/[id]", { id });
	return resolve(`/app/animals/${id}?from=${from}`);
}
