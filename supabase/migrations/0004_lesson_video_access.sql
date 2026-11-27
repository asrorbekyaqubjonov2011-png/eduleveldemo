-- Lesson video access: VIP tiers allowed per video and an optional Bunny Stream video id.
-- Additive only: no existing rows or columns are changed or deleted.
-- Not applied to production by this change. The owner applies it after review.

alter table public.lessons add column if not exists video_tiers text[] not null default '{}';
alter table public.lessons add column if not exists bunny_video_id text;
