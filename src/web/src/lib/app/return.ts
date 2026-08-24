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

export function withFrom(path: string, from: string | null): string {
	if (!isAnimalOrigin(from)) return path;
	return `${path}?from=${from}`;
}
