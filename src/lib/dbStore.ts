import { NextRequest, NextResponse } from 'next/server';
import type { AppDatabase, AuditLog } from '../types';
import { getPool } from './db/pool';
import { ensureBootstrap } from './db/bootstrap';
import { buildRows, fingerprint, loadDatabase, persistDatabase } from './db/snapshot';
import { requireContext, runWithContext } from './db/context';
import { syncVipGift } from './vipGift';
import { setRoutingConfig } from './aiRouting';
import { ensureProviderUsagePersistence } from './aiUsagePersist';
import { SESSION_COOKIE, resolveSession } from './auth/session';

/**
 * The application database, as seen by one request.
 *
 * Every API handler runs through withDatabase(): it opens a transaction, loads the domain
 * snapshot from Postgres, runs the handler against that snapshot, and then writes back only
 * the rows that changed. Responses with status 400 or higher roll the transaction back, so a
 * rejected request never leaves partial changes behind.
 */

/**
 * The loaded snapshot can be reused by the next read request, so reads do not reload every table each time.
 * Every write that changes a row drops the copy (generation counter), and a copy is kept only for a few seconds.
 * The server runs one process (WEB_CONCURRENCY=1); with several processes this cache must be removed.
 */
const SNAPSHOT_TTL_MS = 15_000;
let snapshotCache: { db: AppDatabase; at: number } | null = null;
let snapshotGeneration = 0;
function dropSnapshotCache(): void {
  snapshotGeneration++;
  snapshotCache = null;
}

/** The snapshot for the current request. Only valid inside withDatabase(). */
export function getDatabase(): AppDatabase {
  return requireContext().db;
}

export function logAudit(actor: string, action: string, entity: string, details: string): void {
  const db = getDatabase();
  const entry: AuditLog = {
    id: 'log-' + Date.now() + '-' + Math.random().toString(36).substring(2, 8),
    actor,
    action,
    entity,
    details,
    timestamp: new Date().toISOString()
  };
  db.auditLogs.unshift(entry);
  if (db.auditLogs.length > 200) db.auditLogs.length = 200;
}

function requestToken(req: NextRequest): string | null {
  const cookie = req.cookies.get(SESSION_COOKIE)?.value;
  if (cookie) return cookie;
  const m = (req.headers.get('authorization') || '').match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

/** Paths whose handlers change balances, VIP time, deposits or promo usage. */
export const MONEY_PATH = /^\/api\/(student\/economy|deposits(\/|$)|owner\/deposits(\/|$)|owner\/students(\/|$)|users\/|owner\/vip-gift|owner\/promo|student\/promo)/;
const MONEY_LOCK_KEY = 727001;

type Handler<A extends unknown[]> = (req: NextRequest, ...args: A) => Promise<NextResponse>;

export function withDatabase<A extends unknown[]>(handler: Handler<A>): Handler<A> {
  return async (req, ...args) => {
    const pool = getPool();
    let client;
    try {
      await ensureBootstrap(pool);
      await ensureProviderUsagePersistence();
      client = await pool.connect();
    } catch (err) {
      console.error('[db] unavailable:', (err as Error).message);
      return NextResponse.json(
        { success: false, message: 'Ma’lumotlar bazasi bilan bog‘lanib bo‘lmadi. Keyinroq urinib ko‘ring.', code: 'DB_UNAVAILABLE' },
        { status: 503 }
      );
    }

    // Reads skip the explicit transaction (two fewer network round trips). If a read ever has to
    // write, a transaction is opened just before its first write.
    // AI calls last many seconds: they too wait to open a transaction until something has to be written,
    // so a slow answer never holds a database transaction open.
    // The Telegram webhook reads far more than it writes, so it opens a transaction only when it writes.
    const isWebhook = req.nextUrl.pathname === '/api/telegram/webhook';
    // Level routes use the request transaction for atomic scoring and answer writes.
    const isLevel = /^\/api\/levels\/attempts\/[^/]+\/?$/.test(req.nextUrl.pathname);
    const isRead = !isLevel && (req.method === 'GET' || req.method === 'HEAD' || req.nextUrl.pathname.startsWith('/api/ai/') || isWebhook);
    const started = Date.now();
    let inTx = false;
    const openTx = async () => {
      if (!inTx) {
        await client.query('begin');
        inTx = true;
      }
    };
    const lazyTx: any = {
      query: async (...a: any[]) => {
        await openTx();
        return (client.query as any)(...a);
      }
    };
    try {
      if (!isRead) {
        await openTx();
        // Requests that move money or VIP time run one after another: two concurrent purchases from one balance used to
        // both succeed (each read the same balance). The lock is released when this transaction ends.
        if (MONEY_PATH.test(req.nextUrl.pathname)) await client.query('select pg_advisory_xact_lock($1)', [MONEY_LOCK_KEY]);
        // Serialize duplicate registration requests for the same normalized identifier before loading the snapshot.
        if (req.nextUrl.pathname === '/api/auth/register') {
          const body = await req.clone().json().catch(() => ({}));
          const raw = String(body?.identifier || body?.phone || body?.email || '').trim().toLowerCase();
          const identity = raw.includes('@') ? raw : (raw.replace(/\D/g, '') || raw) + '@edulevel.uz';
          await client.query('select pg_advisory_xact_lock(727002, hashtext($1))', [identity]);
        }
      }
      // Sign-in and sign-up create the session themselves, so they skip the lookup (one round trip less).
      const publicAuth = /^\/api\/auth\/(login|register|google)\/?$/.test(req.nextUrl.pathname);
      const session = publicAuth ? null : await resolveSession(client, requestToken(req));
      const generationAtStart = snapshotGeneration;
      const fresh = snapshotCache && Date.now() - snapshotCache.at < SNAPSHOT_TTL_MS ? snapshotCache : null;
      const fromCache = isRead && !!fresh;
      // A cached copy is cloned, so this request's changes never leak into the shared copy.
      const db: AppDatabase = fromCache ? structuredClone(fresh!.db) : await loadDatabase(client);
      const baseline = fingerprint(buildRows(db));
      syncVipGift(db); // after the baseline, so what it changes is saved
      setRoutingConfig(db.aiRouting as never); // the running server follows the owner's saved AI routing
      const loaded = Date.now();
      const response = await runWithContext({ client, db, baseline, session }, () => handler(req, ...args));
      const handled = Date.now();
      let touched = 0;
      if (response.status < 400) {
        touched = await persistDatabase(isRead ? lazyTx : client, db, baseline);
        if (inTx) await client.query('commit');
      } else if (inTx) {
        await client.query('rollback');
      }
      if (touched > 0) {
        dropSnapshotCache();
      } else if (response.status < 400 && !fromCache && generationAtStart === snapshotGeneration) {
        // Nothing changed: what was loaded is what the database holds, so it can serve the next reads.
        snapshotCache = { db: structuredClone(db), at: Date.now() };
      }
      // Timing for the bot in the server log: load = reading the data, handle = the bot's work, total = all of it.
      if (isWebhook) console.log(`[telegram] total=${Date.now() - started}ms load=${loaded - started}ms handle=${handled - loaded}ms write=${Date.now() - handled}ms`);
      return response;
    } catch (err) {
      dropSnapshotCache(); // a failed write may have part-applied: never serve a copy after it
      if (inTx) await client.query('rollback').catch(() => {});
      console.error('[db] request failed:', err);
      return NextResponse.json({ success: false, message: 'Server xatosi. Qayta urinib ko‘ring.', code: 'SERVER_ERROR' }, { status: 500 });
    } finally {
      client.release();
    }
  };
}
