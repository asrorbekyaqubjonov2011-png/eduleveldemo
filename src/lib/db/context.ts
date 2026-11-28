import { AsyncLocalStorage } from 'async_hooks';
import type { PoolClient } from 'pg';
import type { AppDatabase } from '../../types';
import type { SessionRecord } from '../auth/session';

export interface RequestContext {
  /** Transaction client for this request: reads and writes happen inside one transaction. */
  client: PoolClient;
  /** Domain snapshot of the database, loaded at the start of the request. */
  db: AppDatabase;
  /** Row fingerprints taken right after loading; used to write back only what changed. */
  baseline: Map<string, Map<string, string>>;
  /** The caller's session, resolved from the cookie before the handler runs. */
  session: SessionRecord | null;
  afterCommit: Array<() => Promise<unknown>>;
}

const store = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(ctx: RequestContext, fn: () => Promise<T>): Promise<T> {
  return store.run(ctx, fn);
}

export function currentContext(): RequestContext | null {
  return store.getStore() ?? null;
}

export function requireContext(): RequestContext {
  const ctx = store.getStore();
  if (!ctx) {
    throw new Error('Database access outside a request context. Wrap the work in withDatabase().');
  }
  return ctx;
}
