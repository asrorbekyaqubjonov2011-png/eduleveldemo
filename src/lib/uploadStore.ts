import { randomBytes } from 'crypto';
import { getPool } from './db/pool';

/**
 * Files kept in the application database when no external storage is available.
 * The table is created on first use, so no manual migration is needed.
 */

let ready: Promise<void> | null = null;

function ensureTable(): Promise<void> {
  if (!ready) {
    ready = getPool()
      .query(`create table if not exists public.uploads (
        id text primary key,
        owner_id text not null,
        visibility text not null default 'public',
        mime text not null,
        data bytea not null,
        created_at timestamptz not null default now()
      )`)
      .then(() => undefined)
      .catch((err) => {
        ready = null;
        throw err;
      });
  }
  return ready;
}

/** Stores the bytes and returns the site URL that serves them. */
export async function saveUpload(bytes: Buffer, mime: string, ownerId: string, visibility: 'public' | 'private' | 'book'): Promise<string> {
  await ensureTable();
  const id = randomBytes(12).toString('hex');
  await getPool().query(
    'insert into public.uploads (id, owner_id, visibility, mime, data) values ($1, $2, $3, $4, $5)',
    [id, ownerId, visibility, mime, bytes]
  );
  return `/api/uploads/${id}`;
}

export interface StoredUpload {
  owner_id: string;
  visibility: 'public' | 'private' | 'book';
  mime: string;
  data: Buffer;
}

/** Reads a stored upload by id (ids are random 24-character hex strings). */
export async function readUpload(id: string): Promise<StoredUpload | null> {
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  await ensureTable();
  const { rows } = await getPool().query('select owner_id, visibility, mime, data from public.uploads where id = $1', [id]);
  return (rows[0] as StoredUpload) ?? null;
}
