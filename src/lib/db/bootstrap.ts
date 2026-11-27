import type { Pool } from 'pg';
import { structuralDefaults } from '../../data/defaults';
import { DEFAULT_SHOP_ITEMS } from '../../data/shopCatalog';
import { hashPassword } from '../auth/password';
import { buildRows, emptyDatabase, insertMissing, loadDatabase } from './snapshot';
import type { AppDatabase } from '../../types';

/**
 * One-time setup per process:
 * - the owner login row is created from OWNER_PASSWORD (and rotated by OWNER_RESET_PASSWORD);
 * - structural defaults (VIP tiers, landing sections, FAQ, payment settings, shop catalog) are
 *   inserted only where the table is still empty. No sample students, deposits or statistics.
 * - expired sessions are removed.
 *
 * Existing rows are never overwritten here, except the owner row when OWNER_RESET_PASSWORD is set.
 */
let bootstrapped: Promise<void> | null = null;

export function ensureBootstrap(pool: Pool): Promise<void> {
  if (!bootstrapped) {
    bootstrapped = runBootstrap(pool).catch((err) => {
      bootstrapped = null; // retry on the next request
      throw err;
    });
  }
  return bootstrapped;
}

async function seedIfEmpty(
  client: { query: (text: string, params?: unknown[]) => Promise<{ rows: any[] }> },
  table: string,
  countSql: string,
  rows: Map<string, Record<string, unknown>> | undefined
): Promise<void> {
  if (!rows || rows.size === 0) return;
  const { rows: counted } = await client.query(countSql);
  if (Number(counted[0]?.count ?? 0) > 0) return;
  await insertMissing(client as any, table, [...rows.values()]);
}

async function runBootstrap(pool: Pool): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query('begin');
    await client.query('select pg_advisory_xact_lock(7201)'); // serialise bootstrap across instances
    await client.query('delete from public.sessions where expires_at <= now()');

    const db = await loadDatabase(client);
    const reset = (process.env.OWNER_RESET_PASSWORD || '').trim();
    const seed = (process.env.OWNER_PASSWORD || '').trim();
    const username = (process.env.OWNER_USERNAME || db.ownerUsername || 'jasurbek').trim();

    if (reset) {
      await client.query(
        `insert into public.owner_account (id, username, password_hash) values (1, $1, $2)
         on conflict (id) do update set username = excluded.username, password_hash = excluded.password_hash, updated_at = now()`,
        [username, hashPassword(reset)]
      );
    } else if (!db.ownerPasswordHash && seed) {
      await client.query(
        `insert into public.owner_account (id, username, password_hash) values (1, $1, $2) on conflict (id) do nothing`,
        [username, hashPassword(seed)]
      );
    }

    const defaults = { ...emptyDatabase(), ...structuralDefaults, shopItems: DEFAULT_SHOP_ITEMS };

    const rows = buildRows(defaults as AppDatabase);
    // Collections are seeded only while empty, so an owner's deliberate deletions are never undone.
    await seedIfEmpty(client, 'vip_plans', "select count(*) from public.vip_plans", rows.get('vip_plans'));
    await seedIfEmpty(client, 'site_sections', "select count(*) from public.site_sections", rows.get('site_sections'));
    await seedIfEmpty(client, 'faqs', "select count(*) from public.faqs", rows.get('faqs'));
    await seedIfEmpty(client, 'content_items', "select count(*) from public.content_items where kind = 'shop_item'", rows.get('content_items'));
    // Landing sections added in later releases: insert a row only when its key is missing.
    for (const sec of ((defaults as AppDatabase).siteSections || [])) {
      await client.query(
        `insert into public.site_sections (id, key, title, subtitle, cta_text, cta_link, is_visible, order_index, custom_data)
         select $1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb
         where not exists (select 1 from public.site_sections where key = $2)`,
        [sec.id, sec.key, sec.title ?? '', sec.subtitle ?? '', sec.ctaText ?? null, sec.ctaLink ?? null, sec.isVisible !== false, sec.orderIndex ?? 0, sec.customData ? JSON.stringify(sec.customData) : null]
      );
    }
    // Singleton settings: insert only the missing keys.
    await insertMissing(client, 'site_settings', [...(rows.get('site_settings')?.values() ?? [])]);
    await client.query('commit');
  } catch (err) {
    await client.query('rollback').catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}
