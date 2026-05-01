-- saaspocalypse — Postgres schema (Supabase)
-- Apply via the Supabase SQL editor, or (later) via `supabase db push` with migrations.

create extension if not exists "pgcrypto";

create table if not exists reports (
  id              uuid primary key default gen_random_uuid(),
  domain          text unique not null,
  slug            text unique not null,
  name            text not null,
  tagline         text not null,

  -- Wedge frame (Phase 2.5): tier is server-derived from wedge_score buckets,
  -- wedge_score is server-derived from the moat aggregate (10 - agg) * 10.
  -- The LLM no longer emits either field. weakest_moat_axis is the lowest-
  -- scoring moat axis at scan time — drives the weakest-axis callout in the
  -- UI and keys the wedge guide LLM prompt. Null for legacy rows / scans
  -- where moat scoring soft-failed.
  tier            text not null check (tier in ('SOFT','CONTESTED','FORTRESS')),
  wedge_score     int  not null check (wedge_score between 0 and 100),
  weakest_moat_axis text check (
    weakest_moat_axis is null
    or weakest_moat_axis in (
      'capital','technical','network','switching','data_moat','regulatory','distribution'
    )
  ),
  wedge_thesis    text not null,

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
  -- Server-authored fingerprint output (headers/cookies/HTML/CNAME → detected
  -- hosting/framework/cms/analytics/payments/etc.). Nullable: pre-fingerprint
  -- rows and any scan where detection soft-failed have NULL.
  detected_stack  jsonb,

  view_count      integer not null default 0,

  scanned_at      timestamptz not null default now(),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists reports_created_at_idx on reports (created_at desc);
create index if not exists reports_tier_wedge_score_idx on reports (tier, wedge_score desc);
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

-- 2026-04-28: detected_stack on reports — server-authored fingerprint output
-- (hosting, framework, cms, analytics/payments/auth lists, raw_signals).
alter table reports
  add column if not exists detected_stack jsonb;

-- 2026-04-29: proprietary normalization layer.
-- Three layers, each in its own concern:
--   (1) canonical taxonomy — small, hand-curated, source-of-truth in TS
--       modules under lib/normalization/taxonomy and synced via
--       scripts/sync_taxonomy.ts. Slow-changing.
--   (2) per-report projection — auto-derived from the verdict + detected_stack
--       by the deterministic engine in lib/normalization/engine.ts. Rebuildable.
--   (3) review queue — unmatched terms surfaced for human curation.
-- No LLM calls anywhere in the pipeline. Projection runs in-process during
-- runScan and again any time scripts/recompute_projections.ts is run.

-- ─── Layer 1: canonical taxonomy ───────────────────────────────────────────

create table if not exists stack_components (
  slug                  text primary key,
  display_name          text not null,
  category              text not null,            -- hosting | framework | ui | cms | db | payments | auth | cdn | analytics | email | support | crm | ml | search | queue | monitoring | devtools | integrations | infra
  commoditization_level int  not null check (commoditization_level between 0 and 5),
  aliases               jsonb not null default '[]'::jsonb,   -- string[] of lowercase synonyms
  updated_at            timestamptz not null default now()
);

create index if not exists stack_components_category_idx on stack_components (category);

create table if not exists capabilities (
  slug             text primary key,
  display_name     text not null,
  category         text not null,                  -- collab | content | commerce | comm | ai | infra | data | workflow | identity
  match_patterns   jsonb not null default '[]'::jsonb,   -- string[] of lowercase phrases to match against report text
  moat_tags        jsonb not null default '[]'::jsonb,   -- string[] feeding moat scoring (multi_sided | ugc | marketplace | viral_loop | data_storage | workflow_lock_in | integration_hub | proprietary_dataset | training_data | behavioral | hipaa | finra | gdpr_critical | licensed)
  is_descriptor    boolean not null default false,       -- true when capability defines a product category (form-builder, appointment-booking) — similarity engine 2× boost
  updated_at       timestamptz not null default now()
);

create index if not exists capabilities_category_idx on capabilities (category);

create table if not exists market_segments (
  slug             text primary key,
  display_name     text not null,
  match_patterns   jsonb not null default '[]'::jsonb,
  updated_at       timestamptz not null default now()
);

create table if not exists business_models (
  slug             text primary key,
  display_name     text not null,
  match_patterns   jsonb not null default '[]'::jsonb,
  updated_at       timestamptz not null default now()
);

drop trigger if exists stack_components_set_updated_at on stack_components;
create trigger stack_components_set_updated_at
  before update on stack_components
  for each row execute function set_updated_at();
drop trigger if exists capabilities_set_updated_at on capabilities;
create trigger capabilities_set_updated_at
  before update on capabilities
  for each row execute function set_updated_at();
drop trigger if exists market_segments_set_updated_at on market_segments;
create trigger market_segments_set_updated_at
  before update on market_segments
  for each row execute function set_updated_at();
drop trigger if exists business_models_set_updated_at on business_models;
create trigger business_models_set_updated_at
  before update on business_models
  for each row execute function set_updated_at();

alter table stack_components enable row level security;
alter table capabilities      enable row level security;
alter table market_segments   enable row level security;
alter table business_models   enable row level security;

drop policy if exists "taxonomy is publicly readable" on stack_components;
create policy "taxonomy is publicly readable"
  on stack_components for select to anon, authenticated using (true);
drop policy if exists "taxonomy is publicly readable" on capabilities;
create policy "taxonomy is publicly readable"
  on capabilities for select to anon, authenticated using (true);
drop policy if exists "taxonomy is publicly readable" on market_segments;
create policy "taxonomy is publicly readable"
  on market_segments for select to anon, authenticated using (true);
drop policy if exists "taxonomy is publicly readable" on business_models;
create policy "taxonomy is publicly readable"
  on business_models for select to anon, authenticated using (true);

-- ─── Layer 2: per-report projection ────────────────────────────────────────

-- Junction: which canonical components this report uses.
-- `source` records provenance: 'fingerprint' (server-authored, authoritative),
-- 'text_match' (derived from LLM-authored fields), or 'both'. Fingerprint
-- always wins on conflict — engine de-duplicates and merges.
create table if not exists report_components (
  report_id        uuid not null references reports(id) on delete cascade,
  component_slug   text not null references stack_components(slug) on delete cascade,
  source           text not null check (source in ('fingerprint','text_match','both')),
  primary key (report_id, component_slug)
);

create index if not exists report_components_component_idx
  on report_components (component_slug);

create table if not exists report_capabilities (
  report_id        uuid not null references reports(id) on delete cascade,
  capability_slug  text not null references capabilities(slug) on delete cascade,
  confidence       numeric(3,2) not null check (confidence between 0 and 1),
  evidence_field   text not null,                 -- 'take' | 'take_sub' | 'challenges' | 'tagline' | 'est_cost' | 'multiple'
  primary key (report_id, capability_slug)
);

create index if not exists report_capabilities_capability_idx
  on report_capabilities (capability_slug);

-- Single attribute row per report.
create table if not exists report_attributes (
  report_id                 uuid primary key references reports(id) on delete cascade,
  segment_slug              text references market_segments(slug) on delete set null,
  business_model_slug       text references business_models(slug) on delete set null,
  monthly_floor_usd         numeric(10,2),                          -- sum of fixed est_cost lines, null if all usage-based
  is_usage_based            boolean not null default false,
  capital_intensity_bucket  text check (capital_intensity_bucket in ('low','mid','high')),
  projection_version        int  not null default 1,                -- bump when engine output schema changes; triggers recompute
  projected_at              timestamptz not null default now()
);

create index if not exists report_attributes_segment_idx
  on report_attributes (segment_slug);
create index if not exists report_attributes_business_model_idx
  on report_attributes (business_model_slug);

alter table report_components   enable row level security;
alter table report_capabilities enable row level security;
alter table report_attributes   enable row level security;

drop policy if exists "report projections are publicly readable" on report_components;
create policy "report projections are publicly readable"
  on report_components for select to anon, authenticated using (true);
drop policy if exists "report projections are publicly readable" on report_capabilities;
create policy "report projections are publicly readable"
  on report_capabilities for select to anon, authenticated using (true);
drop policy if exists "report projections are publicly readable" on report_attributes;
create policy "report projections are publicly readable"
  on report_attributes for select to anon, authenticated using (true);

-- ─── Layer 3: review queue ─────────────────────────────────────────────────

-- Unmatched but stack-shaped terms found in report text. Reviewed periodically
-- to decide what becomes a new alias on an existing component vs. a brand-new
-- canonical entity. Status flow: open → (alias|added|ignored).
create table if not exists normalization_unknowns (
  id                  uuid primary key default gen_random_uuid(),
  report_id           uuid references reports(id) on delete set null,
  raw_term            text not null,
  normalized_term     text not null,                                -- lowercased, trimmed
  suggested_category  text,                                         -- engine's guess: stack_component | capability | unknown
  occurrences         int  not null default 1,
  status              text not null default 'open'
                      check (status in ('open','aliased','added','ignored')),
  resolution_slug     text,                                         -- canonical slug if status in ('aliased','added')
  first_seen_at       timestamptz not null default now(),
  last_seen_at        timestamptz not null default now()
);

create unique index if not exists normalization_unknowns_normalized_term_idx
  on normalization_unknowns (normalized_term);
create index if not exists normalization_unknowns_status_idx
  on normalization_unknowns (status, last_seen_at desc);

alter table normalization_unknowns enable row level security;
-- No public policy: review queue is admin-only.

-- 2026-05-01: Phase B — moat scoring. Six 0–10 axes derived deterministically
-- from the per-report projection (capabilities, components, attributes) +
-- the canonical taxonomy (commoditization_level, moat_tags). No LLM. The
-- aggregate is a weighted average; weights live in lib/normalization/moat.ts
-- as MOAT_RUBRIC_V1, so changing them is a code change with `rubric_version`
-- bumped and a recompute. The data column is named `data_moat` because
-- bare `data` is reserved/awkward in some SQL contexts; the TS type uses
-- `data_moat` to match.
create table if not exists report_moat_scores (
  report_id        uuid primary key references reports(id) on delete cascade,
  rubric_version   int not null,
  capital          numeric(3,1) not null check (capital between 0 and 10),
  technical        numeric(3,1) not null check (technical between 0 and 10),
  network          numeric(3,1) not null check (network between 0 and 10),
  switching        numeric(3,1) not null check (switching between 0 and 10),
  data_moat        numeric(3,1) not null check (data_moat between 0 and 10),
  regulatory       numeric(3,1) not null check (regulatory between 0 and 10),
  aggregate        numeric(3,1) not null check (aggregate between 0 and 10),
  computed_at      timestamptz not null default now()
);

create index if not exists report_moat_sc/cores_aggregate_idx
  on report_moat_scores (aggregate desc);

-- Curator review state. `pending` = score is up for review and may surface
-- in /admin/moat-anomalies; `verified` = curator confirmed the score is
-- honest and the row should hide from the anomaly view. Stays sticky
-- across recomputes — admin can re-flag manually if a taxonomy change
-- materially shifts the score.
alter table report_moat_scores
  add column if not exists review_status text not null default 'pending'
    check (review_status in ('pending','verified')),
  add column if not exists reviewed_at   timestamptz;

create index if not exists report_moat_scores_review_status_idx
  on report_moat_scores (review_status);

-- 2026-04-29: persisted LLM moat-audit suggestions. Populated by the
-- per-row audit endpoint and the bulk audit endpoint at
-- POST /api/admin/moat-anomalies/audit-batch. Same posture as the
-- unknowns suggestion columns — pre-fills the triage UI, human still
-- applies each suggestion individually, deterministic engine unchanged.
-- Cleared on recompute since the underlying score moves.
alter table report_moat_scores
  add column if not exists audit_summary     text,
  add column if not exists audit_suggestions jsonb,
  add column if not exists audited_at        timestamptz;

alter table report_moat_scores enable row level security;
drop policy if exists "moat scores are publicly readable" on report_moat_scores;
create policy "moat scores are publicly readable"
  on report_moat_scores for select to anon, authenticated using (true);

-- 2026-05-01: admin-only LLM expectation check for score calibration.
-- Stores qualitative axis bands inferred from the verdict prose plus only
-- high-confidence mismatch flags. This lets /admin/score-audit highlight
-- likely overfires/underfires without calling the LLM during table render.
create table if not exists report_score_expectations (
  report_id      uuid primary key references reports(id) on delete cascade,
  rubric_version int not null,
  verdict_hash   text not null,
  bands          jsonb not null,
  rationale      jsonb not null default '{}'::jsonb,
  flags          jsonb not null default '[]'::jsonb,
  generated_at   timestamptz not null default now()
);

create index if not exists report_score_expectations_generated_at_idx
  on report_score_expectations (generated_at desc);

alter table report_score_expectations enable row level security;
-- No public policy: admin endpoints use service-role access.

-- 2026-04-30: per-capability descriptor flag. True when the capability
-- defines what a product CATEGORICALLY IS (form-builder, appointment-
-- booking, ai-agent-platform) rather than a sub-feature it has
-- (rich-text-editor, social-login, push-notifications). Drives a 2× boost
-- in similarity scoring so category-defining caps outrank shared
-- infrastructure in "products like X" rankings. Distinct from
-- moat_tags: empty moat_tags means "doesn't grant a moat axis" — most
-- such capabilities are sub-features, not categories.
alter table capabilities
  add column if not exists is_descriptor boolean not null default false;

-- 2026-04-30: similarity gaps queue. Pairs of reports the heuristic
-- thinks SHOULD cluster as similar (high text-Jaccard over tagline+take)
-- but the deterministic engine doesn't (low capability-overlap score).
-- Surfaces taxonomy gaps — pairs where a missing descriptor capability
-- prevents real twins from converging in `/admin/similarity-gaps`.
--
-- Posture mirrors normalization_unknowns + moat-anomalies: deterministic
-- engine unchanged, LLM is curation aid only, human applies each fix.
--
-- (report_a_id, report_b_id) is canonically ordered (a < b alphabetically)
-- so the unique constraint dedupes pairs regardless of which side was
-- the source when the gap was detected.
create table if not exists similarity_gaps (
  id              uuid primary key default gen_random_uuid(),
  report_a_id     uuid not null references reports(id) on delete cascade,
  report_b_id     uuid not null references reports(id) on delete cascade,
  text_similarity numeric(4,3) not null,
  engine_score    numeric(4,3) not null,
  status          text not null default 'open' check (status in ('open','applied','dismissed')),
  -- LLM-suggested fix (populated lazily on per-row "suggest" click).
  llm_action      text check (llm_action in ('add_pattern','new_capability','no_action')),
  llm_payload     jsonb,
  llm_note        text,
  llm_suggested_at timestamptz,
  applied_at      timestamptz,
  dismissed_at    timestamptz,
  detected_at     timestamptz not null default now(),
  unique (report_a_id, report_b_id),
  check (report_a_id < report_b_id)
);

create index if not exists similarity_gaps_status_idx on similarity_gaps (status);
create index if not exists similarity_gaps_detected_at_idx on similarity_gaps (detected_at desc);

alter table similarity_gaps enable row level security;
-- No public read policy — admin-only via service-role client.

-- 2026-04-30: LLM-generated curation suggestions for the unknowns queue.
-- Populated by POST /api/admin/unknowns/suggest (admin-only batch call).
-- Pre-fills the triage UI; the human is still in the loop, and the
-- deterministic normalization engine is unchanged. `llm_action` mirrors the
-- three resolution paths in the admin UI.
alter table normalization_unknowns
  add column if not exists llm_action          text
    check (llm_action in ('alias','promote','ignore')),
  add column if not exists llm_target_slug     text,
  add column if not exists llm_category        text,
  add column if not exists llm_commoditization int
    check (llm_commoditization between 0 and 5),
  add column if not exists llm_note            text,
  add column if not exists llm_suggested_at    timestamptz;

-- 2026-04-29: capability taxonomy prune. The 8 slugs below were either
-- duplicates of broader capabilities (multiple payment-licensing slugs for
-- one moat, fraud-detection split into two) or single-report harvest noise
-- that never generalized. Surviving capabilities (payment-rails,
-- payments-licensing, fraud-detection, recruiter-relationship-network,
-- candidate-profile-data) absorbed any unique patterns. Cascade FK on
-- report_capabilities.capability_slug means projection rows clean up
-- automatically; recompute afterwards to reflect.
delete from capabilities where slug in (
  'stablecoin-crypto-rails',
  'acquiring-bank-relationships',
  'sponsor-bank-network',
  'transaction-fraud-dataset',
  'talent-matching-dataset',
  'ats-bypass-network',
  'warm-intro-workflow',
  'verdict-cache-corpus'
);

-- 2026-04-30: distribution signals (Phase 1 of wedge-frame pivot).
-- Adds a 7th moat axis covering distribution depth. Raw signals live on
-- `report_attributes` so they're queryable / diagnosable; the derived 0–10
-- axis lives on `report_moat_scores.distribution` (nullable — null means
-- the SERP call failed and we couldn't compute the axis honestly).
--
-- See lib/scanner/distribution.ts for the collector and lib/normalization/
-- moat.ts::scoreDistribution for the scoring function. Bumps RUBRIC_VERSION
-- as the calibration evolves; recompute_projections rebuilds existing rows.
alter table report_attributes
  add column if not exists pricing_gate text check (pricing_gate in ('demo','public')),
  add column if not exists last_blog_post_at timestamptz,
  add column if not exists community_channels jsonb not null default '[]'::jsonb,
  add column if not exists domain_registered_at date,
  add column if not exists serp_own_domain_count int;

alter table report_moat_scores
  add column if not exists distribution numeric(3,1)
    check (distribution is null or distribution between 0 and 10);

-- 2026-04-30 (calibration v8): replaced the original distribution sub-signals
-- (blog cadence, community-in-footer, domain age via RDAP) with sub-signals
-- derived from the Serper SERP payload we were already paying for. The
-- earlier sub-signals were corrupted: blog cadence anti-correlated with brand
-- strength, community-in-footer measured design choices not distribution,
-- domain age was corrupted by vintage-domain purchases (Stripe 1995, etc.).
--
-- Old columns (last_blog_post_at, community_channels, domain_registered_at)
-- are KEPT on the table for diagnostic value but are no longer populated by
-- new scans; old data will gradually become stale. pricing_gate is also
-- still collected and persisted but no longer scored — see scoreDistribution.
alter table report_attributes
  add column if not exists knowledge_graph_present boolean,
  add column if not exists has_wikipedia boolean,
  add column if not exists top_organic_owned boolean,
  add column if not exists has_sitelinks boolean,
  add column if not exists total_results bigint,
  add column if not exists has_news boolean;

-- 2026-04-30 (calibration v9): KG-only weighting in v8 collapsed for the
-- ~50% of established brands where Google replaces the traditional
-- knowledgeGraph panel with AI Overview / inline tiles (ChatGPT, Linear,
-- Airtable, Tally, Cal.com all missed). v9 keeps KG but de-emphasizes it,
-- adds three new sub-signals from the same Serper payload:
--   - authoritative_third_party_count: # of distinct authoritative domains
--     (Wikipedia, LinkedIn, Crunchbase, TechCrunch, Bloomberg, G2, etc.)
--     in top 10 organic. Subsumes has_wikipedia and broadens it.
--   - paa_present: Google's peopleAlsoAsk panel fires when there's
--     organic curiosity about an entity.
--   - related_searches_present: depth of related-query interest.
-- Also tightens has_news to topStories ONLY (was firing for 44/47 reports
-- via a too-lax "organic result has a date" fallback).
alter table report_attributes
  add column if not exists authoritative_third_party_count int,
  add column if not exists paa_present boolean,
  add column if not exists related_searches_present boolean;

-- 2026-04-30 (calibration v10): debug of actual Serper responses revealed
-- v9's PAA / related_searches / news / total_results signals were broken
-- in different ways. PAA fires for any keyword overlap (saaspocalypse-dev
-- gets 4 PAA items because the keyword matches industry-trend articles).
-- relatedSearches always returns 8 for every query. topStories never
-- returned for any brand search. searchInformation absent entirely.
--
-- v10 drops all four from scoring and replaces with two newly-discovered
-- signals from the same payload:
--   - organic_count: established brands consistently get 7 organic results
--     while weak queries get 10 — Google compresses for entity-confident
--     queries. The scored signal is `organic_count < 10` (compressed).
--   - has_sitelinks (already collected in v9, now weight 4): reliably
--     fires for every established brand, including those without KG.
-- v10 also EXPANDS the authoritative-domain list (apps.apple.com,
-- play.google.com, youtube.com, x.com, reddit.com, github.com) AND
-- gates the count on top_organic_owned to suppress false positives.
-- The deprecated columns (paa_present, related_searches_present, has_news,
-- total_results) are still populated by the collector for diagnostics
-- but are no longer scored.
alter table report_attributes
  add column if not exists organic_count int;

-- 2026-04-30 (wedge-frame Phase 2): tier rename + buildability→wedge frame.
-- WEEKEND/MONTH/DON'T → SOFT/CONTESTED/FORTRESS. The score buckets are
-- unchanged (≥70 SOFT, 30–69 CONTESTED, <30 FORTRESS); only the labels move.
-- Order matters: drop the old check constraint, rewrite data, add the new
-- constraint. Idempotent — safe to re-run because the data-rewrite is a
-- no-op once values are already in the new vocabulary.
do $$
begin
  alter table reports drop constraint if exists reports_tier_check;
exception when undefined_object then
  -- pg_dump-restored databases use a different constraint name. Try both.
  null;
end $$;

update reports set tier = case
  when tier = 'WEEKEND'  then 'SOFT'
  when tier = 'MONTH'    then 'CONTESTED'
  when tier = 'DON''T'   then 'FORTRESS'
  else tier
end
where tier in ('WEEKEND','MONTH','DON''T');

-- Re-add the check constraint with the new vocabulary. ALTER TABLE ... ADD
-- CONSTRAINT IF NOT EXISTS isn't a thing in postgres < 18, so check via
-- pg_constraint and only add if missing.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'reports'::regclass and conname = 'reports_tier_check'
  ) then
    alter table reports add constraint reports_tier_check
      check (tier in ('SOFT','CONTESTED','FORTRESS'));
  end if;
end $$;

-- 2026-05-01 (wedge-frame Phase 2.5): replace buildability score with
-- wedge_score (server-derived from moat aggregate), add wedge_thesis (LLM-
-- emitted lede sentence) and weakest_moat_axis (server-derived from moat
-- breakdown). The LLM no longer emits `score`, `tier`, `difficulty`, or
-- `confidence` — `tier` is now derived from `wedge_score` buckets, and the
-- whole headline conclusion is moat-driven.
--
-- This migration is destructive for the legacy `score` and `confidence`
-- columns. Phase 2.5 ships as a re-scan of the entire corpus (rationale:
-- the LLM voice/contract changed end-to-end), so we accept that. The drop
-- happens AFTER the new columns are in place so a partial deploy can't
-- leave the table in an unusable state.
alter table reports
  add column if not exists wedge_score       int,
  add column if not exists wedge_thesis      text,
  add column if not exists weakest_moat_axis text;

-- Backfill default values so we can flip the columns to NOT NULL on legacy
-- rows that survive the rescan (none should — the rescan script truncates
-- cascade — but defensive). Wedge_score defaults to 0 and weakest_moat_axis
-- to NULL on rows with no moat row to derive from.
update reports set wedge_score = 0 where wedge_score is null;
update reports
  set wedge_thesis = 'wedge thesis pending re-scan'
  where wedge_thesis is null;

alter table reports
  alter column wedge_score   set not null,
  alter column wedge_thesis  set not null;

-- weakest_moat_axis check constraint.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'reports'::regclass
      and conname  = 'reports_weakest_moat_axis_check'
  ) then
    alter table reports add constraint reports_weakest_moat_axis_check
      check (
        weakest_moat_axis is null
        or weakest_moat_axis in (
          'capital','technical','network','switching','data_moat','regulatory','distribution'
        )
      );
  end if;
