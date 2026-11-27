import { randomInt } from 'crypto';
import { getPool } from './db/pool';

/**
 * Everything the bot remembers in the database: chats (private, groups, channels it was added to), referrals, quiz
 * polls and answers, and which question a chat is waiting on. Tables are created on first use, the same way uploads
 * are, so no migration step is needed.
 */
let ready: Promise<void> | null = null;

const SCHEMA = `
create table if not exists public.telegram_chats (
  chat_id text primary key,
  username text not null default '',
  first_name text not null default '',
  referred_by text,
  pending text,
  messages integer not null default 0,
  joined_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.telegram_chats add column if not exists chat_type text not null default 'private';
alter table public.telegram_chats add column if not exists title text not null default '';
alter table public.telegram_chats add column if not exists qualified_at timestamptz;
alter table public.telegram_chats add column if not exists referral_bundles integer not null default 0;
alter table public.telegram_chats add column if not exists last_reminder text;
alter table public.telegram_chats add column if not exists opted_out boolean not null default false;
alter table public.telegram_chats add column if not exists source text not null default '';
alter table public.telegram_chats add column if not exists reminders_off boolean not null default false;
alter table public.telegram_chats add column if not exists user_id text;
create table if not exists public.telegram_link_codes (
  code text primary key,
  user_id text not null,
  expires_at timestamptz not null
);
create table if not exists public.telegram_polls (
  poll_id text primary key,
  chat_id text not null,
  question_id text not null,
  correct integer not null,
  created_at timestamptz not null default now()
);
create table if not exists public.telegram_poll_answers (
  poll_id text not null,
  user_id text not null,
  option_id integer,
  correct boolean not null default false,
  name text not null default '',
  primary key (poll_id, user_id)
);
create table if not exists public.telegram_quiz_sessions (
  chat_id text primary key,
  test_id text not null,
  question_ids text[] not null,
  idx integer not null default 0,
  score integer not null default 0,
  started_at timestamptz not null default now()
);
`;

function ensureTables(): Promise<void> {
  if (!ready) {
    ready = getPool()
      .query(SCHEMA)
      .then(() => undefined)
      .catch((err) => {
        ready = null;
        throw err;
      });
  }
  return ready;
}

export interface ChatTouch {
  /** True the first time this chat writes to the bot. */
  isNew: boolean;
  /** The site account this chat was linked to with a code, if any. */
  userId: string | null;
  referredBy: string | null;
  /** The question the bot is waiting for an answer to ("search", "support", "speaking|topic", "ai", "word"). */
  pending: string | null;
}

/** Records a message from a chat (private, group or channel). `referrer` is only stored for a chat that is new. */
export async function touchChat(chatId: string, username: string, firstName: string, referrer: string | undefined, chatType: string, title: string): Promise<ChatTouch> {
  await ensureTables();
  const { rows } = await getPool().query(
    `insert into public.telegram_chats (chat_id, username, first_name, referred_by, chat_type, title)
     values ($1, $2, $3, $4, $5, $6)
     on conflict (chat_id) do update set
       username = excluded.username,
       first_name = excluded.first_name,
       chat_type = excluded.chat_type,
       title = excluded.title,
       last_seen = now(),
       messages = public.telegram_chats.messages + 1
     returning (xmax = 0) as is_new, referred_by, pending, user_id`,
    [chatId, username.slice(0, 64), firstName.slice(0, 64), referrer || null, chatType.slice(0, 20), title.slice(0, 120)]
  );
  const row = rows[0];
  return { isNew: !!row.is_new, userId: row.user_id ?? null, referredBy: row.referred_by ?? null, pending: row.pending ?? null };
}

export async function setPending(chatId: string, value: string | null): Promise<void> {
  await ensureTables();
  // A question can be asked before the chat row exists (a button in a new chat), so the row is created when needed.
  if (value === null) {
    await getPool().query('update public.telegram_chats set pending = null where chat_id = $1', [chatId]);
    return;
  }
  await getPool().query(
    `insert into public.telegram_chats (chat_id, pending) values ($1, $2)
     on conflict (chat_id) do update set pending = excluded.pending`,
    [chatId, value]
  );
}

