-- EduLevel core schema.
-- RLS is enabled on every table with NO policies: anon and authenticated roles get nothing.
-- The Next.js server uses SUPABASE_SERVICE_ROLE_KEY (server-only), which bypasses RLS.

create table if not exists public.users (
  id text primary key,
  username text,
  full_name text not null default '',
  phone text not null default '',
  email text not null default '',
  password_hash text not null,
  track text not null default 'general' check (track in ('ielts', 'cefr', 'general')),
  level text not null default 'A2' check (level in ('A2', 'B1', 'B2', 'C1')),
  goal text not null default '',
  vip_until timestamptz,
  blocked boolean not null default false,
  blocked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists users_phone_key on public.users (phone) where phone <> '';
create unique index if not exists users_email_key on public.users (lower(email)) where email <> '';

create table if not exists public.sessions (
  token_hash text primary key,
  user_id text references public.users (id) on delete cascade,
  is_owner boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists sessions_expires_idx on public.sessions (expires_at);

create table if not exists public.courses (
  id text primary key,
  title text not null,
  description text not null default '',
  level text not null default 'A2',
  position integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  video_url text not null default '',
  position integer not null default 0,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists lessons_course_idx on public.lessons (course_id, position);

create table if not exists public.lesson_progress (
  user_id text not null references public.users (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  completed boolean not null default false,
  position_seconds integer not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Practice exercises: Reading / Listening / Speaking / Writing.
create table if not exists public.exercises (
  id text primary key,
  skill text not null check (skill in ('reading', 'listening', 'speaking', 'writing')),
  level text not null check (level in ('A2', 'B1', 'B2', 'C1')),
  title text not null,
  passage text not null default '',
  audio_url text not null default '',
  prompt text not null default '',
  questions jsonb not null default '[]'::jsonb,
  -- Answer keys live here and are NEVER sent to students before they submit.
  status text not null default 'draft' check (status in ('draft', 'published')),
  source text not null default 'manual' check (source in ('owner_ai', 'teacher_text', 'manual')),
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists exercises_skill_status_idx on public.exercises (skill, status, level);

create table if not exists public.exercise_attempts (
  id text primary key,
  user_id text not null references public.users (id) on delete cascade,
  exercise_id text not null references public.exercises (id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score integer,
  max_score integer,
  feedback jsonb,
  created_at timestamptz not null default now()
);
create index if not exists exercise_attempts_user_idx on public.exercise_attempts (user_id, created_at desc);

create table if not exists public.deposits (
  id text primary key,
  user_id text not null references public.users (id) on delete cascade,
  amount integer not null check (amount > 0),
  plan_id text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  note text not null default '',
  decided_by text,
  decided_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists deposits_status_idx on public.deposits (status, created_at desc);

create table if not exists public.support_tickets (
  id text primary key,
  user_id text references public.users (id) on delete set null,
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open', 'answered', 'closed')),
  reply text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id bigint generated always as identity primary key,
  user_id text not null references public.users (id) on delete cascade,
  role text not null check (role in ('user', 'ai')),
  content text not null,
  created_at timestamptz not null default now()
);
create index if not exists chat_messages_user_idx on public.chat_messages (user_id, created_at);

create table if not exists public.reviews (
  id text primary key,
  name text not null,
  subtitle text not null default '',
  text text not null,
  rating integer check (rating between 1 and 5),
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

create table if not exists public.vip_plans (
  id text primary key,
  name text not null,
  price integer not null check (price >= 0),
  period_days integer not null check (period_days > 0),
  description text not null default '',
  position integer not null default 0,
  active boolean not null default true
);

-- Single-row settings (teacher profile, landing sections, theme).
create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.courses enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.exercises enable row level security;
alter table public.exercise_attempts enable row level security;
alter table public.deposits enable row level security;
alter table public.support_tickets enable row level security;
alter table public.chat_messages enable row level security;
alter table public.reviews enable row level security;
alter table public.vip_plans enable row level security;
alter table public.site_settings enable row level security;
