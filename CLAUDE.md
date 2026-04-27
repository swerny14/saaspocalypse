# saaspocalypse

Marketing landing page for a (not yet built) tool that tells indie hackers whether they could build a given SaaS themselves — returning a buildability score, stack receipt, time-to-clone, and a snarky one-liner. The tone is intentionally pun-heavy and corny; the jokes are the product.

## Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (CSS-based config, no `tailwind.config.ts`)
- **Fonts:** `next/font/google` — Space Grotesk (display) + JetBrains Mono (body)
- **Package manager:** pnpm
- **Deployment target:** Vercel

**Shipped:** Phases 1 + 2 + 3 + SEO. Real Claude-powered scanner, report storage, ISR'd per-report SEO pages, SSE-streamed scan UX, IP rate limiting, per-domain locking, Stripe-gated build guide generation (lazy, shared per report_id), magic-link email delivery via Resend. Public legal pages (`/terms`, `/privacy`) with version-tracked consent captured at purchase and a soft-consent line under the scanner. Full SEO surface: `app/sitemap.ts`, `app/robots.ts`, JSON-LD on landing (`WebSite` + `Organization`) and per-report (`Review` of a `SoftwareApplication`), dynamic OG images at `app/opengraph-image.tsx` (default) and `app/r/[slug]/opengraph-image.tsx` (per-report, tier-colored score), favicons (`app/icon[1-5].png` + `app/apple-icon.png` auto-detected by Next), intent-led per-report titles ("Can I build {name}?" — see `lib/seo/meta.ts`). Public `/directory` page (Layout A "filing cabinet") with URL-driven filters (tier, score range, query, sort, page). Per-report `view_count` tracking with `most popular` sort.

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

