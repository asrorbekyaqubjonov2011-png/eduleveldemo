-- Owner can see the entry code of a test at any time, and the current unlock code of a blocked attempt until it
-- expires or is used. Both are 6-digit classroom codes (not passwords). The hashes stay in place for checking.
-- Additive only.
alter table public.level_tests add column if not exists entry_code_plain text;
alter table public.level_attempts add column if not exists unlock_code_plain text;
