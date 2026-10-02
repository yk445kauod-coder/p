-- Add the subscription tier to profiles.
--
-- Existing readers default to 'free'; a paid plan flips this to 'pro'. The
-- column is the server-side source of truth that the `agent` edge function
-- re-checks before spending model tokens on a free reader.
alter table public.profiles
  add column if not exists plan text not null default 'free';

alter table public.profiles
  drop constraint if exists profiles_plan_check;

alter table public.profiles
  add constraint profiles_plan_check check (plan in ('free', 'pro'));