/** Private chats only: broadcasts and the subscriber count never target groups or channels. */
export async function countSubscribers(): Promise<number> {
  await ensureTables();
  const { rows } = await getPool().query("select count(*)::int as n from public.telegram_chats where chat_type = 'private' and not opted_out");
  return rows[0]?.n || 0;
}

export async function subscriberBatch(offset: number, limit: number): Promise<string[]> {
  await ensureTables();
  const { rows } = await getPool().query("select chat_id from public.telegram_chats where chat_type = 'private' and not opted_out order by chat_id offset $1 limit $2", [offset, limit]);
  return rows.map((r) => String(r.chat_id));
}

export async function newSubscribersSince(days: number): Promise<number> {
  await ensureTables();
  const { rows } = await getPool().query("select count(*)::int as n from public.telegram_chats where chat_type = 'private' and not opted_out and joined_at > now() - ($1 || ' days')::interval", [String(days)]);
  return rows[0]?.n || 0;
}

/** Referral counts: how many chats came in with this chat's link, and how many of them finished a first lesson. */
export async function referralCounts(chatId: string): Promise<{ invited: number; qualified: number }> {
  await ensureTables();
  const { rows } = await getPool().query(
    'select count(*)::int as invited, count(qualified_at)::int as qualified from public.telegram_chats where referred_by = $1',
    [chatId]
  );
  return { invited: rows[0]?.invited || 0, qualified: rows[0]?.qualified || 0 };
}

export async function referralTotals(): Promise<{ invited: number; qualified: number; bundles: number }> {
  await ensureTables();
  const { rows } = await getPool().query(
    'select count(referred_by)::int as invited, count(qualified_at)::int as qualified, coalesce(sum(referral_bundles), 0)::int as bundles from public.telegram_chats'
  );
  return { invited: rows[0]?.invited || 0, qualified: rows[0]?.qualified || 0, bundles: rows[0]?.bundles || 0 };
}

export async function topReferrers(limit: number): Promise<Array<{ chatId: string; name: string; qualified: number }>> {
  await ensureTables();
  const { rows } = await getPool().query(
    `select r.referred_by as chat_id, coalesce(max(c.first_name), '') as name, count(r.qualified_at)::int as qualified
       from public.telegram_chats r
       left join public.telegram_chats c on c.chat_id = r.referred_by
      where r.referred_by is not null and r.qualified_at is not null
      group by r.referred_by
      order by qualified desc
      limit $1`,
    [limit]
  );
  return rows.map((r) => ({ chatId: String(r.chat_id), name: String(r.name || ''), qualified: r.qualified }));
}

/**
 * Marks the referred chat of this Telegram user as qualified (their first lesson is done). Returns the referrer's
 * chat id once, the first time; later calls return null, so a reward is never granted twice.
 */
export async function qualifyReferral(username: string): Promise<{ refereeChatId: string; referrerChatId: string } | null> {
  await ensureTables();
  const { rows } = await getPool().query(
    `update public.telegram_chats set qualified_at = now()
      where chat_id = (select chat_id from public.telegram_chats
                        where lower(username) = lower($1) and referred_by is not null and qualified_at is null
                        order by joined_at limit 1)
        and qualified_at is null
      returning chat_id, referred_by`,
    [username]
  );
  if (!rows[0] || !rows[0].referred_by) return null;
  return { refereeChatId: String(rows[0].chat_id), referrerChatId: String(rows[0].referred_by) };
}

export async function chatInfo(chatId: string): Promise<{ username: string; referralBundles: number } | null> {
  await ensureTables();
  const { rows } = await getPool().query('select username, referral_bundles from public.telegram_chats where chat_id = $1', [chatId]);
  if (!rows[0]) return null;
  return { username: rows[0].username || '', referralBundles: rows[0].referral_bundles || 0 };
}

