/**
 * Same-origin relative path only. Rejects protocol-relative, backslashes and
 * control characters (browsers drop tab/newline, so "/\t/evil.com" would turn
 * into "//evil.com"), then re-checks that the value resolves to this origin.
 * The normalized path is checked again: "/.//evil.com" resolves to "//evil.com".
 */
export function safeNextPath(value: string | null | undefined): string | null {
	// eslint-disable-next-line no-control-regex
	if (!value || !value.startsWith("/") || /[\u0000-\u001f\u007f\\]/.test(value)) return null;
	let url: URL;
	try {
		url = new URL(value, "https://n.invalid");
	} catch {
		return null;
	}
	if (url.origin !== "https://n.invalid" || url.pathname.startsWith("//")) return null;
	return url.pathname + url.search + url.hash;
}