end $$;

-- wedge_score check constraint.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'reports'::regclass
      and conname  = 'reports_wedge_score_check'
  ) then
    alter table reports add constraint reports_wedge_score_check
      check (wedge_score between 0 and 100);
  end if;
end $$;

-- Drop the old buildability columns + indexes. Safe to re-run.
drop index if exists reports_tier_score_idx;
alter table reports drop column if exists score;
alter table reports drop column if exists confidence;

create index if not exists reports_tier_wedge_score_idx
  on reports (tier, wedge_score desc);

-- 2026-05-01: helper RPC the rescan script uses to wipe the corpus before
-- re-scanning. Truncating reports cascades through every projection /
-- moat-score / similarity-gap / build-guide / purchase row that FK's to
-- it. Restricted to the service-role; anon clients cannot call it.
create or replace function truncate_reports_cascade()
returns void
language sql
security definer
set search_path = public
as $$
  truncate table reports cascade;
$$;
revoke all on function truncate_reports_cascade() from public, anon, authenticated;

-- 2026-05-02 (Phase 2.6 — calibration framework):
-- Move every tunable parameter from `lib/normalization/moat.ts` into the DB
-- so calibration becomes a data edit instead of a code deploy. Three tables:
--
--   1. `scoring_patterns` — regex / domain rows (capex prose patterns,
--      fortress-thesis patterns, capex-exclude patterns, distribution
--      authoritative-domain entries). Each row has axis + kind + pattern
--      + weight + status + evidence.
--
--   2. `scoring_weights` — keyed numeric knobs for everything that's
--      currently a magic constant in moat.ts: per-axis aggregate weights,
--      distribution sub-signal weights, capital path thresholds, technical
--      difficulty multipliers. Key naming: `<axis>.<knob>`.
--
--   3. `scoring_audit` — append-only log of every calibration change. One
--      row per pattern add / disable / weight update / recompute / sweep.
--      Drives the change history surface in /admin/score-audit.
--
-- Production scoring uses an in-process snapshot loaded at module init
-- (defaults baked into TS). The admin recompute paths await a fresh DB
-- load so calibration edits affect the next recompute without redeploy.
-- Mirrors the existing capability-table posture.