- `app/` — App Router entry. `layout.tsx` (global `<Nav />`), `page.tsx` (landing), `r/[slug]/page.tsx` (per-report SEO page, ISR'd), `r/[slug]/guide/page.tsx` (token-gated build guide), `directory/page.tsx` (public report index), `terms/page.tsx`, `privacy/page.tsx`, `sitemap.ts`, `robots.ts`, `opengraph-image.tsx` (default site OG), `r/[slug]/opengraph-image.tsx` (per-report dynamic OG), `icon[1-5].png` + `apple-icon.png` (favicons, Next file convention), `api/scan/route.ts`, `api/guide/[slug]/route.ts`, `api/purchase/{route,webhook,resend}/route.ts`, `api/reports/[slug]/view/route.ts` (view-count increment), `globals.css`.
- `components/` — section + interactive components. `VerdictReport.tsx` is the full report card; `BuildGuide.tsx` is the full guide with copy-to-clipboard prompt blocks; `PurchaseCTA.tsx` is the client CTA + email-capture modal (with required Terms/Privacy checkbox); `LegalPage.tsx` is the shared shell that renders Terms and Privacy; `TrackView.tsx` is the 5-line client component that fires the per-page-view POST.
- `components/directory/` — directory page subcomponents: `DirectoryCard.tsx` (handoff Layout A card), `TierBadge.tsx`, `ScoreBar.tsx` (10-segment), `FilterGroup.tsx`, `FilterRow.tsx`, `PageBtn.tsx`, `DirectorySearch.tsx` (client search bar + sort), `ScoreRangeFilter.tsx` (client min/max + visual track), `tiers.ts` (the 3 directory tiers).
- `lib/seo/meta.ts` — title/description builders. `reportTitle` produces `"Can I build {name}? — {tier} · {time_estimate} · saaspocalypse"`; `reportOgTitle` is a longer Twitter/Slack-friendly form; `reportDescription` blends score + time + stack + first sentence of `take`, with graceful fallback when ≤155 chars overflows. **All metadata, OG, and JSON-LD `headline` fields call these so they don't drift.**
- `lib/seo/jsonld.ts` — `landingJsonLd` (`WebSite` + `Organization` graph) and `reportJsonLd` (`Review` of `SoftwareApplication`). `serializeJsonLd` escapes `<` so the payload can't break out of its `<script>` tag.
- `lib/content.ts` — static copy (headlines, testimonials, FAQs, footer, marquee, pricing). **Change copy here, not in components.**
- `lib/scanner/schema.ts` — Zod `VerdictReportSchema` (canonical verdict shape: DB row + LLM tool + UI). Exports `VerdictReport`, `Tier`, `Difficulty`, color maps.
- `lib/scanner/events.ts` — `ScanEvent` union, SSE encoder, step labels.
- `lib/scanner/fetch.ts` — `fetchAndCleanHomepage(url)` — HTML strip + 20KB truncate.
- `lib/scanner/llm.ts` — `callClaudeForVerdict` with cached system prompt + forced tool use + single Zod-driven retry.
- `lib/scanner/pipeline.ts` — `runScan` orchestrator.
- `lib/build_guide/schema.ts` — Zod `BuildGuideSchema` (overview, prerequisites, sequential steps, per-step LLM prompts, stack specifics, pitfalls).
- `lib/build_guide/llm.ts` — `generateBuildGuide(report)`. Second Claude call, input is the full `VerdictReport` JSON, output is the guide. **Uses Sonnet 4.6**. We tried Haiku 4.5 for the speed/cost win, but it returned incomplete tool_use payloads on our nested schema (missing top-level fields like `steps`, `stack_specifics`, `pitfalls`). Sonnet is reliable end-to-end. With the tight schema caps (body ≤700, overview ≤1200, 6-8 steps, 1-2 prompts per step), Sonnet finishes in ~35-50s at ~4K output tokens. Retry handles truncation (rare) and Zod validation failures.
- `lib/build_guide/pipeline.ts` — `runGuideGeneration(report, emit)` — cache check → lock → LLM → persist, with SSE step events.
- `lib/domain.ts` — `normalizeUrl` (eTLD+1 via `tldts`), `toSlug`, `fromSlug`.
- `lib/db/schema.sql` — source-of-truth Postgres schema (reports + build_guides + build_guide_purchases + error_log + the `increment_report_view_count(p_slug)` RPC used for atomic popularity bumps). The bottom of the file holds idempotent `alter table … add column if not exists` migration blocks for existing deployments.
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

**Client vs server components:** `Scanner` and `FAQItem` are `"use client"`. Everything else (including `VerdictGrid`, which is `async` and queries Supabase, and `VerdictReport`, which is pure presentation) is a server component. Keep it that way unless state/effects are genuinely needed.

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

# Resend (magic-link delivery)
RESEND_API_KEY=
RESEND_FROM=guides@saaspocalypse.dev
```

Degraded-mode behavior (so the codebase stays workable pre-provisioning):
- **No Supabase:** `pnpm build` still succeeds. Anon reads return null/[]; `<VerdictGrid>` shows the empty state.
- **No Upstash:** rate limits + locks pass through. OK for dev, **unsafe for prod** (LLM cost exposure).
- **No Anthropic:** scan + guide endpoints return friendly errors.
- **No Stripe + `GUIDE_PRICE_CENTS=0`:** dev bypass kicks in. `/api/purchase` skips checkout, creates a paid purchase, and emails the magic link directly. Only active when `NODE_ENV !== 'production'`.
- **No Resend:** emails log to the console instead of sending. Magic links are still generated and persisted, so you can grab them from logs.

## Setting up Supabase (first-time)

1. Create a Supabase project. Copy URL, anon key, and service-role key into `.env.local`.
2. Open the Supabase SQL editor and paste the contents of `lib/db/schema.sql`. Run it (covers `reports`, `build_guides`, `build_guide_purchases`, `error_log`, the `increment_report_view_count` RPC, plus migration blocks at the bottom). The `alter table … add column if not exists` blocks at the bottom are safe to re-run after pulling new schema changes — for example, the `view_count` column on existing deployments.
3. Run `pnpm tsx scripts/seed.ts` to insert the 4 example reports.
4. Visit `/r/notion-ish-com` — the full VerdictReport should render. Visit `/directory` — the seeded reports should appear as cards.

## Error handling convention (important)

**Users see generic copy. Ops sees detail.** Every error path along a paid flow (scan, guide generation, purchase, webhook, resend) follows this rule:

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
- **`build_guide/llm.ts` has tight schema bounds** (6–8 steps, max 2 prompts per step, body ≤700 chars, overview ≤1200 chars). This caps cost/latency to ~$0.08 and ~40s per cold generation. Loosening these = slower + more expensive.
- **OG images use Satori (`next/og`), not real CSS.** Two non-obvious rules: (1) every `<div>` with more than one child node MUST have an explicit `display: "flex"` or `display: "none"` — `display: block` doesn't exist and Satori errors out at build/request time. (2) Satori only embeds a basic-Latin sans-serif font; emoji, `∞`, smart quotes (`“`, `’`), em-dashes, `…`, `▸` etc. either render as tofu or trigger a "Failed to download dynamic font" warning. The per-report OG runs LLM-generated text through a `sanitize()` helper that maps the common offenders (`∞ → "lots"`, smart quotes → straight, em/en-dash → hyphen, `… → "..."`) and strips anything else outside `[\x20-\x7E]`. Apply the same approach to any new OG that renders user/LLM-supplied strings.
- **TrackView guards against React Strict Mode double-fire.** `components/TrackView.tsx` keeps a `useRef` so the second mount of the same slug bails out — otherwise dev increments view counts by 2 per page load. Don't remove the guard.
- **Directory filter state lives in URL search params** (`?tier=WEEKEND&sort=popular&page=2`), not React state. Each filter view is a separately crawlable URL which is intentional for SEO. The page is a server component; only `DirectorySearch` and `ScoreRangeFilter` are `"use client"` and they `router.replace` to update the URL.

## Not yet built

- Scan quality logging (`scan_metrics` table — see plan §"Quality measurement").
- Playwright-based scraping for JS-heavy sites.
- Admin regenerate / moderation / refund tools.
- Guide regeneration / versioning (currently `build_guides.report_id` is unique — regen would need either a new-column version or an "archive old row" flow).
