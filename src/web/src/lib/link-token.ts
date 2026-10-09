const STASH_PREFIX = "adoptierlieber.link-token.";

/**
 * Mailed links carry their secret as #token=…. Browsers never send the
 * fragment to the server, so the token stays out of request logs. Older
 * mails still use ?token=…; that is accepted until those links expire.
 *
 * Client only. Reads the token and removes it from the address bar (history,
 * screenshots), keeping path and the rest of the query. The plain History API
 * is used on purpose: replaceState from $app/navigation would keep the old
 * URL, token included, in history.state. history.state itself is passed on,
 * so the router's own entries stay intact.
 *
 * With `stashKey`, falls back to a token kept by stashLinkToken before a
 * detour through login, and clears that stash either way.
 */
export function takeLinkToken(stashKey?: string): string {
	let stashed = "";
	if (stashKey) {
		try {
			stashed = sessionStorage.getItem(STASH_PREFIX + stashKey) ?? "";
			sessionStorage.removeItem(STASH_PREFIX + stashKey);
		} catch {
			// storage blocked
		}
	}

	const url = new URL(location.href);
	const fragment = new URLSearchParams(url.hash.slice(1));
	const token = fragment.get("token") ?? url.searchParams.get("token");
	if (token === null) return stashed;

	fragment.delete("token");
	url.hash = fragment.toString();
	if (url.searchParams.has("token")) url.searchParams.delete("token");
	history.replaceState(history.state, "", url);
	return token.trim() || stashed;
}

/** Keeps a link token in this tab only (sessionStorage) while the visitor logs in. */
export function stashLinkToken(stashKey: string, token: string): void {
	try {
		sessionStorage.setItem(STASH_PREFIX + stashKey, token);
	} catch {
		// storage blocked: the visitor opens the mailed link again after login
	}
}
