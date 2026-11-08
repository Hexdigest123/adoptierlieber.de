/** URLSearchParams from the non-empty values; empty strings, null and undefined are left out. */
export function searchParams(values: Record<string, string | null | undefined>): URLSearchParams {
	return new URLSearchParams(
		Object.entries(values).filter((entry): entry is [string, string] => Boolean(entry[1])),
	);
}
