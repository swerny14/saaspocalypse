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

  view_count      integer not null default 0,

  scanned_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists reports_created_at_idx on reports (created_at desc);
create index if not exists reports_tier_score_idx on reports (tier, score desc);
create index if not exists reports_view_count_idx on reports (view_count desc);

create or replace function increment_report_view_count(p_slug text)
returns void language sql as $$
  update reports set view_count = view_count + 1 where slug = p_slug;
$$;

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

-- ───────────────────────────── build guides ─────────────────────────────

create table if not exists build_guides (
  id               uuid primary key default gen_random_uuid(),
  report_id        uuid unique not null references reports(id) on delete cascade,

  overview         text  not null,
  prerequisites    jsonb not null,   -- string[]
  steps            jsonb not null,   -- see Zod schema
  stack_specifics  jsonb not null,   -- { libraries, references }
  pitfalls         jsonb not null,   -- [{ title, body }]

  model            text  not null,
  input_tokens     int,
  output_tokens    int,

  generated_at     timestamptz not null default now()
);

alter table build_guides enable row level security;
-- No public read policy: guides are only served server-side via admin client
-- after an access_token check. Anon/authenticated roles get zero visibility.

-- ─────────────────────────── guide purchases ───────────────────────────

create table if not exists build_guide_purchases (
  id                  uuid primary key default gen_random_uuid(),
  report_id           uuid not null references reports(id) on delete cascade,
  user_id             uuid,
  email               text not null,
  stripe_session_id   text unique,
  amount_cents        int  not null,
  status              text not null check (status in ('pending','paid','failed','refunded')),
  access_token        text unique not null,
  -- Legal-consent record captured in the purchase modal before checkout.
  -- Versions are ISO date strings matching the constants in lib/legal/{terms,privacy}.ts.
  terms_version       text,
  privacy_version     text,
  terms_accepted_at   timestamptz,
  created_at          timestamptz not null default now(),
  paid_at             timestamptz
);

create index if not exists purchases_report_id_idx on build_guide_purchases (report_id);
create index if not exists purchases_email_idx on build_guide_purchases (email);

alter table build_guide_purchases enable row level security;
-- Same: purchases are server-side only. No anon policy.

-- ─────────────────────────── social posts ────────────────────────────
-- Daily X content engine. One row per (platform, scheduled_for, content_type)
-- slot. The cron route claims a slot by inserting a `pending` row; the
-- partial unique index below makes that an atomic lock.

create table if not exists social_posts (
  id                uuid primary key default gen_random_uuid(),
  platform          text not null default 'x' check (platform in ('x')),
  content_type      text not null check (content_type in ('report','original')),
  template_id       text not null,
  ref_id            uuid references reports(id) on delete set null,
  ref_slug          text,
  body              text not null,                                    -- HEAD tweet body
  thread_bodies     text[],                                           -- additional tweet bodies (null = single tweet)
  link_url          text,                                             -- URL embedded in head tweet (null if no link)
  status            text not null default 'pending'
                    check (status in ('pending','posted','failed','dry_run')),
  tweet_id          text,                                             -- HEAD tweet's X-side id
  tweet_url         text,                                             -- HEAD tweet URL (canonical share link)
  thread_tweet_ids  text[],                                           -- X-side ids for reply tweets (parallel to thread_bodies)
  error_reason      text,
  error_detail      jsonb,
  scheduled_for     date not null default current_date,
  created_at        timestamptz not null default now(),
  posted_at         timestamptz
);

-- Per-slot idempotency: only one posted/pending row per (platform, day, content_type).
-- failed/dry_run rows do NOT claim the slot, so manual re-runs after a failure work.
create unique index if not exists social_posts_one_slot_per_day
  on social_posts (platform, scheduled_for, content_type)
  where status in ('posted','pending');

-- Cooldown lookup: "have we posted this slug recently?"
create index if not exists social_posts_ref_slug_posted_at_idx
  on social_posts (ref_slug, posted_at desc)
  where status = 'posted';

-- Anti-repetition feed for original posts.
create index if not exists social_posts_status_created_at_idx
  on social_posts (status, created_at desc);

