-- saaspocalypse — Postgres schema (Supabase)
-- Apply via the Supabase SQL editor, or (later) via `supabase db push` with migrations.

create extension if not exists "pgcrypto";

create table if not exists reports (
  id              uuid primary key default gen_random_uuid(),
  domain          text unique not null,
  slug            text unique not null,
  name            text not null,
  tagline         text not null,

  tier            text not null check (tier in ('WEEKEND','MONTH','DON''T')),
  score           int  not null check (score between 0 and 100),
  confidence      int,

  take            text not null,
  take_sub        text not null,
  time_estimate   text not null,
  time_breakdown  text not null,
  break_even      text not null,

  est_total       jsonb not null,
  current_cost    jsonb not null,
  est_cost        jsonb not null,
  alternatives    jsonb not null,
  challenges      jsonb not null,
  stack           jsonb not null,

  scanned_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists reports_created_at_idx on reports (created_at desc);
create index if not exists reports_tier_score_idx on reports (tier, score desc);

alter table reports enable row level security;

-- Public read: anyone (including anon) can SELECT reports. Writes happen
-- server-side via the service-role key, which bypasses RLS.
drop policy if exists "reports are publicly readable" on reports;
create policy "reports are publicly readable"
  on reports for select
  to anon, authenticated
  using (true);

-- updated_at trigger
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists reports_set_updated_at on reports;
create trigger reports_set_updated_at
  before update on reports
  for each row execute function set_updated_at();
