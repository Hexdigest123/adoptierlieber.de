/**
 * Shelter-provided links become plain hrefs. Only http(s) may pass;
 * javascript:, data: and anything unparsable give null (render no link).
 * Same rule as ShelterMap's popup and the API's zod check.
 */
export function safeHttpUrl(url: string | null | undefined): string | null {
	if (!url) return null;
	try {
		const parsed = new URL(url);
		if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
		return parsed.href;
	} catch {
		return null;
	}
}
