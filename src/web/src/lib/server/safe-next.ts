/** Same-origin relative path only. Rejects protocol-relative and empty. */
export function safeNextPath(value: string | null | undefined): string | null {
	if (!value) return null;
	if (!value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return null;
	return value;
}
