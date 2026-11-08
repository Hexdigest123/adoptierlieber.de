import type { ListEnvelope } from "$lib/admin/types";

type Loaded<T> = { base: ListEnvelope<T>; items: T[]; page: number };

/**
 * "Load more" on top of the first page from the server load. Loaded pages belong to the list
 * they extend: new server data (filter, search, invalidation) starts over, and a response that
 * arrives after such a change is dropped.
 */
export function pagedList<T>(base: () => ListEnvelope<T>, pageUrl: (page: number) => string) {
	let loaded = $state.raw<Loaded<T> | null>(null);
	let loading = $state(false);
	const extra = $derived(loaded?.base === base() ? loaded : null);
	const items = $derived([...base().items, ...(extra?.items ?? [])]);

	return {
		get items() {
			return items;
		},
		get total() {
			return base().total;
		},
		get hasMore() {
			return items.length < base().total;
		},
		get loading() {
			return loading;
		},
		async loadMore() {
			if (loading || items.length >= base().total) return;
			const from = base();
			const previous = extra?.items ?? [];
			const page = (extra?.page ?? 1) + 1;
			loading = true;
			try {
				const response = await fetch(pageUrl(page));
				if (!response.ok || from !== base()) return;
				const body = (await response.json()) as ListEnvelope<T>;
				loaded = { base: from, items: [...previous, ...body.items], page };
			} finally {
				loading = false;
			}
		},
	};
}
