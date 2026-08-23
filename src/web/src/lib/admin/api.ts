import { error } from "@sveltejs/kit";
import type { ListEnvelope } from "./types";

export async function adminFetch<T>(fetchFn: typeof fetch, path: string): Promise<T> {
	const response = await fetchFn(path);
	if (response.status === 404) {
		error(404, "Not found");
	}
	if (!response.ok) {
		error(response.status === 401 ? 401 : 502, "Request failed");
	}
	return (await response.json()) as T;
}

export async function adminList<T>(fetchFn: typeof fetch, path: string): Promise<ListEnvelope<T>> {
	return adminFetch<ListEnvelope<T>>(fetchFn, path);
}
