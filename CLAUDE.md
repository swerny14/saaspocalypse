# saaspocalypse

Marketing landing page for a (not yet built) tool that tells indie hackers whether they could build a given SaaS themselves — returning a buildability score, stack receipt, time-to-clone, and a snarky one-liner. The tone is intentionally pun-heavy and corny; the jokes are the product.

## Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (CSS-based config, no `tailwind.config.ts`)
- **Fonts:** `next/font/google` — Space Grotesk (display) + JetBrains Mono (body)
- **Package manager:** pnpm
- **Deployment target:** Vercel

**Shipped:** Phases 1 + 2 + 3 + SEO + blog + daily X content engine. Real Claude-powered scanner, report storage, ISR'd per-report SEO pages, SSE-streamed scan UX, IP rate limiting, per-domain locking, Stripe-gated build guide generation (lazy, shared per report_id), magic-link email delivery via Resend. Public legal pages (`/terms`, `/privacy`) with version-tracked consent captured at purchase and a soft-consent line under the scanner. Full SEO surface: `app/sitemap.ts`, `app/robots.ts`, JSON-LD on landing (`WebSite` + `Organization`) and per-report (`Review` of a `SoftwareApplication`), default site OG as a static PNG at `public/images/saaspocalypse-og.png` (wired via `metadata.openGraph.images` in `app/layout.tsx`) plus dynamic per-report OG at `app/r/[slug]/opengraph-image.tsx` (tier-colored score), favicons (`app/icon[1-5].png` + `app/apple-icon.png` auto-detected by Next), intent-led per-report titles ("Can I build {name}?" — see `lib/seo/meta.ts`). Public `/directory` page (Layout A "filing cabinet") with URL-driven filters (tier, score range, query, sort, page). Per-report `view_count` tracking with `most popular` sort. Public `/blog` (Layout A "editorial broadsheet") + per-post `/blog/[slug]` with category filter via `?cat=`, `BlogPosting` JSON-LD, dynamic per-post OG, and a Resend-audience-backed newsletter capture in the footer. **Daily X content engine** posts twice/day via Vercel Cron (a report-driven hook in the morning, an original PG-voiced bite in the afternoon) — see "Daily X content engine" below.

**Phase 3 flow:** On verdict report CTA → email capture modal → Stripe Checkout → webhook marks paid → Resend sends magic link (`/r/<slug>/guide?t=<token>`) → token-gated page. First buyer triggers a second Claude call that generates the full `BuildGuide` (streamed); all subsequent buyers hit the cached row instantly.

**Dev bypass:** Set `GUIDE_PRICE_CENTS=0` + `NODE_ENV !== 'production'` and `/api/purchase` skips Stripe entirely, creating a `paid` purchase and emailing the magic link directly. Lets you exercise the full guide pipeline locally without Stripe keys. Do not ship this to prod.

**Planned / still open:** mobile hamburger nav, scan-quality logging, JS-heavy site scraping, admin tools — see "Not yet built" below.

## Commands

```
pnpm dev              # dev server with Turbopack (fast HMR)
pnpm build            # production build (webpack — see Gotchas)
pnpm typecheck        # tsc --noEmit
pnpm lint             # next lint
pnpm tsx scripts/seed.ts   # seed the 4 handoff reports into Supabase (requires env vars)
```

## Project layout

