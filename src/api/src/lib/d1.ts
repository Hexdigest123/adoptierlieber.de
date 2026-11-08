// D1 binds at most 100 parameters per statement; leave room for the query's other filters.
const IN_LIST_MAX = 90;

/** Runs `query` over slices of `values` so no IN (...) list exceeds D1's parameter limit. */
export async function inChunks<T, R>(
  values: readonly T[],
  query: (chunk: T[]) => Promise<R[]>,
): Promise<R[]> {
  const results: R[] = [];
  for (let i = 0; i < values.length; i += IN_LIST_MAX) {
    results.push(...(await query(values.slice(i, i + IN_LIST_MAX))));
  }
  return results;
}
