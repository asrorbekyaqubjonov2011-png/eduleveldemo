import { getPool } from '@/src/lib/db/pool';
import type { SeoRecord } from './records';

/**
 * Public side of the owner's SEO pages: read straight from the table (no session, no snapshot) and cached for a minute.
 * Only published pages are ever returned; a database problem returns nothing instead of an error, so the code-written
 * pages and the sitemap keep working.
 */
let cache: { at: number; list: SeoRecord[] } | null = null;

export function dropSeoPageCache(): void {
  cache = null;
}

export async function listPublishedSeoRecords(now = Date.now()): Promise<SeoRecord[]> {
  if (cache && now - cache.at < 60_000) return cache.list;
  try {
    const { rows } = await getPool().query("select data from public.content_items where kind = 'seo_page' order by position, id");
    const list = (rows as { data: SeoRecord }[]).map((r) => r.data).filter((r) => r && r.status === 'published' && r.reviewed === true);
    cache = { at: now, list };
    return list;
  } catch {
    return cache?.list ?? [];
  }
}

export async function findPublishedSeoRecord(path: string): Promise<SeoRecord | null> {
  const id = path.replace(/^\/+|\/+$/g, '').toLowerCase();
  return (await listPublishedSeoRecords()).find((r) => r.id === id) ?? null;
}