- `app/` — App Router entry. `layout.tsx` (global `<Nav />`; default site OG is wired here via `metadata.openGraph.images` pointing at `/images/saaspocalypse-og.png`), `page.tsx` (landing), `r/[slug]/page.tsx` (per-report SEO page, ISR'd), `r/[slug]/guide/page.tsx` (token-gated build guide), `directory/page.tsx` (public report index), `blog/page.tsx` (blog index, URL-filterable by `?cat=`), `blog/[slug]/page.tsx` (per-post page, statically generated from `getPublishedPosts()`), `terms/page.tsx`, `privacy/page.tsx`, `sitemap.ts`, `robots.ts`, `r/[slug]/opengraph-image.tsx` (per-report dynamic OG), `blog/opengraph-image.tsx` (blog index OG — also static, candidate for the same flatten), `blog/[slug]/opengraph-image.tsx` (per-post OG), `icon[1-5].png` + `apple-icon.png` (favicons, Next file convention), `api/scan/route.ts`, `api/guide/[slug]/route.ts`, `api/purchase/{route,webhook,resend}/route.ts`, `api/reports/[slug]/view/route.ts` (view-count increment), `api/newsletter/route.ts` (Resend audience signup), `api/cron/social/[content_type]/route.ts` (daily X content cron — Bearer-auth gated), `globals.css`.
- `components/` — section + interactive components. `VerdictReport.tsx` is the full report card; `BuildGuide.tsx` is the full guide with copy-to-clipboard prompt blocks; `PurchaseCTA.tsx` is the client CTA + email-capture modal (with required Terms/Privacy checkbox); `LegalPage.tsx` is the shared shell that renders Terms and Privacy; `TrackView.tsx` is the 5-line client component that fires the per-page-view POST.
- `components/directory/` — directory page subcomponents: `DirectoryCard.tsx` (handoff Layout A card), `TierBadge.tsx`, `ScoreBar.tsx` (10-segment), `FilterGroup.tsx`, `FilterRow.tsx`, `PageBtn.tsx`, `DirectorySearch.tsx` (client search bar + sort), `ScoreRangeFilter.tsx` (client min/max + visual track), `tiers.ts` (the 3 directory tiers).
- `components/blog/` — blog page subcomponents: `BlogShell.tsx` (max-width wrapper, 1200/780 toggle), `BlogIndex.tsx`, `BlogMasthead.tsx`, `FeaturedPost.tsx` (sticky-yellow tile), `CategoryChips.tsx` (server-rendered, `?cat=` driven), `PostCard.tsx`, `NewsletterBlock.tsx` + `NewsletterForm.tsx` (form is the only `"use client"` piece), `Breadcrumb.tsx`, `ArticleHeader.tsx`, `ArticleBody.tsx` (renders `BlogBlock[]` — `p`, `h2`, `callout`), `ArticleEndMatter.tsx` (filed-under + prev/next).
- `lib/blog/` — blog content + helpers. `schema.ts` (`Post` + `BlogBlock` + `BlogCategory` types), `content.ts` (masthead + newsletter copy), `formatters.ts` (`formatPostDate`), `posts/index.ts` (sorts by date desc, exports `getAllPosts` / `getPostBySlug` / `getFeaturedPost` / `getPostsByCategory` / `getPublishedPosts` / `getAdjacentPosts`; throws at module-eval time if not exactly one `featured: true` post), `posts/{slug}.ts` × N (one TS file per post, body optional). The handoff design uses a Fraunces serif for headlines — we deliberately don't load it; all blog headlines render in `font-display` (Space Grotesk) to stay consistent with the rest of the site.
- `lib/seo/meta.ts` — title/description builders. `reportTitle` produces `"Can I build {name}? — {tier} · {time_estimate} · saaspocalypse"`; `reportOgTitle` is a longer Twitter/Slack-friendly form; `reportDescription` blends score + time + stack + first sentence of `take`, with graceful fallback when ≤155 chars overflows. **All metadata, OG, and JSON-LD `headline` fields call these so they don't drift.**
- `lib/seo/jsonld.ts` — `landingJsonLd` (`WebSite` + `Organization` graph) and `reportJsonLd` (`Review` of `SoftwareApplication`). `serializeJsonLd` escapes `<` so the payload can't break out of its `<script>` tag.
- `lib/content.ts` — static copy (headlines, testimonials, FAQs, footer, marquee, pricing). **Change copy here, not in components.**
- `lib/scanner/schema.ts` — Zod `VerdictReportSchema` (canonical verdict shape: DB row + LLM tool + UI). Exports `VerdictReport`, `Tier`, `Difficulty`, color maps.
- `lib/scanner/events.ts` — `ScanEvent` union, SSE encoder, step labels.
- `lib/scanner/fetch.ts` — `fetchAndCleanHomepage(url)` returns a `FetchResult` with cleaned/truncated text PLUS raw signals (response headers, set-cookies, ~50KB un-stripped HTML head, final URL). The cleaned text feeds Claude; the raw signals feed the fingerprinter.
- `lib/scanner/fingerprint.ts` — `detectStack(fetchResult, domain)` — server-authored stack detection from headers/cookies/HTML/CNAME. Declarative `DETECTORS` table (categorized by hosting/framework/cms/cdn/analytics/payments/auth/support/email). Pure function with one optional CNAME DNS lookup capped at 1.5s. Never throws — soft-fails on DNS errors. Returns `DetectedStack | null` which the pipeline persists alongside the LLM verdict on `reports.detected_stack`. `formatDetectedStackForLLM(stack)` returns the bullet block injected into the user message (NOT the cached system prompt). Add new fingerprints by appending to the `DETECTORS` array.
- `lib/scanner/llm.ts` — `callClaudeForVerdict` with cached system prompt + forced tool use + single Zod-driven retry. Runs at `temperature: 0.3` and ships a `## Standard cost reference` anchor table inside the system prompt — both are load-bearing for output consistency (don't silently undo). Detected signals (when present) are injected into the **user message** so they don't disrupt the cached system prompt; the system prompt has one static sentence telling the model to trust them as ground truth. After a successful Zod parse, `withComputedEstTotal` deterministically rewrites `est_total` from the numeric `est_cost` lines (sum, or `"$X + usage"` / `"usage-based"` strings when any line is `"???"`) — so the value persisted to the DB is server-authored, not LLM-authored.
- `lib/scanner/pipeline.ts` — `runScan` orchestrator. Order: normalize → cache check → fetch → fingerprint → analyze (LLM) → verdict insert. Fingerprint failures soft-fail (logged, scan proceeds with `detected_stack: null`).
- `lib/feature_flags.ts` — single helper `isDontTierGuidesEnabled()` reading `NEXT_PUBLIC_ENABLE_DONT_TIER_GUIDES`. The `NEXT_PUBLIC_` prefix is mandatory because consumers run in both server (API route, server-rendered VerdictReport) and client (VerdictReport inside `"use client"` Scanner) contexts.
- `lib/build_guide/schema.ts` — Zod `BuildGuideSchema` (overview, prerequisites, sequential steps, per-step LLM prompts, stack specifics, pitfalls).
- `lib/build_guide/llm.ts` — `generateBuildGuide(report)`. Second Claude call, input is the full `VerdictReport` JSON, output is the guide. **Uses Sonnet 4.6**. We tried Haiku 4.5 for the speed/cost win, but it returned incomplete tool_use payloads on our nested schema (missing top-level fields like `steps`, `stack_specifics`, `pitfalls`). Sonnet is reliable end-to-end. With the tight schema caps (body ≤450, overview ≤800, 6-7 steps, 1-2 prompts per step), Sonnet finishes in ~35-50s at ~4K output tokens. Retry handles truncation (rare) and Zod validation failures. **Tier-conditional branch:** when `report.tier === "DON'T"` the user message gets an extra "DON'T-tier framing" block instructing Claude to design an indie-hacker MVP rather than a full clone. System prompt (cached) is unchanged so the prompt cache stays warm for non-DON'T scans.
- `lib/build_guide/pipeline.ts` — `runGuideGeneration(report, emit)` — cache check → lock → LLM → persist, with SSE step events.
- `lib/social/templates.ts` — declarative template definitions for the daily X content engine. 5 report templates + 4 original templates. Each declares `tweet_count` (1 or 2), description, and 2-3 calibration examples. Threading is a structural property of the template — `report.cost_punchline` and `report.dont_riff` are 2-tweet threads; everything else is single-tweet. Add new templates here, not in the LLM prompt.
- `lib/social/schema.ts` — Zod `SocialPostOutputSchema` (`body` + optional `thread_bodies` + `includes_link`) + `TWEET_MAX = 270`. Per-template structural rules (single vs thread, link presence, link tweet) are enforced in the pipeline, not in the schema.
- `lib/social/llm.ts` — `generateSocialPost(input, signal)`. Sonnet 4.6, `temperature: 0.7` (higher than scanner's 0.3 for voice variability), forced tool use (`submit_post`), ephemerally-cached system prompt that quotes the voice rules from this file. Single Zod-driven retry with `is_error: true` tool_result feedback (mirrors `lib/scanner/llm.ts`).
- `lib/social/x_client.ts` — `postContent(parts: string[])` thin `twitter-api-v2` wrapper. Posts head + sequential replies; if the head goes out but a reply fails, returns `kind: 'error'` with `partial` populated so the orchestrator can mark the row `posted` (head is the canonical share surface) and log the reply failure separately.
- `lib/social/pipeline.ts` — `runDailySocial({ content_type, mode })` orchestrator. Sweeps stuck pending → claims slot via `insertPendingPost` (the partial unique index is the lock) → generates → validates → posts. `dry_run` mode persists with `status='dry_run'` (does not claim the daily slot).
- `lib/domain.ts` — `normalizeUrl` (eTLD+1 via `tldts`), `toSlug`, `fromSlug`.
- `lib/db/schema.sql` — source-of-truth Postgres schema (reports + build_guides + build_guide_purchases + error_log + social_posts + the `increment_report_view_count(p_slug)` RPC used for atomic popularity bumps). The bottom of the file holds idempotent `alter table … add column if not exists` / `create table if not exists` migration blocks for existing deployments.
- `lib/db/social_posts.ts` — social-posts DAL (admin-only). `getTodaySlot`, `getRecentlyPostedSlugs`, `getRecentOriginalBodies`, `insertPendingPost` (throws `SocialSlotTakenError` on slot collision), `insertDryRunPost`, `markPosted`, `markFailed`, `sweepStuckPending`.
- `lib/legal/types.ts`, `lib/legal/terms.ts`, `lib/legal/privacy.ts` — legal-doc content as `LegalSection[]` plus `TERMS_VERSION` / `PRIVACY_VERSION` ISO-date constants. The version constants double as the displayed effective date AND the value persisted on each purchase row at consent time. **Bump the version when you materially change the content.**
- `lib/db/supabase.ts` — anon (nullable) and admin clients.
- `lib/db/reports.ts` — reports DAL. `getReportByDomain`, `getReportBySlug`, `getRecentReports(6)`, `getAllReports(1000)` (drives sitemap + directory), `incrementReportViewCount` (calls the Postgres RPC), plus admin-only `insertReport` / `upsertReport`.
- `lib/db/build_guides.ts` — build guide DAL (admin-only).
- `lib/db/purchases.ts` — purchases DAL (admin-only).
- `lib/stripe.ts` — Stripe client, `createGuideCheckoutSession`, `guidePriceCents`, `isDevBypass` helper.
- `lib/email.ts` — Resend client + magic-link HTML/text templates. Logs to console instead of sending if `RESEND_API_KEY` is missing.
- `lib/ratelimit.ts` — Upstash Redis + IP rate limit + per-domain lock + per-IP-and-slug view-count limiter (5/min, prevents trivial popularity inflation). Pass-through if Upstash env missing.
- `lib/error_log.ts` — `logError({ scope, reason, refId, refSlug, message, detail })` persists to the `error_log` table and mirrors to stderr. **Never throws** — logging failures are themselves logged to console.
- `lib/scanner/user_messages.ts` and `lib/build_guide/pipeline.ts::USER_GUIDE_MESSAGES` — generic user-facing copy keyed by the pipeline's error reason enum.
- `scripts/seed.ts` — seeds the 4 handoff reports.
- `design/` — high-fidelity handoff bundles. **Specs, not code.** Don't import from them.

## Styling conventions (important — this is where most of the decisions live)

**Tailwind-first.** Use Tailwind classes for everything. Arbitrary values are fine for exact-pixel spec values (`text-[13px]`, `tracking-[-0.02em]`, `rotate-[-2deg]`, `shadow-[5px_5px_0_0_#0a0a0a]`). Inline `style={{...}}` is drift unless the value is computed from props/state (e.g. `style={{ color: verdict.tierColor }}` — fine; `style={{ fontSize: 18 }}` — not fine, use `text-lg`).

**Design tokens live in the `@theme` block in `app/globals.css`**, not in a JS config. Defined tokens:

- Colors: `bg`, `ink`, `accent`, `paper`, `paper-alt`, `muted`, `success`, `warning`, `danger`, `sticky`, `coral`, `purple`, `tier-weekend-bg`, `tier-month-bg`, `tier-dont-bg` → used as `bg-ink`, `text-accent`, `border-ink`, etc.
- Fonts: `font-display`, `font-mono`

To add a new color, add `--color-foo: #...;` inside `@theme`. Tailwind v4 auto-generates `bg-foo`/`text-foo`/`border-foo`.

**Custom utility classes in `globals.css`** (keep here because they're design-system concerns, not arbitrary one-offs):
- `.bru` / `.bru-sm` / `.bru-xs` — neo-brutalist border + hard offset shadow, the signature look
- `.container` — max-width 1280px, centered, 48px/20px horizontal padding
- Animations: `.marquee-track` (28s scroll), `.wob` (CTA wobble), `.dot1/2/3` (loading dots) — all zeroed under `prefers-reduced-motion`
- Responsive layout helpers with non-default breakpoints: `.verdict-main` (stacks <720px), `.how-grid` (collapses <900px)

**Section structure pattern:**
```tsx
<section className="py-20 bg-whatever">      // full-bleed background + vertical padding
  <div className="container">                 // centered, capped at 1280px
    ...content...
  </div>
</section>
```
Exception: `<Marquee />` is intentionally edge-to-edge — do not wrap it in `.container`.

**Client vs server components:** `Scanner`, `PurchaseCTA`, and `FAQItem` are `"use client"`. Everything else (including `VerdictGrid`, which is `async` and queries Supabase) is a server component. Keep it that way unless state/effects are genuinely needed.

**VerdictReport renders in BOTH contexts** — server-side on `/r/[slug]`, *and* client-side when Scanner (a client component) renders it inline after a fresh scan. That's why any logic added to it must be client-bundle safe: only `NEXT_PUBLIC_*` env vars, no server-only imports (DB clients, secrets, `node:`-prefixed modules). The dual-render path is what required `NEXT_PUBLIC_ENABLE_DONT_TIER_GUIDES` instead of a plain `ENABLE_*` var.

## Environment variables

```
# Supabase (all DB access)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # server-only

# Claude (verdict + build-guide generation)
ANTHROPIC_API_KEY=

# Upstash Redis (rate limit + lock + resend limit)
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# Stripe (guide checkout)
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=               # from `stripe listen` or dashboard
STRIPE_GUIDE_PRICE_ID=               # optional; if unset, uses inline price_data w/ GUIDE_PRICE_CENTS
GUIDE_PRICE_CENTS=700                # display + fallback. 0 + NODE_ENV!=prod → dev bypass.

# Resend (magic-link delivery + newsletter audience)
RESEND_API_KEY=
RESEND_FROM=guides@saaspocalypse.dev
RESEND_AUDIENCE_ID=                  # optional; without it /api/newsletter logs to stderr instead

# X (Twitter) — daily content engine. OAuth 1.0a app + user access token.
# Generate from a developer X app with Read+Write scope.
X_API_KEY=
X_API_SECRET=
X_ACCESS_TOKEN=
X_ACCESS_TOKEN_SECRET=

# Vercel Cron auth shared secret. All /api/cron/* routes require
# Authorization: Bearer ${CRON_SECRET}. Vercel injects this automatically
# into scheduled cron requests; you'll need to send it manually for local
# dry-runs (curl -H "Authorization: Bearer $CRON_SECRET" ...).
CRON_SECRET=

# Feature flags (NEXT_PUBLIC_ prefix is required — read on both server and client; VerdictReport renders in both contexts)
NEXT_PUBLIC_ENABLE_DONT_TIER_GUIDES=false   # "true" allows purchasing MVP-style build guides for DON'T-tier reports. Off by default — keeps the existing disabled "→ sorry, we tried" affordance.
```

Degraded-mode behavior (so the codebase stays workable pre-provisioning):
- **No Supabase:** `pnpm build` still succeeds. Anon reads return null/[]; `<VerdictGrid>` shows the empty state.
- **No Upstash:** rate limits + locks pass through. OK for dev, **unsafe for prod** (LLM cost exposure).
- **No Anthropic:** scan + guide endpoints return friendly errors.
- **No Stripe + `GUIDE_PRICE_CENTS=0`:** dev bypass kicks in. `/api/purchase` skips checkout, creates a paid purchase, and emails the magic link directly. Only active when `NODE_ENV !== 'production'`.
- **No Resend:** emails log to the console instead of sending. Magic links are still generated and persisted, so you can grab them from logs.
- **No `RESEND_AUDIENCE_ID`:** newsletter signups log to stderr and the form still shows the success state. No contact is added to any audience until the env var is set.
- **No X creds (any of the four `X_*` vars missing):** the daily X cron returns `{ kind: 'failed', reason: 'x_auth' }` and logs once. `?dry=1` runs still work because they never call the X API. Useful to exercise the LLM + voice locally without a developer account.
- **No `CRON_SECRET`:** the cron route 401s every call (including legitimate Vercel-Cron firings). Set this in production before enabling the cron, or social posting will silently no-op.
- **`NEXT_PUBLIC_ENABLE_DONT_TIER_GUIDES=true`:** `/api/purchase` no longer rejects DON'T-tier reports, the report-page CTA renders as `→ get the MVP guide`, the modal shows an MVP-starter disclaimer, and the build-guide LLM prompt gets a tier-conditional framing block telling Claude to design an indie-hacker MVP rather than pretending a full clone is feasible. The `NEXT_PUBLIC_` prefix is mandatory because VerdictReport renders both server-side (per-report pages) and client-side (inline after a fresh scan via the `"use client"` Scanner) — without the prefix the inline-scan path would never see the flag.

## Setting up Supabase (first-time)

1. Create a Supabase project. Copy URL, anon key, and service-role key into `.env.local`.
2. Open the Supabase SQL editor and paste the contents of `lib/db/schema.sql`. Run it (covers `reports`, `build_guides`, `build_guide_purchases`, `error_log`, `social_posts`, the `increment_report_view_count` RPC, plus migration blocks at the bottom). The `alter table … add column if not exists` / `create table if not exists` blocks at the bottom are safe to re-run after pulling new schema changes — for example, the `view_count` column or the `social_posts` table on existing deployments.
3. Run `pnpm tsx scripts/seed.ts` to insert the 4 example reports.
4. Visit `/r/notion-ish-com` — the full VerdictReport should render. Visit `/directory` — the seeded reports should appear as cards.

## Error handling convention (important)

**Users see generic copy. Ops sees detail.** Every error path along a paid flow (scan, guide generation, purchase, webhook, resend) and ops flow (newsletter, social cron) follows this rule:

1. **Never surface the raw error message to the user.** No Zod issues, no DB error codes, no stack traces, no LLM error strings. Map every failure to an enum reason and look up the friendly copy from `USER_SCAN_MESSAGES` or `USER_GUIDE_MESSAGES`.
2. **Always call `logError(...)`** in the same branch. The table captures `scope`, `reason`, `ref_id` (report/purchase), `ref_slug`, the real internal `message`, and a `detail` JSON blob. Mirrors to stderr so dev is painless.
3. Structural helper pattern (see `lib/scanner/pipeline.ts::emitScanError` and `lib/build_guide/pipeline.ts::emitGuideError`): one function that both logs and emits the generic user event, so error branches can't forget either half.

Query the table to debug a user report:

```sql
select created_at, scope, reason, ref_slug, message
from error_log
where ref_slug = 'notion-ish-com'  -- or by purchase email, etc.
order by created_at desc
limit 20;
```

**Don't log for intentional user-facing rejections** (e.g. DON'T-tier purchase refusal). Those aren't system errors.

## Setting up Stripe (Phase 3)

1. Grab a test secret key from the Stripe dashboard → `STRIPE_SECRET_KEY=sk_test_...`.
2. Install the Stripe CLI and run `stripe listen --forward-to localhost:3000/api/purchase/webhook`. Copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`.
3. Either leave `STRIPE_GUIDE_PRICE_ID` unset (we inline `price_data`) or create a Product + Price in Stripe and set the Price ID.
4. Alternatively — skip all of the above by setting `GUIDE_PRICE_CENTS=0` in dev. The purchase flow completes without Stripe and just emails the magic link.

## Legal pages & consent

- **Pages:** `/terms` and `/privacy` are server-rendered from `lib/legal/{terms,privacy}.ts` via the shared `<LegalPage>` shell. Linked from the footer.
- **Soft consent (free scan):** static italic line under the `✦ no signup` micro-row in `Hero.tsx`. Browsewrap. No DB write — purely conspicuous notice.
- **Hard consent (paid guide):** required checkbox in the `PurchaseCTA` modal. The POST body to `/api/purchase` must include `accepted: true`, `terms_version`, `privacy_version`. The route validates them with Zod, then `createPendingPurchase` / `createPaidPurchase` persists the version strings + a server-generated `terms_accepted_at` onto the `build_guide_purchases` row. `accepted_at` is server-authoritative — clients can't forge it.
- **Versioning:** ISO date strings (e.g. `"2026-04-25"`). Old purchase rows preserve the version they accepted; new buyers persist the current version. There is no "force re-acceptance" flow today.
- **Placeholders:** `[LEGAL_NAME]`, `[CONTACT_EMAIL]`, `[GOVERNING_LAW_STATE]` appear verbatim in the doc bodies. Search and replace before launch.

## SEO surfaces

- **Sitemap / robots:** `app/sitemap.ts` enumerates landing, `/directory`, `/terms`, `/privacy`, plus one entry per report (driven off `getAllReports`). `app/robots.ts` allows everything except `/api/` and `/r/*/guide` (the token-gated pages must not be indexed). Both routes ISR at the same 1-hour cadence as the rest of the site.
- **Structured data (JSON-LD):** rendered as `<script type="application/ld+json">` in server components — no client JS. Landing emits `WebSite` + `Organization`; per-report emits a `Review` of a `SoftwareApplication` with `reviewRating.ratingValue = report.score` (best 100). Both via `lib/seo/jsonld.ts`. Validate at <https://validator.schema.org> + Google Rich Results Test.
- **Per-report titles are intent-led**, not brand-led. Format: `Can I build {name}? — {tier} · {time_estimate} · saaspocalypse`. Generated by `lib/seo/meta.ts::reportTitle`. The on-page H1 in `VerdictReport.tsx` is just `{name}` — the title tag carries the long-tail query phrase.
- **OG / Twitter images use Next's file convention.** Default at `app/opengraph-image.tsx` (1200×630 brutalist site card). Per-report at `app/r/[slug]/opengraph-image.tsx` — loads `getReportBySlug`, renders the tier-colored score (~240px) + name + tagline + take quote + time/cost foot strip. Falls back to a "verdict not found · slug: <slug>" card with a `console.error` so it's obvious in dev when a slug doesn't resolve. **Don't add `runtime = "edge"`** — we want Node so Supabase's anon client works (the @supabase/supabase-js client is fetch-based but its dotenv-style env loading is friendlier on Node).
- **Favicons** are set up via the Next file convention: `app/icon[1-5].png` (16/32/48/96/144) and `app/apple-icon.png` (180×180). Next auto-emits the `<link rel="icon">` and `<link rel="apple-touch-icon">` tags. Don't hand-roll those tags in `<head>`.

## Popularity tracking

Per-report `view_count` is bumped from two paths and exposed on the directory's `most popular` sort + `{n} 👁` foot-meta on each card.

- **Schema:** `view_count integer not null default 0` on `reports`, plus `reports_view_count_idx` and the `increment_report_view_count(p_slug)` SQL function — all defined at the top of `lib/db/schema.sql` and as idempotent migration blocks at the bottom for existing deployments.
- **DAL:** `incrementReportViewCount(slug)` in `lib/db/reports.ts` calls the RPC via the admin client. Atomic — no read-modify-write race, no service-role token in the browser.
- **Write path 1 — page view:** `<TrackView slug={slug} />` mounted at the bottom of `app/r/[slug]/page.tsx` POSTs to `/api/reports/[slug]/view`. The route is rate-limited 5/min per IP+slug via `getViewRateLimiter`. **The component uses a `useRef` guard** so React Strict Mode's intentional double-mount in dev doesn't double-bump the counter. In production strict mode doesn't double-invoke effects, so the guard is a no-op there.
- **Write path 2 — cached scan hit:** `lib/scanner/pipeline.ts::runScan` fires `incrementReportViewCount(cached.slug)` in the cached-hit branch. Fire-and-forget; failures log via `logError({ scope: "view", reason: "increment_failed" })` and never block the SSE response.
- **Stale display:** counts on `/r/[slug]` and `/directory` lag by up to 1 hour because of ISR. Acceptable for V1; tighten only if needed.
- **Bots:** crawlers that don't run JS won't inflate the page-view counter (intentional). They will still hit cached scans if they POST to `/api/scan`, but that's gated by IP rate limit + domain lock.

## Daily X content engine

Posts twice per day — one report-driven hook in the morning (14:00 UTC, 10:00 ET) that drives traffic to a `/r/<slug>` page, one original PG-voiced bite in the afternoon (21:00 UTC, 17:00 ET). Vercel Cron fires both via `vercel.json`. The slots are independent: a failed report slot does not block the original.

- **Routes:** `app/api/cron/social/[content_type]/route.ts` — single dynamic route, two cron entries. Bearer-auth gated via `CRON_SECRET`. Append `?dry=1` to generate without posting (still requires the Bearer header).
- **Templates:** 5 report templates + 4 original templates declared in `lib/social/templates.ts`. `report.cost_punchline` and `report.dont_riff` are 2-tweet threads (head carries the URL, reply carries the receipt/why-not). The other 7 are single-tweet. Adding a template is a one-file change — append to the array, the LLM picks it up next run.
- **Voice rules:** the system prompt in `lib/social/llm.ts` quotes the same capitalization conventions and don't-be-mean rules as the rest of the site. Update both this file and `lib/social/llm.ts` when those rules change.
- **Idempotency:** a partial unique index on `social_posts (platform, scheduled_for, content_type) where status in ('posted','pending')` is the per-slot lock. `failed`/`dry_run` rows do NOT claim the slot, so manual re-runs after a failure work. `sweepStuckPending` flips any pending row >5 min old to `failed` so cron retries can claim a fresh slot.
- **Threading partial-success:** if X posts the head tweet but a reply fails, the row is marked `posted` (the head is the canonical share surface) and the reply failure is logged separately as `reason: 'thread_partial'`. We don't roll back the head — X has no atomic delete inside a 60s function.
- **Error scope:** every error path along the engine calls `logError({ scope: 'social', reason, ... })`. Reasons enum: `claim_slot_failed | sweep_failed | dry_run_persist_failed | mark_posted_failed | mark_failed_failed | thread_partial | empty_report_corpus | wrong_tweet_count | tweet_too_long | missing_link | link_on_reply | unexpected_link | llm_failed | validation_failed | x_auth | x_rate_limited | x_duplicate | x_rejected | x_unknown`.
- **Local dry-run loop:** `curl -H "Authorization: Bearer $CRON_SECRET" "http://localhost:3000/api/cron/social/report?dry=1"` (and `/original?dry=1`). Run each ~10 times; review with `select template_id, body, thread_bodies, content_type, created_at from social_posts where status='dry_run' order by created_at desc limit 30;`.
- **Cost:** ~2 Sonnet calls/day at ~800 max tokens each, with cached system prompt → ~$0.03–0.05/day. Negligible.

## Content & copy

All copy is final and intentional — the jokes are the product. Don't sanitize. Edit `lib/content.ts`. Long-form legal prose lives in `lib/legal/`, not `lib/content.ts`.

### Capitalization conventions

The site mixes three voices on purpose. Match the voice of the surrounding copy when adding new strings.

- **ALL CAPS** (source written lowercase + Tailwind `uppercase tracking-[0.1…0.15em]`) — eyebrows, micro-labels, status pills, tier badges, scan numbers, "STEP 01", the `SAASPOCALYPSE` brand pill. Categorical labels, not sentences.
- **lowercase-first deadpan** (lowercase + a final `.` or `?`) — section H3s inside long-form artifacts (`cost breakdown.`, `what'll actually be hard.`, `prerequisites.`, `the build.`), big bottom-of-page joke CTAs (`go on then.` and its supporting line), marquee one-liners, asides like `you keep it forever.`, the entire pricing section's voice (sub, bullets, footer note).
- **Sentence case** — earnest UI and content: hero H1/sub, nav links, FAQ Q&A, How-It-Works titles + bodies, modal H2/body (`Get your build guide.`), verdict-report CTA copy, empty states, legal pages, email content, primary action buttons (`Search →`, `Scan a URL ↓/→`, `Send me my guide`).

Two exceptions worth knowing:
- The `judge it →` button next to the URL input is intentionally lowercase — it's the signature voice button. New buttons should default to sentence case unless they're playing the same role.
- Tiny utility/pagination chrome (`← prev`, `next →`, `↻ reset filters`, `↻ clear filters`) stays lowercase. They're navigational, not CTAs.

The brand `saaspocalypse` is always lowercase except inside the ALL CAPS pill (`SAASPOCALYPSE`). Proper-noun caps are preserved inside any voice (`Postgres`, `Next.js`, `Supabase`, `SaaS`, `CRUD`, `URL`).

Mnemonic: **labels shout, prose talks, jokes whisper.**

### Blog voice

Blog posts target **Paul Graham essay register + a thread of indie-hacker humor**. Most posts are essays; keep one confession piece per batch for tonal variety.

**Essays (`category: "essays"`, ~1500–2000 words, ~7–8 min):**
- Open with the contrarian claim. No throat-clearing.
- State the thesis inside the first three paragraphs.
- 3–5 H2s, each one advancing the argument (not summarizing).
- Exactly one `callout` block per essay — the load-bearing line, the thesis crystallized. Callouts are written lowercase-deadpan even when surrounding prose is sentence case; the renderer styles them as pull quotes.
- Close with a "this is why I built saaspocalypse" beat. PG's "this is why I care," not a CTA.
- Humor is seasoning. One or two dry asides per section, not a punchline per paragraph.

**Confessions (`category: "confessions"`, ~500–800 words, ~3–5 min):**
- Lowercase-deadpan end to end, matching the marquee and pricing copy.
- Short paragraphs. No four-sentence walls.
- One callout used as the punchline.
- Self-roast first; generalize last (or not at all).

**Build logs (`category: "build-log"`, ~1100–1500 words, ~5–7 min):**
- Concrete, technical, narrated. Reflection beat goes in the *last* H2, not the first.
- No code-block type exists — describe code in prose, or use `callout` for the load-bearing snippet.

**Universal post rules:**
- Title: short, declarative. Avoid the "Title. Subtitle clause." listicle pattern and "here's the part that…" tics.
- `excerpt`: 100–160 chars, ASCII-only — it feeds the Satori OG image, and smart quotes / em-dashes / `…` / `∞` either tofu or fail to download a font.
- `tags`: 2 max, kebab-case, personal-feeling (`manifesto`, `scope-creep` — not `productivity`).
- `date`: ISO `YYYY-MM-DD`, roughly weekly cadence (the masthead claims as much).
- `read_time`: estimate at ~220 words/min, round to nearest minute.
- `author`: always `"saaspocalypse"`.
- Exactly one post has `featured: true` — `lib/blog/posts/index.ts` throws at module eval otherwise. Currently `no-original-saas-ideas` (the site manifesto).
- Body block types are `p` | `h2` | `callout` only. No code blocks, no images, no lists. Change the schema before smuggling HTML into a `p` text string.

## Design handoffs

When the user points to a `design/design_handoff_*` folder:
1. Read its `README.md` — tokens, spacing, copy, and interaction specs are final ("high-fidelity").
2. The `.jsx` or `.html` is a **prototype**, not shippable code. Reimplement in our conventions (Tailwind + App Router + TypeScript), don't copy-paste inline styles.
3. Keep the prototype file in place for reference; don't delete it.

Current hero uses `design_handoff_ransom_hero` (per-word rotated chips). Other sections come from `design_handoff_saaspocalypse`.

## Accessibility

- Reduced-motion is respected (marquee, wobble, loading dots all zero out).
- FAQ toggles use `<button aria-expanded>`, scanner button has `aria-live="polite"`, star ratings and the URL input have `aria-label`s.
- Don't use lime accent for body-sized text on cream — fails contrast.

## Gotchas

- **Turbopack is dev-only.** `next build --turbopack` fails with a `/_document` error on Next 15.5. Keep build on webpack until that's fixed upstream. This mirrors the current `create-next-app` default.
- **ESLint uses flat config** (`eslint.config.mjs`) and needs `@eslint/eslintrc` as a dep for `FlatCompat` — don't remove it.
- **`next-env.d.ts` is auto-managed** by Next — Next will rewrite it, so don't edit by hand.
- **Marquee duplicates its content twice** and translates `-50%` for a seamless loop; don't "fix" the apparent duplication.
- **Tailwind arbitrary values with spaces need underscores**: `shadow-[5px_5px_0_0_#0a0a0a]`, `text-[clamp(56px,8vw,120px)]` (no spaces inside clamp).
- **Snake_case everywhere.** The DB, the Zod schema, the UI props, and the LLM tool output all use `snake_case` field names (`time_estimate`, `current_cost`, etc.). No camel/snake transformation layer. The handoff prototype `.jsx` uses camelCase — that's just the prototype's choice, ignore it when reading.
- **Cross-field invariants live in Zod**, not in the DB. The tier↔score bucket check (WEEKEND≥70, MONTH 30–69, DON'T<30) and challenge-sorted-ascending-by-difficulty are enforced by `.refine()` in `lib/scanner/schema.ts`. Any new invariant goes there too.
- **Zod 4 is installed** and has built-in `z.toJSONSchema()` — that's what hands the `submit_verdict` tool schema to Claude (see `lib/scanner/llm.ts::sanitizeInputSchema`). Strip `$schema` / `$id` from the output before passing to Anthropic.
- **`/api/scan` is SSE.** The client (`components/Scanner.tsx`) reads the response stream frame-by-frame (split on `\n\n`, parse `data: <json>`). Each frame is a `ScanEvent` — `step` / `done` / `error`. Do not convert to a regular JSON endpoint without also reworking the client.
- **`maxDuration = 60`** on the scan route. Requires Vercel Pro or Fluid compute at deploy time. A cold scan (fetch + Claude with thinking) runs ~15-30s in practice.
- **Scanner cached-hit path is silent.** If a domain is in the DB, the only SSE event emitted is `done` with `cached: true` — no step events. The UI transitions straight from "scanning" to the full report, which is fine but means you can't rely on seeing step events in tests.
- **Guide stream "done" triggers a page reload.** The SSE `done` event from `/api/guide/[slug]` triggers `window.location.reload()` in the client so the server-rendered page picks up the persisted guide on the next render. Slight flash, but avoids hand-rolling a second rendering path. If you change this, make sure the client receives both the report and the guide on `done`.
- **Stripe v22 types** don't expose nested sub-namespaces via the top-level `Stripe.Checkout.SessionCreateParams` alias — don't try to reference `SessionCreateParams.LineItem` directly. We rely on inferred types instead (see `lib/stripe.ts::createGuideCheckoutSession`).
- **Webhook needs raw body.** `/api/purchase/webhook` calls `req.text()` — do not switch to `req.json()`. Stripe signature verification hashes the raw bytes.
- **Both scanner and guide use Sonnet 4.6.** We attempted Haiku 4.5 for the guide to save time/cost, but it returned incomplete tool_use payloads on our nested schema (missing required top-level fields). Don't re-try Haiku without also flattening the schema or adding a "repair" retry layer.
- **`build_guide/llm.ts` has tight schema bounds** (6–7 steps, max 2 prompts per step, body ≤450 chars, overview ≤800 chars). This caps cost/latency to ~$0.08 and ~40s per cold generation. Loosening these = slower + more expensive.
- **Scanner `est_total` is server-computed, not LLM-authored.** `lib/scanner/llm.ts::computeEstTotal` runs after Zod validation and overwrites whatever the model wrote: numeric sum of `est_cost` lines if all are numeric, `"$X + usage"` if some are `"???"` strings, `"usage-based"` if no fixed costs exist. If `est_total` looks wrong, debug the helper or the `est_cost` lines feeding it — not the prompt.
- **OG images use Satori (`next/og`), not real CSS.** Two non-obvious rules: (1) every `<div>` with more than one child node MUST have an explicit `display: "flex"` or `display: "none"` — `display: block` doesn't exist and Satori errors out at build/request time. (2) Satori only embeds a basic-Latin sans-serif font; emoji, `∞`, smart quotes (`“`, `’`), em-dashes, `…`, `▸` etc. either render as tofu or trigger a "Failed to download dynamic font" warning. The per-report OG runs LLM-generated text through a `sanitize()` helper that maps the common offenders (`∞ → "lots"`, smart quotes → straight, em/en-dash → hyphen, `… → "..."`) and strips anything else outside `[\x20-\x7E]`. Apply the same approach to any new OG that renders user/LLM-supplied strings.
- **TrackView guards against React Strict Mode double-fire.** `components/TrackView.tsx` keeps a `useRef` so the second mount of the same slug bails out — otherwise dev increments view counts by 2 per page load. Don't remove the guard.
- **Directory filter state lives in URL search params** (`?tier=WEEKEND&sort=popular&page=2`), not React state. Each filter view is a separately crawlable URL which is intentional for SEO. The page is a server component; only `DirectorySearch` and `ScoreRangeFilter` are `"use client"` and they `router.replace` to update the URL.

## Not yet built

- Scan quality logging (`scan_metrics` table — see plan §"Quality measurement").
- Playwright-based scraping for JS-heavy sites.
- Admin regenerate / moderation / refund tools.
- Guide regeneration / versioning (currently `build_guides.report_id` is unique — regen would need either a new-column version or an "archive old row" flow).