export async function setReferralBundles(chatId: string, bundles: number): Promise<void> {
  await ensureTables();
  await getPool().query('update public.telegram_chats set referral_bundles = $2 where chat_id = $1', [chatId, bundles]);
}

/** Chats that should get the daily reminder today (linked to an account, not reminded yet today). */
export async function reminderCandidates(today: string, limit: number): Promise<Array<{ chatId: string; username: string }>> {
  await ensureTables();
  const { rows } = await getPool().query(
    `select chat_id, username from public.telegram_chats
      where chat_type = 'private' and username <> '' and not reminders_off and not opted_out and (last_reminder is distinct from $1)
      order by chat_id limit $2`,
    [today, limit]
  );
  return rows.map((r) => ({ chatId: String(r.chat_id), username: String(r.username) }));
}

export async function markReminded(chatId: string, today: string): Promise<void> {
  await ensureTables();
  await getPool().query('update public.telegram_chats set last_reminder = $2 where chat_id = $1', [chatId, today]);
}

/* ---------- quiz polls ---------- */

export async function savePoll(pollId: string, chatId: string, questionId: string, correct: number): Promise<void> {
  await ensureTables();
  await getPool().query(
    'insert into public.telegram_polls (poll_id, chat_id, question_id, correct) values ($1, $2, $3, $4) on conflict (poll_id) do nothing',
    [pollId, chatId, questionId, correct]
  );
}

export async function getPoll(pollId: string): Promise<{ chatId: string; questionId: string; correct: number } | null> {
  await ensureTables();
  const { rows } = await getPool().query('select chat_id, question_id, correct from public.telegram_polls where poll_id = $1', [pollId]);
  if (!rows[0]) return null;
  return { chatId: String(rows[0].chat_id), questionId: String(rows[0].question_id), correct: rows[0].correct };
}

/** Records one answer per user per poll. Returns false when this user already answered this poll. */
export async function recordAnswer(pollId: string, userId: string, optionId: number | null, correct: boolean, name: string): Promise<boolean> {
  await ensureTables();
  const { rowCount } = await getPool().query(
    `insert into public.telegram_poll_answers (poll_id, user_id, option_id, correct, name) values ($1, $2, $3, $4, $5)
     on conflict (poll_id, user_id) do nothing`,
    [pollId, userId, optionId, correct, name.slice(0, 64)]
  );
  return (rowCount || 0) > 0;
}

export async function groupLeaderboard(chatId: string, limit: number): Promise<Array<{ name: string; correct: number; answered: number }>> {
  await ensureTables();
  const { rows } = await getPool().query(
    `select max(pa.name) as name, count(*) filter (where pa.correct)::int as correct, count(*)::int as answered
       from public.telegram_poll_answers pa
       join public.telegram_polls p on p.poll_id = pa.poll_id
      where p.chat_id = $1
      group by pa.user_id
      order by correct desc, answered asc
      limit $2`,
    [chatId, limit]
  );
  return rows.map((r) => ({ name: String(r.name || 'Ishtirokchi'), correct: r.correct, answered: r.answered }));
}

/* ---------- private test sessions ---------- */

export interface QuizSession {
  testId: string;
  questionIds: string[];
  idx: number;
  score: number;
}

export async function startSession(chatId: string, testId: string, questionIds: string[]): Promise<void> {
  await ensureTables();
  await getPool().query(
    `insert into public.telegram_quiz_sessions (chat_id, test_id, question_ids, idx, score) values ($1, $2, $3, 0, 0)
     on conflict (chat_id) do update set test_id = excluded.test_id, question_ids = excluded.question_ids, idx = 0, score = 0, started_at = now()`,
    [chatId, testId, questionIds]
  );
}

export async function getSession(chatId: string): Promise<QuizSession | null> {
  await ensureTables();
  const { rows } = await getPool().query('select test_id, question_ids, idx, score from public.telegram_quiz_sessions where chat_id = $1', [chatId]);
  if (!rows[0]) return null;
  return { testId: String(rows[0].test_id), questionIds: rows[0].question_ids.map(String), idx: rows[0].idx, score: rows[0].score };
}