create table if not exists scoring_patterns (
  id           uuid primary key default gen_random_uuid(),
  axis         text not null check (axis in (
    'capital','technical','network','switching','data_moat','regulatory','distribution'
  )),
  kind         text not null check (kind in (
    'capex',                                -- regex matched against verdict prose for capital
    'fortress_thesis',                      -- regex matched against wedge_thesis for capital path-2 anchor
    'capex_exclude',                        -- regex that suppresses a capex match (e.g. SOC 2)
    'distribution_authoritative_domain'     -- domain string (suffix-matched) for distribution authoritative count
  )),
  pattern      text not null,               -- regex source (kinds capex/fortress_thesis/capex_exclude) OR domain string (distribution_authoritative_domain)
  weight       numeric(4,2) not null default 1.0,
  status       text not null default 'active' check (status in ('active','disabled')),
  evidence     text,                        -- one-line justification (hand-typed or LLM-generated)
  added_by     text,                        -- 'seed' | 'admin' | 'llm:moat_audit' | etc
  added_at     timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists scoring_patterns_axis_kind_idx
  on scoring_patterns (axis, kind, status);

-- Uniqueness: same pattern can't appear twice under the same axis+kind.
create unique index if not exists scoring_patterns_axis_kind_pattern_uq
  on scoring_patterns (axis, kind, pattern);

drop trigger if exists scoring_patterns_set_updated_at on scoring_patterns;
create trigger scoring_patterns_set_updated_at
  before update on scoring_patterns
  for each row execute function set_updated_at();

alter table scoring_patterns enable row level security;
-- No public read policy: scoring config is admin-only.

-- Numeric knobs. Key format: `<axis>.<knob_name>`. Examples:
--   aggregate.capital                         (per-axis weight in moat aggregate)
--   distribution.sub_weight.has_sitelinks     (per-sub-signal weight)
--   capital.heavy_capex_hits_min              (path-3 threshold)
--   capital.descriptive_anchor                (path-1/2 anchor)
--   capital.heavy_capex_anchor                (path-3 anchor)
--   capital.surface_cap                       (per-surface capex match cap)
--   technical.nightmare_weight                (per-difficulty multiplier)
create table if not exists scoring_weights (
  key          text primary key,
  value        numeric(8,3) not null,
  description  text,                          -- human-readable explanation
  updated_at   timestamptz not null default now()
);

drop trigger if exists scoring_weights_set_updated_at on scoring_weights;
create trigger scoring_weights_set_updated_at
  before update on scoring_weights
  for each row execute function set_updated_at();

alter table scoring_weights enable row level security;

-- Audit log. Append-only — never UPDATE or DELETE rows. Keep schema flat
-- so it's easy to query in the admin UI and in ad-hoc SQL.
create table if not exists scoring_audit (
  id                uuid primary key default gen_random_uuid(),
  ts                timestamptz not null default now(),
  actor             text,                     -- 'admin' | 'seed' | 'llm:moat_audit' | etc
  scope             text not null,            -- 'pattern' | 'weight' | 'recompute' | 'sweep'
  change_kind       text not null,            -- 'add' | 'update' | 'disable' | 'recompute_one' | 'recompute_all' | 'sweep_run'
  axis              text,
  ref_id            uuid,                     -- pattern_id OR report_id depending on scope
  ref_key           text,                     -- weight key OR slug
  before_value      jsonb,
  after_value       jsonb,
  reason            text,
  reports_moved     int                       -- # reports that crossed tier boundaries as a result
);

create index if not exists scoring_audit_ts_idx on scoring_audit (ts desc);
create index if not exists scoring_audit_scope_idx on scoring_audit (scope, ts desc);

alter table scoring_audit enable row level security;
