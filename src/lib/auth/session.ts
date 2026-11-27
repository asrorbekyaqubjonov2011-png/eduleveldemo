import { createHash, randomBytes } from 'crypto';
import { currentContext, requireContext } from '../db/context';
import type { Queryable } from '../db/pool';

export type SessionRole = 'student' | 'owner';

export interface SessionRecord {
  tokenHash: string;
  userId: string;
  role: SessionRole;
  expiresAt: number;
}

export const SESSION_COOKIE = 'el_session';
export const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Identifier of the owner in responses and session records (the owner has no users row). */
export const OWNER_ID = 'owner-edulevel';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** Looks up a session by cookie token. Expired sessions are ignored. */
export async function resolveSession(q: Queryable, token: string | null | undefined): Promise<SessionRecord | null> {
  if (!token) return null;
  const tokenHash = hashToken(token);
  const { rows } = await q.query(
    'select user_id, is_owner, extract(epoch from expires_at) * 1000 as expires_ms from public.sessions where token_hash = $1 and expires_at > now()',
    [tokenHash]
  );
  const row = rows[0];
  if (!row) return null;
  return {
    tokenHash,
    userId: row.is_owner ? OWNER_ID : row.user_id,
    role: row.is_owner ? 'owner' : 'student',
    expiresAt: Number(row.expires_ms)
  };
}

/** Session already resolved for this request (set by the database wrapper), if the token matches. */
export function getSession(token: string | null | undefined): SessionRecord | null {
  const ctx = currentContext();
  if (!ctx || !token || !ctx.session) return null;
  return ctx.session.tokenHash === hashToken(token) ? ctx.session : null;
}

export async function createSession(userId: string, role: SessionRole): Promise<{ token: string; record: SessionRecord }> {
  const { client } = requireContext();
  const token = randomBytes(32).toString('base64url');
  const tokenHash = hashToken(token);
  const isOwner = role === 'owner';
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await client.query(
    'insert into public.sessions (token_hash, user_id, is_owner, expires_at) values ($1, $2, $3, $4)',
    [tokenHash, isOwner ? null : userId, isOwner, expiresAt.toISOString()]
  );
  return { token, record: { tokenHash, userId: isOwner ? OWNER_ID : userId, role, expiresAt: expiresAt.getTime() } };
}

export async function deleteSession(token: string | null | undefined): Promise<void> {
  if (!token) return;
  const { client } = requireContext();
  await client.query('delete from public.sessions where token_hash = $1', [hashToken(token)]);
}

export async function revokeUserSessions(userId: string, role?: SessionRole): Promise<void> {
  const { client } = requireContext();
  if (role === 'owner') {
    await client.query('delete from public.sessions where is_owner = true');
    return;
  }
  await client.query('delete from public.sessions where user_id = $1 and is_owner = false', [userId]);
}
