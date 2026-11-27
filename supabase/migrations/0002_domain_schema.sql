-- EduLevel domain schema (replaces the first draft in 0001, which was never used by the app).
-- Scope agreed with the owner: core learning flows, coins/points, leaderboard, live stream.
-- Removed on purpose: clans, global chat, olympiad, creators, notifications, blacklist.
--
-- Access model: RLS is ON everywhere with NO policies. anon/authenticated roles get nothing.
-- The Next.js server uses SUPABASE_SERVICE_ROLE_KEY (server-only), which bypasses RLS.
-- Answer keys (questions.correct_answer_index) are therefore never exposed to browsers.

drop table if exists public.exercise_attempts, public.exercises, public.lesson_progress, public.lessons,
  public.courses, public.chat_messages, public.deposits, public.support_tickets, public.reviews,
  public.vip_plans, public.site_settings, public.sessions, public.users cascade;

-- Students -------------------------------------------------------------------

create table public.users (
  id text primary key,
  name text not null default '',
  surname text not null default '',
  phone text not null default '',
  email text,
  telegram_username text,
  additional_phone text,
  password_hash text not null,
  vip_tier text not null default 'none',
  vip_expires_at timestamptz,
  track text check (track in ('ielts', 'cefr', 'general')),
  target_score text,
  target_band text,
  study_time_daily text,
  region text,
  avatar text,
  avatar_frame text,
  name_color text,
  custom_title text,
  rank_title text,
  balance bigint not null default 0,
  coins bigint not null default 0,
  points bigint not null default 0,
  xp bigint not null default 0,
  streak_days integer not null default 0,
  streak_freeze_count integer not null default 0,
  last_active_date date,
  last_daily_quest_date date,
  inventory text[] not null default '{}',
  purchased_item_ids text[] not null default '{}',
  read_book_ids text[] not null default '{}',
  completed_pack_ids text[] not null default '{}',
  is_blocked boolean not null default false,
  ban_level smallint not null default 0 check (ban_level in (0, 1, 2)),
  banned_until timestamptz,
  ban_reason text,
  registered_at timestamptz not null default now()
);
create unique index users_phone_key on public.users (phone) where phone <> '';
create unique index users_email_key on public.users (lower(email)) where email is not null and email <> '';
create index users_points_idx on public.users (points desc);

