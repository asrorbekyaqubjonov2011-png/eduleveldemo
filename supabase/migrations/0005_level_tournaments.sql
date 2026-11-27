-- Level tests ("Levelni aniqlash") and tournaments: additive only, nothing existing is changed or dropped.
-- Access model matches 0002: RLS ON with no policies; only the server (service role) reads and writes.
-- Answer keys (correct_index) and unlock/entry codes are stored hashed or server-only and never sent to browsers.

create table if not exists public.level_tests (
  id text primary key,
  kind text not null default 'test' check (kind in ('test', 'tournament')),
  title text not null,
  description text not null default '',
  -- open: anyone who can see the section may start. code: a student needs the entry code the owner set.
  access text not null default 'open' check (access in ('open', 'code')),
  entry_code_hash text,
  status text not null default 'draft' check (status in ('draft', 'published', 'closed')),
  time_limit_seconds integer not null default 1800 check (time_limit_seconds between 60 and 14400),
  attempts_allowed integer not null default 1 check (attempts_allowed between 1 and 10),
  starts_at timestamptz,
  ends_at timestamptz,
  -- Owner-defined grading: [{"min": 0, "max": 40, "level": "A1", "certificate": false}, ...] (percent based).
  grading_rules jsonb not null default '[]'::jsonb,
  certificate_enabled boolean not null default false,
  shuffle_questions boolean not null default true,
  -- Anti-cheat policy chosen by the owner. Defaults keep the exam fullscreen with two warnings before a block.
  require_fullscreen boolean not null default true,
  max_violations integer not null default 2 check (max_violations between 0 and 10),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.level_questions (
  id text primary key,
  test_id text not null references public.level_tests(id) on delete cascade,
  position integer not null default 0,
  prompt text not null,
  options jsonb not null default '[]'::jsonb,
  correct_index integer not null,
  points integer not null default 1 check (points between 1 and 100),
  explanation text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.level_attempts (
  id text primary key,
  test_id text not null references public.level_tests(id) on delete cascade,
  -- Logged-in student account, or null for a guest who entered a code (name, surname and class are required then).
  user_id text references public.users(id) on delete set null,
  first_name text not null default '',
  last_name text not null default '',
  class_name text not null default '',
  status text not null default 'in_progress' check (status in ('in_progress', 'finished', 'blocked', 'expired', 'abandoned')),
  attempt_no integer not null default 1,
  started_at timestamptz not null default now(),
  deadline_at timestamptz not null,
  finished_at timestamptz,
  score integer,
  max_score integer,
  percent numeric(5, 2),
  level_label text,
  certificate_code text unique,
  violations integer not null default 0,
  blocked_at timestamptz,
  -- Owner-issued unlock code for a blocked attempt: stored hashed, single use.
  unlock_code_hash text,
  unlock_code_expires_at timestamptz,
  answers jsonb not null default '{}'::jsonb,
  question_order jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists level_questions_test_idx on public.level_questions(test_id, position);
create index if not exists level_attempts_test_idx on public.level_attempts(test_id, status);
create index if not exists level_attempts_user_idx on public.level_attempts(user_id, created_at desc);

alter table public.level_tests enable row level security;
alter table public.level_questions enable row level security;
alter table public.level_attempts enable row level security;