export async function advanceSession(chatId: string, score: number): Promise<void> {
  await ensureTables();
  await getPool().query('update public.telegram_quiz_sessions set idx = idx + 1, score = $2 where chat_id = $1', [chatId, score]);
}

export async function endSession(chatId: string): Promise<void> {
  await ensureTables();
  await getPool().query('delete from public.telegram_quiz_sessions where chat_id = $1', [chatId]);
}

/** The student's private chat with the bot, found by their Telegram username. */
export async function privateChatForUsername(username: string): Promise<string | null> {
  await ensureTables();
  const { rows } = await getPool().query(
    "select chat_id from public.telegram_chats where lower(username) = lower($1) and chat_type = 'private' order by last_seen desc limit 1",
    [username.replace(/^@/, '')]
  );
  return rows[0] ? String(rows[0].chat_id) : null;
}

/** Per-chat switches the student controls: stop broadcasts (opted_out) and stop daily reminders (reminders_off). */
export async function setChatFlag(chatId: string, flag: 'opted_out' | 'reminders_off', value: boolean): Promise<void> {
  // The column name is interpolated, so only the two known switches may ever reach the query.
  if (flag !== 'opted_out' && flag !== 'reminders_off') throw new Error('unknown chat flag');
  await ensureTables();
  await getPool().query(`update public.telegram_chats set ${flag} = $2 where chat_id = $1`, [chatId, value]);
}

export async function chatFlags(chatId: string): Promise<{ optedOut: boolean; remindersOff: boolean }> {
  await ensureTables();
  const { rows } = await getPool().query('select opted_out, reminders_off from public.telegram_chats where chat_id = $1', [chatId]);
  return { optedOut: !!rows[0]?.opted_out, remindersOff: !!rows[0]?.reminders_off };
}

/** A short code the student gets on the site; sending it to the bot links that chat to their account. */
export async function createLinkCode(userId: string): Promise<string> {
  await ensureTables();
  await getPool().query('delete from public.telegram_link_codes where expires_at < now()');
  const code = randomInt(0, 36 ** 6).toString(36).toUpperCase().padStart(6, '0');
  await getPool().query("insert into public.telegram_link_codes (code, user_id, expires_at) values ($1, $2, now() + interval '30 minutes')", [code, userId]);
  return code;
}

/** Uses a link code once. Returns the account id, or null when the code is unknown or expired. */
export async function consumeLinkCode(code: string): Promise<string | null> {
  await ensureTables();
  const { rows } = await getPool().query(
    'delete from public.telegram_link_codes where code = $1 and expires_at > now() returning user_id',
    [code.trim().toUpperCase()]
  );
  return rows[0] ? String(rows[0].user_id) : null;
}

export async function linkChatToUser(chatId: string, userId: string | null): Promise<void> {
  await ensureTables();
  await getPool().query('update public.telegram_chats set user_id = $2 where chat_id = $1', [chatId, userId]);
}

/** The campaign a chat came from (t.me/<bot>?start=utm_<name>). Only the first one is kept. */
export async function setSource(chatId: string, source: string): Promise<void> {
  await ensureTables();
  await getPool().query("update public.telegram_chats set source = $2 where chat_id = $1 and source = ''", [chatId, source.slice(0, 64)]);
}

export async function sourceCounts(limit: number): Promise<Array<{ source: string; count: number }>> {
  await ensureTables();
  const { rows } = await getPool().query("select source, count(*)::int as n from public.telegram_chats where source <> '' group by source order by n desc limit $1", [limit]);
  return rows.map((r) => ({ source: String(r.source), count: r.n }));
}

/** Removes the chat's record (the student's own choice, from /ochirish). */
export async function forgetChat(chatId: string): Promise<void> {
  await ensureTables();
  await getPool().query('delete from public.telegram_chats where chat_id = $1', [chatId]);
}