-- Login sessions. Only a hash of the token is stored.
create table public.sessions (
  token_hash text primary key,
  -- No foreign key: a session can be created in the same request that creates the user row
  -- (rows are written at the end of the request). Sessions of unknown users are ignored on lookup.
  user_id text,
  is_owner boolean not null default false,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index sessions_expires_idx on public.sessions (expires_at);

-- The single owner/teacher login (one row).
create table public.owner_account (
  id smallint primary key default 1 check (id = 1),
  username text not null,
  password_hash text not null,
  updated_at timestamptz not null default now()
);

-- Courses, modules, lessons ----------------------------------------------------

create table public.courses (
  id text primary key,
  title text not null,
  description text not null default '',
  level text not null default 'general',
  track text check (track in ('ielts', 'cefr', 'general')),
  price integer not null default 0,
  cover_color text not null default '',
  cover_icon text not null default '',
  published boolean not null default false,
  required_vip text not null default 'none',
  position integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.course_modules (
  id text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  title text not null,
  order_index integer not null default 0
);

create table public.lessons (
  id text primary key,
  course_id text not null references public.courses (id) on delete cascade,
  module_id text,
  title text not null,
  description text not null default '',
  video_url text not null default '',
  subtitle_url text,
  pdf_url text,
  notes_markdown text,
  math_formula text,
  duration_minutes integer not null default 0,
  order_index integer not null default 0,
  test_id text,
  is_demo boolean not null default false,
  lesson_type text check (lesson_type in ('thematic', 'regular')),
  required_passing_percent integer,
  track text check (track in ('ielts', 'cefr', 'general')),
  lesson_code text,
  is_published boolean not null default true,
  resources jsonb not null default '[]'::jsonb,
  vocabulary_keywords jsonb not null default '[]'::jsonb,
  homework text
);
create index lessons_course_idx on public.lessons (course_id, order_index);

create table public.lesson_progress (
  user_id text not null references public.users (id) on delete cascade,
  lesson_id text not null references public.lessons (id) on delete cascade,
  course_id text not null,
  position integer not null default 0,
  duration integer not null default 0,
  watched_seconds integer not null default 0,
  completed boolean not null default false,
  xp_awarded boolean not null default false,
  watched boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

-- Tests and exams --------------------------------------------------------------

create table public.tests (
  id text primary key,
  title text not null,
  description text not null default '',
  type text not null,
  duration_minutes integer not null default 0,
  max_score integer not null default 0,
  required_vip text not null default 'none',
  published boolean not null default false,
  questions_count integer not null default 0,
  passing_score integer,
  category text,
  track text check (track in ('ielts', 'cefr', 'general')),
  created_at timestamptz not null default now()
);

-- correct_answer_index is a server-only answer key.
create table public.questions (
  id text primary key,
  test_id text not null references public.tests (id) on delete cascade,
  position integer not null default 0,
  prompt text not null,
  math_formula text,
  options jsonb not null default '[]'::jsonb,
  correct_answer_index integer not null default 0,
  explanation text not null default '',
  difficulty text not null default 'medium' check (difficulty in ('easy', 'medium', 'hard')),
  points integer
);
create index questions_test_idx on public.questions (test_id, position);

create table public.test_attempts (
  id text primary key,
  user_id text references public.users (id) on delete set null,
  user_name text not null default '',
  test_id text not null,
  test_title text not null default '',
  score integer not null default 0,
  max_score integer not null default 0,
  correct_count integer not null default 0,
  total_questions integer not null default 0,
  answers jsonb not null default '{}'::jsonb,
  time_spent_seconds integer not null default 0,
  percentage numeric,
  track text,
  cefr_level text,
  created_at timestamptz not null default now()
);
create index test_attempts_user_idx on public.test_attempts (user_id, created_at desc);

create table public.exam_sessions (
  id text primary key,
  owner_key text not null,
  test_id text not null,
  kind text not null check (kind in ('mock', 'reading', 'listening')),
  started_at timestamptz not null,
  ends_at timestamptz not null,
  answers jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  submitted_attempt_id text
);
create index exam_sessions_owner_idx on public.exam_sessions (owner_key);

-- Catalog content (reading/listening/writing/speaking sets, books, vocab, packs, shop, student results).
-- Stored as documents: these are edited as a whole by the owner and are never queried field by field.
create table public.content_items (
  kind text not null,
  id text not null,
  position integer not null default 0,
  data jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (kind, id)
);

-- Per-student records: writing/speaking submissions and flashcards.
create table public.user_records (
  kind text not null,
  id text not null,
  user_id text not null references public.users (id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now(),
  primary key (kind, id)
);
create index user_records_user_idx on public.user_records (user_id, kind, created_at desc);

-- AI tutor history and daily AI usage per student.
create table public.ai_threads (
  user_id text primary key references public.users (id) on delete cascade,
  threads jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

create table public.ai_usage (
  user_id text not null references public.users (id) on delete cascade,
  day date not null,
  count integer not null default 0,
  by_operation jsonb not null default '{}'::jsonb,
  primary key (user_id, day)
);

-- Money, support, reviews ---------------------------------------------------------

create table public.deposits (
  id text primary key,
  user_id text not null references public.users (id) on delete cascade,
  amount bigint not null check (amount > 0),
  status text not null default 'pending' check (status in ('pending', 'completed', 'rejected')),
  method text not null default 'manual' check (method in ('telegram_bot', 'card', 'manual')),
  payment_code text not null default '',
  receipt_url text,
  card_number text,
  note text,
  created_at timestamptz not null default now(),
  approved_at timestamptz
);
create index deposits_status_idx on public.deposits (status, created_at desc);

create table public.support_tickets (
  id text primary key,
  user_id text references public.users (id) on delete set null,
  user_name text not null default '',
  user_phone text not null default '',
  message text not null,
  category text not null default 'boshqa' check (category in ('kurs', 'tolov', 'texnik', 'boshqa')),
  status text not null default 'new' check (status in ('new', 'answered', 'closed')),
  reply_text text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index support_tickets_status_idx on public.support_tickets (status, created_at desc);

create table public.reviews (
  id text primary key,
  user_id text references public.users (id) on delete set null,
  name text not null,
  subtitle text,
  track text check (track in ('ielts', 'cefr', 'general')),
  text text not null,
  rating integer check (rating between 1 and 5),
  photo_url text,
  status text not null default 'pending' check (status in ('pending', 'approved', 'hidden')),
  created_at timestamptz not null default now()
);

-- Site content -------------------------------------------------------------------

create table public.vip_plans (
  id text primary key,
  name text not null,
  price_monthly bigint not null check (price_monthly >= 0),
  duration_days integer not null check (duration_days > 0),
  description text not null default '',
  badge text,
  features jsonb not null default '[]'::jsonb,
  has_ai boolean not null default false,
  ai_daily_limit integer not null default 0,
  book_allowance_count integer,
  is_popular boolean not null default false,
  position integer not null default 0
);

create table public.site_sections (
  id text primary key,
  key text not null unique,
  title text not null default '',
  subtitle text not null default '',
  cta_text text,
  cta_link text,
  is_visible boolean not null default true,
  order_index integer not null default 0,
  custom_data jsonb
);

create table public.faqs (
  id text primary key,
  question text not null,
  answer text not null,
  order_index integer not null default 0,
  is_visible boolean not null default true
);

-- Single-row settings: teacher_profile, site_theme, live_stream, payment_settings.
create table public.site_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table public.promo_codes (
  id text primary key,
  code text not null,
  plan_discounts jsonb not null default '{}'::jsonb,
  max_uses integer not null default 0 check (max_uses >= 0),
  used_count integer not null default 0 check (used_count >= 0),
  expires_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index promo_codes_code_key on public.promo_codes (upper(code));

create table public.audit_logs (
  id text primary key,
  actor text not null,
  action text not null,
  entity text not null,
  details text not null default '',
  created_at timestamptz not null default now()
);
create index audit_logs_created_idx on public.audit_logs (created_at desc);

-- RLS: on for every table, no policies (server-only access).
alter table public.users enable row level security;
alter table public.sessions enable row level security;
alter table public.owner_account enable row level security;
alter table public.courses enable row level security;
alter table public.course_modules enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.tests enable row level security;
alter table public.questions enable row level security;
alter table public.test_attempts enable row level security;
alter table public.exam_sessions enable row level security;
alter table public.content_items enable row level security;
alter table public.user_records enable row level security;
alter table public.ai_threads enable row level security;
alter table public.ai_usage enable row level security;
alter table public.deposits enable row level security;
alter table public.support_tickets enable row level security;
alter table public.reviews enable row level security;
alter table public.vip_plans enable row level security;
alter table public.site_sections enable row level security;
alter table public.faqs enable row level security;
alter table public.site_settings enable row level security;
alter table public.audit_logs enable row level security;
alter table public.promo_codes enable row level security;
