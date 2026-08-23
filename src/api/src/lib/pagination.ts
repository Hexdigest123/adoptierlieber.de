export type ListQuery = {
  page: number;
  per_page: number;
  offset: number;
};

export type ListEnvelope<T> = {
  items: T[];
  page: number;
  per_page: number;
  total: number;
};

export function parseListQuery(search: URLSearchParams, fallback = 24): ListQuery {
  const rawPage = Number(search.get("page") ?? "1");
  const rawPer = Number(search.get("per_page") ?? String(fallback));
  const page = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;
  const per_page = Number.isFinite(rawPer) ? Math.min(50, Math.max(1, Math.floor(rawPer))) : fallback;
  return { page, per_page, offset: (page - 1) * per_page };
}

export function listEnvelope<T>(items: T[], total: number, query: ListQuery): ListEnvelope<T> {
  return { items, page: query.page, per_page: query.per_page, total };
}