alter table social_posts enable row level security;
-- No public read policy: admin-only writes, no anon visibility.

-- ─────────────────────────── error log ────────────────────────────────

create table if not exists error_log (
  id            uuid primary key default gen_random_uuid(),
  scope         text not null,        -- 'scan' | 'guide_gen' | 'purchase' | 'webhook' | 'resend'
  reason        text,                 -- enum value from the pipeline (ScanErrorReason / GuideErrorReason)
  ref_id        uuid,                 -- optional FK-ish: report_id, purchase_id
  ref_slug      text,                 -- human-readable reference (domain slug, etc.)
  message       text not null,        -- the real internal error message (stack traces, DB errors, etc.)
  detail        jsonb,                -- anything structured: request metadata, tool_use previews, etc.
  created_at    timestamptz not null default now()
);

create index if not exists error_log_scope_created_idx on error_log (scope, created_at desc);
create index if not exists error_log_ref_id_idx on error_log (ref_id);
create index if not exists error_log_ref_slug_idx on error_log (ref_slug);

alter table error_log enable row level security;
-- No public read policy: error_log is ops-only, written via admin client.

-- ─────────────────────────── migrations ────────────────────────────────
-- Apply these on existing databases that were created before the columns
-- above were part of the source-of-truth schema. Safe to re-run.

-- 2026-04-25: legal-consent fields on build_guide_purchases.
alter table build_guide_purchases
  add column if not exists terms_version     text,
  add column if not exists privacy_version   text,
  add column if not exists terms_accepted_at timestamptz;

-- 2026-04-26: view_count on reports + popularity sort index + RPC.
alter table reports
  add column if not exists view_count integer not null default 0;

create index if not exists reports_view_count_idx on reports (view_count desc);

create or replace function increment_report_view_count(p_slug text)
returns void language sql as $$
  update reports set view_count = view_count + 1 where slug = p_slug;
$$;

-- 2026-04-27: error_log retention. The table grows on every scan/guide/webhook
-- failure and has no natural pruning. Keep 90 days of history — anything older
-- is no longer useful for ops. Uses pg_cron, which Supabase ships preinstalled
-- but not enabled by default; the create extension is a no-op if already on.
--
-- Apply this block once via the Supabase SQL editor. Re-running is safe — the
-- schedule replaces any prior job with the same name.
create extension if not exists pg_cron;

create or replace function prune_error_log()
returns void language sql as $$
  delete from error_log where created_at < now() - interval '90 days';
$$;

-- Replace any prior schedule, then enroll the daily prune at 03:17 UTC
-- (off-peak, off-the-hour to avoid contention with other cron jobs).
do $$
declare
  job_id bigint;
begin
  for job_id in select jobid from cron.job where jobname = 'prune-error-log' loop
    perform cron.unschedule(job_id);
  end loop;
  perform cron.schedule('prune-error-log', '17 3 * * *', $job$select prune_error_log();$job$);
end
$$;

-- 2026-04-28: social_posts table for daily X content engine.
create table if not exists social_posts (
  id                uuid primary key default gen_random_uuid(),
  platform          text not null default 'x' check (platform in ('x')),
  content_type      text not null check (content_type in ('report','original')),
  template_id       text not null,
  ref_id            uuid references reports(id) on delete set null,
  ref_slug          text,
  body              text not null,
  thread_bodies     text[],
  link_url          text,
  status            text not null default 'pending'
                    check (status in ('pending','posted','failed','dry_run')),
  tweet_id          text,
  tweet_url         text,
  thread_tweet_ids  text[],
  error_reason      text,
  error_detail      jsonb,
  scheduled_for     date not null default current_date,
  created_at        timestamptz not null default now(),
  posted_at         timestamptz
);

create unique index if not exists social_posts_one_slot_per_day
  on social_posts (platform, scheduled_for, content_type)
  where status in ('posted','pending');

create index if not exists social_posts_ref_slug_posted_at_idx
  on social_posts (ref_slug, posted_at desc)
  where status = 'posted';

create index if not exists social_posts_status_created_at_idx
  on social_posts (status, created_at desc);

alter table social_posts enable row level security;
