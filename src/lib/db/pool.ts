import { Pool, types } from 'pg';

// Postgres → JS conversions used by the snapshot loader.
// DATE stays a 'YYYY-MM-DD' string (the app works in Tashkent calendar days).
types.setTypeParser(1082, (v: string) => v);
// BIGINT and NUMERIC become plain numbers (balances and points stay far below 2^53).
types.setTypeParser(20, (v: string) => Number(v));
types.setTypeParser(1700, (v: string) => Number(v));
// TIMESTAMPTZ becomes an ISO-8601 string, matching the domain model.
types.setTypeParser(1184, (v: string) => new Date(v).toISOString());

let pool: Pool | null = null;

/**
 * Shared connection pool. DATABASE_URL is the Supabase connection string (pooler, port 6543
 * or session port 5432). Set DATABASE_SSL_CA to a PEM certificate to verify the server
 * certificate; without it TLS is used but the certificate is not verified (Supabase default).
 */
export function getPool(): Pool {
  if (pool) return pool;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set. Add the Supabase connection string in the environment.');
  }
  const local = ['localhost', '127.0.0.1', '[::1]'].includes(new URL(url).hostname);
  const ca = process.env.DATABASE_SSL_CA;
  pool = new Pool({
    connectionString: url,
    max: 8,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ssl: local ? false : ca ? { ca, rejectUnauthorized: true } : { rejectUnauthorized: false }
  });
  pool.on('error', (err) => console.error('[db] idle client error:', err.message));
  return pool;
}

/** Anything that can run a query: the pool or a transaction client. */
export type Queryable = {
  query: (text: string, params?: unknown[]) => Promise<{ rows: any[]; rowCount: number | null }>;
};
