import { getLocale } from "$lib/paraglide/runtime";

/** Fixed zone so SSR on Workers (UTC) and the browser render the same text. */
const TIME_ZONE = "Europe/Berlin";

function toDate(value: string | Date | null | undefined): Date | null {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

function format(
	value: string | Date | null | undefined,
	options: Intl.DateTimeFormatOptions,
): string {
	const date = toDate(value);
	if (!date) return "";
	return new Intl.DateTimeFormat(getLocale(), { timeZone: TIME_ZONE, ...options }).format(date);
}

/** Date and time without seconds, e.g. "09.10.2026, 15:01". */
export function formatDateTime(value: string | Date | null | undefined): string {
	return format(value, { dateStyle: "medium", timeStyle: "short" });
}

/** Date only, e.g. "09.10.2026". */
export function formatDay(value: string | Date | null | undefined): string {
	return format(value, { dateStyle: "medium" });
}

/** Time only, e.g. "15:01". */
export function formatTime(value: string | Date | null | undefined): string {
	return format(value, { timeStyle: "short" });
}

/** Calendar day in the site zone ("2026-10-09"), for grouping by day. */
export function dayKey(value: string | Date | null | undefined): string {
	const date = toDate(value);
	if (!date) return "";
	return new Intl.DateTimeFormat("en-CA", {
		timeZone: TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).format(date);
}
