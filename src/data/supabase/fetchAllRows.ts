const PAGE_SIZE = 1000;

/** Read every row of a paged Supabase query, 1000 rows at a time. */
export async function fetchAllRows<T>(
  run: (from: number, to: number) => Promise<T[]>
): Promise<T[]> {
  const rows: T[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const batch = await run(from, from + PAGE_SIZE - 1);
    rows.push(...batch);
    if (batch.length < PAGE_SIZE) return rows;
  }
}
