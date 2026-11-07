-- OnWatch: daily email brief and newsletter subscribers.
-- Run once in Supabase: SQL Editor → New query → paste → Run.

-- A private token per user for one-click unsubscribe links, and the last day a brief was sent.
alter table public.profiles add column if not exists email_token uuid not null default gen_random_uuid();
alter table public.profiles add column if not exists last_brief_on date;

-- People who signed up for the free brief from a public stock page (no account needed).
create table if not exists public.subscribers (
  id bigint generated always as identity primary key,
  email text not null unique check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and length(email) <= 254),
  tickers text[] not null default '{}',
  token uuid not null default gen_random_uuid(),
  confirmed boolean not null default false,
  unsubscribed boolean not null default false,
  source text,
  last_brief_on date,
  created_at timestamptz not null default now()
);

-- Row-level security on, with no policies: only the server (secret key) can read or write.
alter table public.subscribers enable row level security;
