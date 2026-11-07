-- OnWatch database schema.
-- Run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- Row-level security makes sure each person can only read and change their own data.

-- ---------------------------------------------------------------------------
-- Profiles: one row per user, created automatically at sign-up.
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text,
  brief_time text not null default '07:00',
  brief_channel text not null default 'email' check (brief_channel in ('email', 'line', 'push', 'none')),
  alert_big_move boolean not null default true,
  alert_earnings boolean not null default true,
  alert_mood_flip boolean not null default false,
  alert_undervalued boolean not null default false,
  onboarded boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Read own profile" on public.profiles
  for select using ((select auth.uid()) = id);
create policy "Update own profile" on public.profiles
  for update using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, first_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'first_name', split_part(coalesce(new.raw_user_meta_data ->> 'full_name', ''), ' ', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Holdings: the stocks each person owns. Shares and cost are optional.
-- ---------------------------------------------------------------------------
create table if not exists public.holdings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  ticker text not null check (ticker ~ '^[A-Z][A-Z.]{0,5}$'),
  shares numeric check (shares is null or shares >= 0),
  avg_cost numeric check (avg_cost is null or avg_cost >= 0),
  created_at timestamptz not null default now(),
  unique (user_id, ticker)
);

create index if not exists holdings_user_idx on public.holdings (user_id);

alter table public.holdings enable row level security;

create policy "Read own holdings" on public.holdings
  for select using ((select auth.uid()) = user_id);
create policy "Add own holdings" on public.holdings
  for insert with check ((select auth.uid()) = user_id);
create policy "Edit own holdings" on public.holdings
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "Remove own holdings" on public.holdings
  for delete using ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- Stock daily: shared "why it moved" write-ups, one per stock per day.
-- Written by the daily job with the secret key; readable by signed-in users.
-- Sharing them keeps AI costs flat no matter how many people sign up.
-- ---------------------------------------------------------------------------
create table if not exists public.stock_daily (
  ticker text not null,
  day date not null,
  change_pct numeric,
  why jsonb not null,
  created_at timestamptz not null default now(),
  primary key (ticker, day)
);

alter table public.stock_daily enable row level security;

create policy "Signed-in users read stock write-ups" on public.stock_daily
  for select to authenticated using (true);

-- Keep updated_at fresh on profile edits.
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute procedure public.touch_updated_at();
