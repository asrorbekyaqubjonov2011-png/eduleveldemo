-- EduLevel: row level security for the tables the app creates at runtime, and missing indexes.
-- Additive only: no data is changed, no table or index is dropped.
--
-- Why RLS is safe here: the Next.js server connects with DATABASE_URL as the Supabase `postgres`
-- role, which has rolbypassrls = true. Enabling RLS with no policies therefore does not change what
-- the server can read or write, while the anon and authenticated roles (used by browsers and
-- PostgREST) get no rows from these tables.
--
-- The six tables below are created by application code (src/lib/uploadStore.ts and
-- src/lib/telegramStore.ts) with "create table if not exists". They are mirrored here with the same
-- statements, so this migration also works on a fresh database where the app has not run yet.
-- On databases where they already exist, every statement is a no-op.

-- Files kept in the database when Supabase Storage is not used (src/lib/uploadStore.ts).
create table if not exists public.uploads (
  id text primary key,
  owner_id text not null,
  visibility text not null default 'public',
  mime text not null,
  data bytea not null,
  created_at timestamptz not null default now()
);

-- Telegram bot state (src/lib/telegramStore.ts).
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

-- 1. Row level security: deny anon and authenticated, server (bypassrls) unaffected. No policies on purpose.
alter table public.uploads enable row level security;
alter table public.telegram_chats enable row level security;
alter table public.telegram_polls enable row level security;
alter table public.telegram_poll_answers enable row level security;
alter table public.telegram_quiz_sessions enable row level security;
alter table public.telegram_link_codes enable row level security;

-- 2. Foreign keys without a covering index (Supabase advisor unindexed_foreign_keys).
-- Deletes of the parent rows (users, lessons, courses) scan these tables without the index.
create index if not exists course_modules_course_id_idx on public.course_modules (course_id);
create index if not exists deposits_user_id_idx on public.deposits (user_id);
create index if not exists lesson_progress_lesson_id_idx on public.lesson_progress (lesson_id);
create index if not exists reviews_user_id_idx on public.reviews (user_id);
create index if not exists support_tickets_user_id_idx on public.support_tickets (user_id);
create index if not exists sessions_user_id_idx on public.sessions (user_id); -- revokeUserSessions: where user_id = $1

-- 3. ORDER BY columns of the full snapshot load (src/lib/db/snapshot.ts loadDatabase) on tables that grow
-- with student activity. Sorting a large table by these columns uses the index instead of a sort.
create index if not exists users_registered_idx on public.users (registered_at, id);
create index if not exists test_attempts_created_idx on public.test_attempts (created_at);
create index if not exists user_records_created_idx on public.user_records (created_at);
create index if not exists deposits_created_idx on public.deposits (created_at);
create index if not exists support_tickets_created_idx on public.support_tickets (created_at);
create index if not exists reviews_created_idx on public.reviews (created_at);

-- 4. Telegram bot predicates and joins (src/lib/telegramStore.ts).
create index if not exists telegram_chats_username_lower_idx on public.telegram_chats (lower(username)); -- qualifyReferral, privateChatForUsername
create index if not exists telegram_chats_referred_by_idx on public.telegram_chats (referred_by); -- referralCounts, topReferrers
create index if not exists telegram_chats_private_chat_idx on public.telegram_chats (chat_id)
  where chat_type = 'private' and not opted_out; -- subscriberBatch, reminderCandidates, subscriber counts
create index if not exists telegram_polls_chat_id_idx on public.telegram_polls (chat_id); -- groupLeaderboard join filter
create index if not exists telegram_link_codes_expires_idx on public.telegram_link_codes (expires_at); -- createLinkCode cleanup
