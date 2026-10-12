import { formatDateTime } from "$lib/datetime";

export function formatDate(value: string | null | undefined): string {
	return formatDateTime(value) || "—";
}

export function shortHash(hash: string): string {
	return hash.slice(0, 8);
}
