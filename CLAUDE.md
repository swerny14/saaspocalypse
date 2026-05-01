# saaspocalypse

Marketing landing page for a tool that tells AI-assisted indie devs **where the walls are thin** in the SaaS market — returning a wedge score, stack receipt, time-to-clone, and a candid one-liner. The tone is intentionally pun-heavy in marketing surfaces (hero, blog, X, marquee, pricing footer) and direct/analytical on the data surfaces (verdict take, compare verdicts, moat methodology).

## Pivot status — wedge frame (Phases 1–2.5 shipped)

The product pivoted from a **buildability scanner** ("can I clone X?") to a **wedge scanner** ("where do I attack X?") for AI-assisted indie devs in pre-decision mode. With AI-assisted dev tools, buildability is increasingly trivial; the question that actually matters is "given an incumbent, where's the wedge?" The data infrastructure (deterministic projection layer, moat scoring, similarity engine, compare pages) carries forward unchanged in shape; the framing flipped around it.

**Naming locked:**
- Headline number: `wedge_score` — DB column, server-derived from the moat aggregate as `round((10 - aggregate) * 10)`. Higher = thinner walls = more wedgeable.
- Tier labels: **SOFT / CONTESTED / FORTRESS** (replaced WEEKEND / MONTH / DON'T; wedge_score buckets ≥70 / 30–69 / <30)
- The buildability score is **gone end-to-end** as of Phase 2.5 — no LLM emit, no DB column, no UI display. Difficulty information about the build now lives entirely inside the per-challenge `diff` field; the moat's technical axis is derived from the per-challenge difficulty distribution.

**What shipped in Phase 2 (atomic):**
- Tier vocabulary swapped end-to-end. Zod enum updated, scanner LLM prompt updated with new tier names + worked examples, DB migration block rewrites existing rows (WEEKEND→SOFT, MONTH→CONTESTED, DON'T→FORTRESS) and replaces the CHECK constraint.
- "buildability" → "wedge" rename across user-facing surfaces (titles, OG images, methodology, directory, hero, FAQ, JSON-LD, MoatBreakdown labels, compare verdicts, build guide LLM prompt FORTRESS-tier framing).
- Moat semantics flipped editorially. "Fortress" no longer reads as admiration — it's "thick walls" (danger for the builder). Coral still = high score; the editorial reading is the only thing that moved. MoatBreakdown blurbs and severity labels (`thick walls / real walls / thin walls / wide open`) reflect this.
- Compare verdict reframed: chip is now `ATTACK X FIRST` (was `BUILD X FIRST`), tie copy refers to "walls" not "weekend bets," `compare_verdict.ts` punchLine and bandLine all updated.
- "Build guide" → "wedge guide" across user-facing copy: PurchaseCTA, modal, email subject + HTML, Stripe product description, BuildGuide header, guide-page title, error states, terms/privacy descriptions.
- FORTRESS-tier dead-end killed. The "→ sorry, we tried" disabled CTA is gone. Every tier now offers a wedge guide via the same purchase flow. The `NEXT_PUBLIC_ENABLE_DONT_TIER_GUIDES` feature flag was removed entirely (file `lib/feature_flags.ts` deleted), and `app/api/purchase/route.ts` no longer rejects FORTRESS-tier purchases.
- Methodology page rewritten end-to-end: 7 axes (distribution included), wedge-frame intro, distribution-axis explainer with the v10 sub-signals listed, brand-not-modeled section reframed (KG + authoritative third-party coverage IS partial brand capture).
- Snark stripped from analytical surfaces: scanner LLM voice rules now read "Direct and concrete. Light personality fine, but analytical fields should read as honest assessment, not stand-up routine." Marketing copy (hero, FAQs, marquee, testimonials, pricing footer) keeps its voice.
- TERMS_VERSION bumped to 2026-04-30 (terms text materially changed: "buildability report" → "wedge report").

**Phase 2 deploy steps (in order):**
1. Apply the Phase 2 SQL migration block in `lib/db/schema.sql` (the `2026-04-30 (wedge-frame Phase 2): tier rename` block) via Supabase SQL editor. Idempotent: drops the old check constraint, rewrites tier rows, re-adds the new check constraint.
2. Deploy. The Zod enum change is the load-bearing client-side change; old in-flight scans won't collide because the LLM prompt is also updated to emit the new tier names.
3. Force-revalidate ISR on `/r/<slug>` and `/compare/<pair>` via Vercel deploy or by hitting representative URLs after deploy — `revalidate = 3600` means social previews and report titles will lag up to an hour otherwise.

**What shipped in Phase 2.5 (atomic; corpus re-scan required):**
- Score system overhauled. The LLM no longer emits `score`, `tier`, `difficulty`, or `confidence`. The DB drops the `score` and `confidence` columns and adds `wedge_score`, `wedge_thesis`, `weakest_moat_axis`. `tier` is repurposed (server-derived from wedge_score buckets, not LLM-emitted).
- LLM contract simplified to wedge thesis + supporting analytical content. New required field: `wedge_thesis` (one sentence, 20–220 chars, names the weakest defensible surface as "the door"). System prompt + 3 worked examples rewritten end-to-end.
- Moat scoring rebuilt. RUBRIC_VERSION = 11. `scoreCapital` now derives from capex flags + descriptive est_total + numeric est_total magnitude (was: tier proxy). `scoreTechnical` now derives from per-challenge difficulty distribution (was: inverse of LLM score). The pipeline is one-way now: moat axes feed wedge_score, no more circular tier→moat→tier loops.
- Pipeline reordered. Project + score moat IN MEMORY before the DB insert, since `wedge_score` / `tier` / `weakest_moat_axis` are required NOT NULL columns derived from the moat. Soft-fail policy: on any project / distribution / moat failure, insert with SOFT/100/null fallback rather than killing the user-visible report.
- VerdictReport.tsx restructured to a 12-section wedge narrative (header → title → wedge score hero → wedge thesis lede → wedge map → blunt take → cost of competing → what you're up against → their position → who else has tried this → CTA → footer). The "wedge map" (promoted MoatBreakdown) leads under the hero so the moat analysis IS the report's center of gravity.
- MoatBreakdown.tsx promoted + rewritten. Two ledes anchor the grid: **the door** (weakest axis) and **watch out** (strongest axis ≥ 4). Aggregate number is gone from the head — it's the inverse of the displayed wedge score, so showing both was redundant. The weakest axis cell carries an inline `door` chip.
- Compare layer flipped to wedge_score semantics. `score_delta = b.wedge_score - a.wedge_score`. Higher delta = B is more wedgeable (was: easier to clone). All compare cards / OG / verdict / SEO updated.
- Social templates updated: `report.weekend_pitch` → `report.soft_pitch`, `report.dont_riff` → `report.fortress_riff`. Examples + descriptions reframed for wedge_score language.
- Build guide LLM input now carries `wedge_score`, `weakest_moat_axis`, `wedge_thesis` (drops `score`). Phase 3 prompt rewrite still pending — when it lands, it'll key off `weakest_moat_axis` to write the wedge attack plan.
- moat_audit_llm.ts prompt updated: capital + technical now derive from raw signals (not buildability tier+score), distribution is also engine-derived (not curator-actionable). Prompt still focuses curators on network / switching / data / regulatory.

**Phase 2.5 deploy steps (in order — atomic, requires corpus re-scan):**
1. Apply the Phase 2.5 SQL migration block in `lib/db/schema.sql` (the `2026-05-01 (wedge-frame Phase 2.5)` block). Adds new columns, drops `score` + `confidence`, recreates the tier+wedge_score index, and creates the `truncate_reports_cascade()` SECURITY DEFINER RPC that the rescan script uses.
2. Deploy code. Old reports in the table will fail Zod parse (missing `wedge_score` / `wedge_thesis`), so STEP 3 must run before users hit `/r/<slug>` or `/directory`.
3. Run `pnpm tsx scripts/rescan_all.ts`. Snapshots the existing domain list, truncates reports cascade (also wipes projections / moat scores / similarity gaps / build guides / purchases — confirmed in dev), then re-scans every domain sequentially against the new pipeline. Sequential to avoid racing the domain-lock infra and inflating Anthropic + Serper bills.
4. Force-revalidate ISR on `/r/<slug>`, `/compare/<pair>`, `/directory` via Vercel deploy or representative URL hits.

**Pivot phasing — remaining phases:**
3. **Phase 3 — Build guide reframe.** Full LLM prompt rewrite to write a wedge attack plan keyed on `weakest_moat_axis`, not a clone guide. Phase 2.5 already feeds the new fields into the prompt input; the system prompt itself still treats the guide as a clone guide. Existing guide rows should be invalidated so they regenerate as wedge plans on next purchase.
4. **Phase 4 — Discovery + content alignment.** Wedge-inversion module on report page, leaderboards (thinnest moats / most attackable / weakest distribution), X content templates rewrite, blog content audit.
5. **Phase 5 — Brand decision (deferred).** Revisit ~2 weeks after Phase 4. Either keep saaspocalypse with new positioning or rename.

**During-pivot freeze list:**
- ❌ No new flagship features (Phase 4's wedge module IS the new feature)
- ❌ No taxonomy expansions beyond what Phase 1 distribution-signals require
- ❌ No new blog posts until Phase 4
- ❌ No new admin curation surfaces (4 is already too many)
- ❌ No renames of normalized data (capability slugs, segment slugs, etc.) unless the pivot literally requires it
- ❌ No mid-phase course corrections — finish the phase, then evaluate

**Pre-pivot tag:** `pre-pivot-v1` (rollback target if needed).

## Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (CSS-based config, no `tailwind.config.ts`)
- **Fonts:** `next/font/google` — Space Grotesk (display) + JetBrains Mono (body)
- **Package manager:** pnpm
- **Deployment target:** Vercel

**Shipped:** Phases 1 + 2 + 3 + SEO + blog + daily X content engine + similarity rail + head-to-head compare pages. Real Claude-powered scanner, report storage, ISR'd per-report SEO pages, SSE-streamed scan UX, IP rate limiting, per-domain locking, Stripe-gated build guide generation (lazy, shared per report_id), magic-link email delivery via Resend. Public legal pages (`/terms`, `/privacy`) with version-tracked consent captured at purchase and a soft-consent line under the scanner. Full SEO surface: `app/sitemap.ts`, `app/robots.ts`, JSON-LD on landing (`WebSite` + `Organization`) and per-report (`Review` of a `SoftwareApplication`), default site OG as a static PNG at `public/images/saaspocalypse-og.png` (wired via `metadata.openGraph.images` in `app/layout.tsx`) plus dynamic per-report OG at `app/r/[slug]/opengraph-image.tsx` (tier-colored score), favicons (`app/icon[1-5].png` + `app/apple-icon.png` auto-detected by Next), intent-led per-report titles ("Can you compete with {name}?" — see `lib/seo/meta.ts`). Public `/directory` page (Layout A "filing cabinet") with URL-driven filters (tier, score range, query, sort, page). Per-report `view_count` tracking with `most popular` sort. Public `/blog` (Layout A "editorial broadsheet") + per-post `/blog/[slug]` with category filter via `?cat=`, `BlogPosting` JSON-LD, dynamic per-post OG, and a Resend-audience-backed newsletter capture in the footer. **Daily X content engine** posts twice/day via Vercel Cron (a report-driven hook in the morning, an original PG-voiced bite in the afternoon) — see "Daily X content engine" below. **Similarity rail** (`compare` / `similar scans.`) is now part of the report body via `VerdictReport.comparisons`: deterministic IDF²-weighted Jaccard over capability sets, descriptor 2× boost, comparison-framed cards (score delta + capability wedge); server-rendered on `/r/[slug]`, client-fetched on landing-page scan results, curated via `/admin/similarity-gaps`. See "Similarity engine" below. **Head-to-head compare pages** at `/compare/<a>-vs-<b>` (alphabetical canonical, reverse-order 301s): side-by-side verdict twin, paired-bar moat grid, capability/stack diffs (descriptor-first chips), cost+time strip, full SEO + JSON-LD + split-card OG. Sitemap'd against the top-K neighbor surface (~O(N×K) URLs, not N²); SimilarCard cards link to compare. See "Compare pages" below.

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

- `app/` — App Router entry. `layout.tsx` (global `<Nav />`; default site OG is wired here via `metadata.openGraph.images` pointing at `/images/saaspocalypse-og.png`), `page.tsx` (landing), `r/[slug]/page.tsx` (per-report SEO page, ISR'd), `r/[slug]/guide/page.tsx` (token-gated build guide), `compare/[pair]/page.tsx` (head-to-head, ISR'd; canonical 301 + 404 enforcement on the slug pair), `compare/[pair]/opengraph-image.tsx` (split-card compare OG), `directory/page.tsx` (public report index), `blog/page.tsx` (blog index, URL-filterable by `?cat=`), `blog/[slug]/page.tsx` (per-post page, statically generated from `getPublishedPosts()`), `terms/page.tsx`, `privacy/page.tsx`, `sitemap.ts`, `robots.ts`, `r/[slug]/opengraph-image.tsx` (per-report dynamic OG), `blog/opengraph-image.tsx` (blog index OG — also static, candidate for the same flatten), `blog/[slug]/opengraph-image.tsx` (per-post OG), `icon[1-5].png` + `apple-icon.png` (favicons, Next file convention), `api/scan/route.ts`, `api/guide/[slug]/route.ts`, `api/purchase/{route,webhook,resend}/route.ts`, `api/reports/[slug]/view/route.ts` (view-count increment), `api/newsletter/route.ts` (Resend audience signup), `api/cron/social/[content_type]/route.ts` (daily X content cron — Bearer-auth gated), `globals.css`.
- `components/` — section + interactive components. `VerdictReport.tsx` is the full report card and accepts an optional `comparisons` ReactNode slot (rendered inside the report before the CTA); `SimilarProducts.tsx` is the server wrapper that reads from `lib/db/neighbors.ts`; `SimilarProductsClient.tsx` fetches `/api/reports/[slug]/similar` so fresh landing-page scans get the same comparison rail without a reload; `BuildGuide.tsx` is the full guide with copy-to-clipboard prompt blocks; `PurchaseCTA.tsx` is the client CTA + email-capture modal (with required Terms/Privacy checkbox); `LegalPage.tsx` is the shared shell that renders Terms and Privacy; `TrackView.tsx` is the 5-line client component that fires the per-page-view POST.
- `components/SimilarProducts/` — similarity-rail subcomponents. `SimilarProductsRail.tsx` is the shared presentational rail (`compare` / `similar scans.`); `SimilarCard.tsx` is the compact card surfacing score delta + capability wedge — what the candidate has that the source doesn't, descriptor caps prioritized. The whole card is the link target; href is the canonical alphabetical compare URL `/compare/<a>-vs-<b>`, computed inline from `sourceSlug` + `report.slug`. A bottom strip with `vs.` / `compare →` (mono caps, fade→coral on hover) makes the destination unambiguous.
- `components/compare/` — head-to-head subcomponents, all server-rendered. `primitives.tsx` (private shared `CompareCard` / `CardHead` / `TriptychCol` / `CountBadge` / `Tag` — used by every section card), `TitleBlock.tsx` (eyebrow + H1 `<a> vs <b>` with `which is easier to compete with?` as the search-intent subhead + a single inline verdict line `→ attack X first.` followed by reasons in muted prose; deliberately no competing badges), `VerdictTwin.tsx` (head-to-head card: 1fr/86px/1fr grid with diagonal-hatch vs gutter — top arrow `→` and bottom arrow `←` mirror each other across the centered vertical `vs`; 96px score per side, tier stamp, score bar with ticks), `MoatTwin.tsx` (aggregate strip with ink center delta + 6 axis rows; bar fills are uniform per-side severity — no "leader gets coral" special case; head shows only the delta chip + methodology link, no redundant `aggregate` word), `CapabilityDiff.tsx` + `StackDiff.tsx` (triptych cards: only-A / shared / only-B columns with colored count badges and one solid lead tag per column; `StackDiff` always renders the full set including commoditized infra — no show/hide toggle, since the shared infra shelf is useful context), `CostStrip.tsx` (monthly floor + time-to-clone as paired "quad" cards with winner pill, dashed-rule footer, narration line), `VerdictBand.tsx` (full-width ink slab carrying just the verdict line with lime-emphasized punch — no CTA button; the outro below already handles next-step links), `CompareFooter.tsx` (paired-card outro mirroring the head-to-head twin: each half is a clickable `/r/<slug>` link with tier+score badge, then a thin rail back to the directory).
- `components/directory/` — directory page subcomponents: `DirectoryCard.tsx` (handoff Layout A card), `TierBadge.tsx`, `ScoreBar.tsx` (10-segment), `FilterGroup.tsx`, `FilterRow.tsx`, `PageBtn.tsx`, `DirectorySearch.tsx` (client search bar + sort), `ScoreRangeFilter.tsx` (client min/max + visual track), `tiers.ts` (the 3 directory tiers).
- `components/blog/` — blog page subcomponents: `BlogShell.tsx` (max-width wrapper, 1200/780 toggle), `BlogIndex.tsx`, `BlogMasthead.tsx`, `FeaturedPost.tsx` (sticky-yellow tile), `CategoryChips.tsx` (server-rendered, `?cat=` driven), `PostCard.tsx`, `NewsletterBlock.tsx` + `NewsletterForm.tsx` (form is the only `"use client"` piece), `Breadcrumb.tsx`, `ArticleHeader.tsx`, `ArticleBody.tsx` (renders `BlogBlock[]` — `p`, `h2`, `callout`), `ArticleEndMatter.tsx` (filed-under + prev/next).
- `lib/blog/` — blog content + helpers. `schema.ts` (`Post` + `BlogBlock` + `BlogCategory` types), `content.ts` (masthead + newsletter copy), `formatters.ts` (`formatPostDate`), `posts/index.ts` (sorts by date desc, exports `getAllPosts` / `getPostBySlug` / `getFeaturedPost` / `getPostsByCategory` / `getPublishedPosts` / `getAdjacentPosts`; throws at module-eval time if not exactly one `featured: true` post), `posts/{slug}.ts` × N (one TS file per post, body optional). The handoff design uses a Fraunces serif for headlines — we deliberately don't load it; all blog headlines render in `font-display` (Space Grotesk) to stay consistent with the rest of the site.
- `lib/seo/meta.ts` — title/description builders. `reportTitle` produces the intent-led `"Can you compete with {name}? {tier} - wedge score {n} | saaspocalypse"` form; `reportOgTitle` is a longer Twitter/Slack-friendly moat-scan form; `reportDescription` blends `wedge_score` + time + stack + first sentence of `take`, with graceful fallback when ≤155 chars overflows. `comparePageTitle` / `comparePageOgTitle` / `comparePageDescription` / `compareCanonical` produce the head-to-head metadata (`{a} vs {b}: which SaaS is easier to compete with?` form). **All metadata, OG, and JSON-LD `headline` fields call these so they don't drift.**
- `lib/seo/jsonld.ts` — `landingJsonLd` (`WebSite` + `Organization` graph), `reportJsonLd` (`Review` of `SoftwareApplication`), and `comparePageJsonLd` (a `WebPage` whose `mainEntity` is an `ItemList` of two `Review` items, one per side). `serializeJsonLd` escapes `<` so the payload can't break out of its `<script>` tag.
- `lib/content.ts` — static copy (headlines, testimonials, FAQs, footer, marquee, pricing). **Change copy here, not in components.**
- `lib/scanner/schema.ts` — Zod `VerdictReportSchema` (canonical verdict shape: DB row + LLM tool + UI). Exports `VerdictReport`, `Tier`, `Difficulty`, color maps.
- `lib/scanner/events.ts` — `ScanEvent` union, SSE encoder, step labels.
- `lib/scanner/fetch.ts` — `fetchAndCleanHomepage(url)` returns a `FetchResult` with cleaned/truncated text PLUS raw signals (response headers, set-cookies, ~50KB un-stripped HTML head, final URL). The cleaned text feeds Claude; the raw signals feed the fingerprinter.
- `lib/scanner/fingerprint.ts` — `detectStack(fetchResult, domain)` — server-authored stack detection from headers/cookies/HTML/CNAME. Declarative `DETECTORS` table (categorized by hosting/framework/cms/cdn/analytics/payments/auth/support/email). Pure function with one optional CNAME DNS lookup capped at 1.5s. Never throws — soft-fails on DNS errors. Returns `DetectedStack | null` which the pipeline persists alongside the LLM verdict on `reports.detected_stack`. `formatDetectedStackForLLM(stack)` returns the bullet block injected into the user message (NOT the cached system prompt). Add new fingerprints by appending to the `DETECTORS` array.
- `lib/scanner/distribution.ts` — Phase 1 wedge-frame distribution-signal collector. `collectExternalDistributionSignals(domain)` runs three network probes in parallel (Serper SERP for brand-name dominance, blog-path RSS/HTML probing for content cadence, RDAP for domain age). `combineDistributionSignals(externals, fetched, attributes)` joins the externals with locally-derived signals (community-channel regex over the un-stripped HTML head, pricing_gate from `monthly_floor_usd`). The collector NEVER throws — every sub-signal soft-fails to null. Output feeds `lib/normalization/moat.ts::scoreDistribution`. Externals kick off after fetch in `pipeline.ts::runScan` and run in parallel with the LLM call so latency is fully overlapped.
- `lib/scanner/llm.ts` — `callClaudeForVerdict` with cached system prompt + forced tool use + single Zod-driven retry. Runs at `temperature: 0.3` and ships a `## Standard cost reference` anchor table inside the system prompt — both are load-bearing for output consistency (don't silently undo). Detected signals (when present) are injected into the **user message** so they don't disrupt the cached system prompt; the system prompt has one static sentence telling the model to trust them as ground truth. After a successful Zod parse, `withComputedEstTotal` deterministically rewrites `est_total` from the numeric `est_cost` lines (sum, or `"$X + usage"` / `"usage-based"` strings when any line is `"???"`) — so the value persisted to the DB is server-authored, not LLM-authored.
- `lib/scanner/pipeline.ts` — `runScan` orchestrator. Order: normalize → cache check → fetch → fingerprint → analyze (LLM) → verdict insert. Fingerprint failures soft-fail (logged, scan proceeds with `detected_stack: null`).
- `lib/build_guide/schema.ts` — Zod `BuildGuideSchema` (overview, prerequisites, sequential steps, per-step LLM prompts, stack specifics, pitfalls).
- `lib/build_guide/llm.ts` — `generateBuildGuide(report)`. Second Claude call, input is the full `VerdictReport` JSON, output is the guide. **Uses Sonnet 4.6**. We tried Haiku 4.5 for the speed/cost win, but it returned incomplete tool_use payloads on our nested schema (missing top-level fields like `steps`, `stack_specifics`, `pitfalls`). Sonnet is reliable end-to-end. With the tight schema caps (body ≤450, overview ≤800, 6-7 steps, 1-2 prompts per step), Sonnet finishes in ~35-50s at ~4K output tokens. Retry handles truncation (rare) and Zod validation failures. **Tier-conditional branch:** when `report.tier === "FORTRESS"` the user message gets an extra FORTRESS framing block instructing Claude to design a wedge play / niche flank rather than pretending a head-on clone is feasible. System prompt (cached) is unchanged so the prompt cache stays warm for non-FORTRESS scans.
- `lib/build_guide/pipeline.ts` — `runGuideGeneration(report, emit)` — cache check → lock → LLM → persist, with SSE step events.
- `lib/social/templates.ts` — declarative template definitions for the daily X content engine. 5 report templates + 4 original templates. Each declares `tweet_count` (1 or 2), description, and 2-3 calibration examples. Threading is a structural property of the template — `report.cost_punchline` and `report.dont_riff` are 2-tweet threads; everything else is single-tweet. Add new templates here, not in the LLM prompt.
- `lib/social/schema.ts` — Zod `SocialPostOutputSchema` (`body` + optional `thread_bodies` + `includes_link`) + `TWEET_MAX = 270`. Per-template structural rules (single vs thread, link presence, link tweet) are enforced in the pipeline, not in the schema.
- `lib/social/llm.ts` — `generateSocialPost(input, signal)`. Sonnet 4.6, `temperature: 0.7` (higher than scanner's 0.3 for voice variability), forced tool use (`submit_post`), ephemerally-cached system prompt that quotes the voice rules from this file. Single Zod-driven retry with `is_error: true` tool_result feedback (mirrors `lib/scanner/llm.ts`).
- `lib/social/x_client.ts` — `postContent(parts: string[])` thin `twitter-api-v2` wrapper. Posts head + sequential replies; if the head goes out but a reply fails, returns `kind: 'error'` with `partial` populated so the orchestrator can mark the row `posted` (head is the canonical share surface) and log the reply failure separately.
- `lib/social/pipeline.ts` — `runDailySocial({ content_type, mode })` orchestrator. Sweeps stuck pending → claims slot via `insertPendingPost` (the partial unique index is the lock) → generates → validates → posts. `dry_run` mode persists with `status='dry_run'` (does not claim the daily slot).
- `lib/domain.ts` — `normalizeUrl` (eTLD+1 via `tldts`), `toSlug`, `fromSlug`.
- `lib/db/schema.sql` — source-of-truth Postgres schema (reports + build_guides + build_guide_purchases + error_log + social_posts + the `increment_report_view_count(p_slug)` RPC used for atomic popularity bumps). The bottom of the file holds idempotent `alter table … add column if not exists` / `create table if not exists` migration blocks for existing deployments.
- `lib/db/social_posts.ts` — social-posts DAL (admin-only). `getTodaySlot`, `getRecentlyPostedSlugs`, `getRecentOriginalBodies`, `insertPendingPost` (throws `SocialSlotTakenError` on slot collision), `insertDryRunPost`, `markPosted`, `markFailed`, `sweepStuckPending`.
- `lib/db/neighbors.ts` — `getSimilarReports(sourceId, limit=6)`. Lazy orchestrator for the similarity rail: bulk-loads projection candidates, scores all against the source via `scoreAllCandidates`, fetches the top-K full reports, computes per-card `score_delta` and `wedge_capability_slugs` (caps the candidate has that the source doesn't, descriptor-first then alphabetical). Phase A is render-time compute; swap to a materialized `report_neighbors` table only when N > ~500 or render p95 > 200ms. Also exports `getAllNeighborPairs(limit=6)` — batch helper that loads candidates ONCE, scores every report against every other in memory, and returns canonical-ordered (`slugA < slugB`) deduped pairs with `lastModified`. Powers the compare-page sitemap so we crawl O(N×K) URLs instead of N², without a second DB pass.
- `lib/db/compare.ts` — head-to-head DAL. `getComparePair(slugA, slugB)` returns `{ a, b }` (each with `report`, `projection`, `components`, `monthly_floor_usd`, `is_usage_based`) via parallel SELECTs over capabilities/attributes/components filtered by `.in("report_id", [a, b])`. Returns null on same-slug or unresolved-slug; tolerates missing projections (compare page degrades sections gracefully). No new DB writes — pure reads.
- `lib/normalization/compare.ts` — pure `diffPair(pair)`. Returns `score_delta` (signed `b - a`), `cost_delta` (null when either side has no monthly floor), `capability_diff` (3 buckets, descriptor-first then alphabetical), `stack_diff` + `stack_diff_all` (commoditization ≤ 3 by default, full set for the show-all toggle), `moat_diff` (per-axis array including `aggregate`), `tier_match` flag. Stable orderings so ISR cache hits render identically.
- `lib/db/similarity_gaps.ts` — admin-only DAL for the `similarity_gaps` queue. Pairs are stored canonical-ordered (`report_a_id < report_b_id`) so the unique constraint dedupes on idempotent re-runs of the detector.
- `lib/normalization/similarity.ts` — pure scoring engine. `similarityScore(source, candidate, weights)` (weighted Jaccard with IDF² per slug + segment factor 1.0 / 0.85 / 0.70), `buildCorpusWeights` (corpus-aware IDF²; 2× boost for descriptor capabilities), `scoreAllCandidates` (no threshold, returns full ranked list — used by diagnostics), `rankSimilar` (filters to `MIN_SIMILARITY_SCORE = 0.10` + slices to limit). Falls back to flat 1× / 1.5× moat-tag weighting when corpus < 10. Descriptor set is derived from `ctx.capabilities.is_descriptor`, cached per `EngineContext` identity via `WeakMap`.
- `lib/normalization/similarity_gaps.ts` — pure detector. Tokenizes **name + tagline only** (lowercase, stopword-stripped, ≥3 chars) — the `take`/`take_sub` are intentionally excluded because their judgment-laced prose ("you'd spend a month rolling auth", "the actual moat is crawl infrastructure") is high-entropy per product and drowns the shared category vocabulary. Computes pairwise text-Jaccard, pairs it with the deterministic engine score, flags pairs where `text ≥ MIN_TEXT_SIMILARITY (0.20)` AND (`engine ≤ MAX_ENGINE_SCORE (0.10)` OR `text - engine ≥ MIN_TEXT_ENGINE_GAP (0.10)`). The OR rule catches the `ahrefs/semrush` failure mode: pairs sharing only generic-infra capabilities (`fine-tuning`, `proprietary-dataset`) where engine sits at 0.15–0.30 when twin-pair score should be 0.5+. Optional `{ debug: true }` dumps top-20 pairs by text-Jaccard with their engine score, gap, and which rule (if any) flagged them — invaluable for tuning. No DB, no LLM — caller persists.
- `lib/normalization/descriptor_suggestion_llm.ts` — Sonnet 4.6, ephemerally-cached system prompt. Per-pair input: both reports' name/tagline/take/take_sub + currently-firing capabilities + the full capability catalog (descriptors listed first as preferred `add_pattern` targets). Output is a Zod-validated discriminated union: `add_pattern { capability_slug, pattern, reasoning }` | `new_capability { slug, display_name, category, match_patterns, reasoning }` | `no_action { reasoning }`. Same posture as `moat_audit_llm.ts` — strong bias toward `add_pattern` because every new capability inflates corpus-wide similarity scores on re-projection. New capabilities created via this surface default to `is_descriptor: true`.
- `lib/normalization/taxonomy/capabilities.ts` — `CAPABILITIES` with `is_descriptor: true` marked inline on the 14 product-category slugs (form-builder, appointment-booking, ai-agent-platform, web-analytics, link-in-bio, url-shortener, page-builder, image-editor, vector-design, screen-recording, ai-evals-guardrails, serverless-platform, issue-tracking, outbound-sequencer). Most capabilities omit the field (default false). Descriptors get a 2× boost in the similarity engine.
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

**VerdictReport renders in BOTH contexts** — server-side on `/r/[slug]`, *and* client-side when Scanner (a client component) renders it inline after a fresh scan. That's why any logic added to it must be client-bundle safe: no server-only imports (DB clients, secrets, `node:`-prefixed modules). Server-only report enrichments belong in slots/wrappers (`comparisons={<SimilarProducts ... />}` on `/r/[slug]`, `comparisons={<SimilarProductsClient ... />}` in Scanner), not inside `VerdictReport` itself.

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

# Serper.dev — Google SERP API for the distribution-axis moat signal.
# ~$0.001/req; free tier is 2,500 credits, plenty for backfill + months
# of organic scans. Optional: when missing, SERP signal returns null and
# the distribution axis returns null and the aggregate skips that axis.
SERPER_API_KEY=

# Vercel Cron auth shared secret. All /api/cron/* routes require
# Authorization: Bearer ${CRON_SECRET}. Vercel injects this automatically
# into scheduled cron requests; you'll need to send it manually for local
# dry-runs (curl -H "Authorization: Bearer $CRON_SECRET" ...).
CRON_SECRET=

# Admin curation surfaces (/admin/unknowns, future admin tools). Single
# shared secret, cookie-gated. Pick something long and random; rotate by
# changing the value (active sessions get invalidated on next request).
ADMIN_SECRET=

```

Degraded-mode behavior (so the codebase stays workable pre-provisioning):
- **No Supabase:** `pnpm build` still succeeds. Anon reads return null/[]; `<VerdictGrid>` shows the empty state.
- **No Upstash:** rate limits + locks pass through. OK for dev, **unsafe for prod** (LLM cost exposure).
- **No Anthropic:** scan + guide endpoints return friendly errors.
- **No Stripe + `GUIDE_PRICE_CENTS=0`:** dev bypass kicks in. `/api/purchase` skips checkout, creates a paid purchase, and emails the magic link directly. Only active when `NODE_ENV !== 'production'`.
- **No Resend:** emails log to the console instead of sending. Magic links are still generated and persisted, so you can grab them from logs.
- **No `RESEND_AUDIENCE_ID`:** newsletter signups log to stderr and the form still shows the success state. No contact is added to any audience until the env var is set.
- **No X creds (any of the four `X_*` vars missing):** the daily X cron returns `{ kind: 'failed', reason: 'x_auth' }` and logs once. `?dry=1` runs still work because they never call the X API. Useful to exercise the LLM + voice locally without a developer account.
- **No `SERPER_API_KEY`:** the distribution-axis SERP sub-signal returns null on every scan; the other four sub-signals (content cadence, pricing gate, community footprint, domain age) still populate, and the axis still computes as long as ≥3 of 5 came back. `pnpm tsx scripts/backfill_distribution.ts` warns at startup but proceeds.
- **No `CRON_SECRET`:** the cron route 401s every call (including legitimate Vercel-Cron firings). Set this in production before enabling the cron, or social posting will silently no-op.
- **No `ADMIN_SECRET`:** `/admin/login` shows a "secret not configured" notice and accepts no submissions; `/admin/*` always redirects to login. Setting the var brings the curation tools online without any other deploy step.
- **No FORTRESS purchase flag:** the old `NEXT_PUBLIC_ENABLE_DONT_TIER_GUIDES` flag is gone. Every tier can buy a wedge guide; FORTRESS reports get a warning in `PurchaseCTA` and tier-specific LLM framing in `build_guide/llm.ts`.

## Setting up Supabase (first-time)

1. Create a Supabase project. Copy URL, anon key, and service-role key into `.env.local`.
2. Open the Supabase SQL editor and paste the contents of `lib/db/schema.sql`. Run it (covers `reports`, `build_guides`, `build_guide_purchases`, `error_log`, `social_posts`, taxonomy + projection tables, `report_moat_scores`, `similarity_gaps`, the `increment_report_view_count` RPC, plus migration blocks at the bottom). The `alter table … add column if not exists` / `create table if not exists` blocks at the bottom are safe to re-run after pulling new schema changes — for example, `view_count`, the `social_posts` table, `report_moat_scores.review_status`, the `is_descriptor` column on capabilities, or the `similarity_gaps` table on existing deployments.
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

**Don't log for intentional user-facing rejections** (e.g. invalid URLs, rate limits, blocked fetches). Those aren't system errors.

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

- **Sitemap / robots:** `app/sitemap.ts` enumerates landing, `/directory`, `/terms`, `/privacy`, plus one entry per report (driven off `getAllReports`) and one entry per top-K compare pair (driven off `getAllNeighborPairs`, canonical alphabetical). `app/robots.ts` allows everything except `/api/` and `/r/*/guide` (the token-gated pages must not be indexed). Both routes ISR at the same 1-hour cadence as the rest of the site.
- **Structured data (JSON-LD):** rendered as `<script type="application/ld+json">` in server components — no client JS. Landing emits `WebSite` + `Organization`; per-report emits a `Review` of a `SoftwareApplication` with `reviewRating.ratingValue = report.score` (best 100); compare pages emit a `WebPage` whose `mainEntity` is an `ItemList` of both reports' `Review`s. All via `lib/seo/jsonld.ts`. Validate at <https://validator.schema.org> + Google Rich Results Test.
- **Per-report titles are intent-led**, not brand-led. Format: `Can you compete with {name}? {tier} - wedge score {n} | saaspocalypse`. Generated by `lib/seo/meta.ts::reportTitle`. The on-page H1 in `VerdictReport.tsx` is just `{name}` — the title tag carries the long-tail query phrase.
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

## Normalization layer

A proprietary, deterministic projection of every verdict onto a curated taxonomy. **No LLM calls** — the engine is a pure function and runs synchronously inside `runScan` after the verdict insert. Powers downstream features that compare reports (capability overlap, "products like X", moat depth) without making us an AI wrapper. Layer 1 is the canonical taxonomy; layer 2 is the per-report projection; layer 3 is a review queue for unmatched terms.

- **Taxonomy (layer 1, source of truth):** TS modules under `lib/normalization/taxonomy/` — `stack_components.ts`, `capabilities.ts`, `market_segments.ts`, `business_models.ts`. Each capability declares optional `moat_tags` that pre-wire the moat-scoring axes (network/switching/data/regulatory). `pnpm tsx scripts/sync_taxonomy.ts` mirrors TS → DB; `pnpm tsx scripts/dump_taxonomy.ts` regenerates `stack_components.ts` from the DB after admin-tool edits. The TS file is the canonical record in git; the DB is the live working copy between dump runs. Component categories: `hosting | framework | ui | cms | db | payments | auth | cdn | analytics | email | support | crm | ml | search | queue | monitoring | devtools | integrations | infra` — adding a new category requires touching 4 places (the `ComponentCategory` type, `app/admin/unknowns/Triage.tsx::CATEGORIES`, `app/api/admin/unknowns/[id]/route.ts::CATEGORY`, `lib/normalization/suggestion_llm.ts::COMPONENT_CATEGORIES` + its system-prompt category descriptions, and `scripts/dump_taxonomy.ts::CATEGORY_ORDER`). Re-categorizing existing canonicals is a sync-driven path: edit the slug's category in the TS file and run `sync_taxonomy.ts` — the upsert overwrites the DB row's category atomically.
- **Engine (layer 2, deterministic):** `lib/normalization/engine.ts::projectReport(verdict, detectedStack, context?)` — pure function; `context` is the live DB-built `EngineContext` in scans/recompute, defaulting to the TS snapshot for legacy callers. Stack components: fingerprint always wins, text matches add coverage, `source` flag tracks provenance (`fingerprint | text_match | both`). Capabilities: whole-word phrase matching across verdict text fields, `evidence_field` records the field the match came from. Attributes: cost parsing yields `monthly_floor_usd` + `is_usage_based` + `capital_intensity_bucket`; segment + business model from pattern scoring (marketplace capability biases the model). Bump `PROJECTION_VERSION` when output schema changes — the recompute script keys off it.
- **Persistence:** `lib/db/projections.ts::persistProjection(reportId, projection)` writes to `report_components`, `report_capabilities`, `report_attributes`, and bumps occurrences in `normalization_unknowns`. Idempotent — replaces existing rows. Called from `runScan` (soft-fail; logged via `logError({ scope: 'scan', reason: 'projection_failed' })`, never blocks the user-facing report) and from `scripts/recompute_projections.ts` for backfill / post-taxonomy-edit rebuilds.
- **Review queue (layer 3):** `normalization_unknowns` rows are surfaced at `/admin/unknowns` (cookie-gated by `ADMIN_SECRET`). Three resolutions: alias to existing canonical, promote to a new canonical, or ignore. After a triage session, run `pnpm tsx scripts/dump_taxonomy.ts` to pull the changes back into the TS source for git review. `ignored` and `aliased`/`added` rows do NOT re-bump on subsequent scans (the projection writer only increments `occurrences` when `status='open'`), so jokes like "your remaining tears" stay quiet once you've ignored them.
- **Harvester:** the engine sources unknowns from the LLM `verdict.stack` array. It suppresses items whose canonical is already attached via fingerprint or text-match elsewhere — e.g. "Vercel Pro (edge + analytics)" is suppressed because canonical Vercel matched. Without this, every parenthetical descriptor on a known component would become noise in the queue.
- **Moat scoring (Phase B):** `lib/normalization/moat.ts::scoreMoat({ verdict, capabilities, distribution, catalog?, config? })` — pure deterministic function over the projection. Seven axes 0–10 (current `RUBRIC_VERSION` is 13): `capital` (capex regex hits across est_cost/take/take_sub/wedge_thesis/challenge notes + descriptive/numeric est_total + fortress-thesis path), `technical` (per-challenge difficulty distribution only), `network` / `switching` / `data_moat` / `regulatory` (presence-counted from capability `moat_tags` via the active catalog + `capability.hit_multiplier`), and `distribution` (weighted aggregate of 6 SCORED sub-signals all derived from a single Serper SERP call): **has_sitelinks × 4** (organic[0].sitelinks non-empty — strongest reliable signal, fires for every established brand even when KG doesn't), **compressed_organic × 3** (`organic.length < 10` — Google compresses for entity-confident queries; established brands consistently get 7 results, weak/noise queries get all 10), **authoritative_third_party_count curved × 3** (distinct domains from a curated list of authority directories + tech press + brand-ecosystem domains — apps.apple.com / play.google.com / youtube.com / x.com / reddit.com / github.com / wikipedia.org / linkedin.com / crunchbase.com / techcrunch.com / etc. — **GATED on top_organic_owned** to suppress false positives where a weak brand's name matches a popular industry term), **knowledge_graph_present × 2**, **top_organic_owned × 2**, **serp_own_domain_count curved × 1**. Pattern catalogs and weights come from DB-backed `ScoringConfig` in production; disabled patterns are ignored. Deprecated columns are kept on `report_attributes` for diagnostics but no longer scored. **`pricing_gate` is collected but NOT scored**. Distribution returns NULL only when SERP failed entirely (missing `SERPER_API_KEY`, network error). The moat aggregate skips null axes. `aggregate` is a weighted RMS — `Math.sqrt(weightedSquares / totalWeight)` — so specialist moats (Stripe = capital + technical + regulatory only) don't get averaged down by zero-axes; cross-axis weights are DB-tunable (`aggregate.*`). Bumping `RUBRIC_VERSION` keys the recompute script to rebuild every row. Persisted to `report_moat_scores` and joined into `StoredReport` as `moat: StoredMoatScore | null` via a Supabase 1:1 relational query (`*, moat:report_moat_scores(...)`); `normalizeMoatShape` defends against PostgREST occasionally returning the embed as a single-element array. Surfaced in `VerdictReport.tsx` via `MoatBreakdown`: the report-body "wedge map" with door/watch-out ledes, seven-axis grid, severity labels (`thick walls / real walls / thin walls / wide open`), and an inline `door` chip on the weakest axis. **Brand authority is captured** via has_sitelinks + compressed_organic + authoritative_third_party_count + knowledge_graph_present — third-party signals from Google's index, the closest defensible proxy short of paid SEO data APIs.
- **Debug script:** `pnpm tsx scripts/debug_serper.ts <domain1> <domain2> ...` dumps the raw Serper response shape for one or more brand queries. Use it whenever calibration feels off — tells you which fields Serper actually returned (vs which we assumed it would), which authoritative domains showed up, what the knowledge graph contained, etc. Each query costs ~$0.001.
- **Backfill scripts:** `pnpm tsx scripts/recompute_projections.ts` rebuilds projections + recomputes moat reading distribution signals from the existing `report_attributes` rows (so calibration iterations on `scoreDistribution` don't need to re-fetch). `pnpm tsx scripts/backfill_distribution.ts` re-fetches each homepage and re-collects raw distribution signals — only needed when Phase 1 first ships, when a new sub-signal is added, or when a particular collector function changes (SERP query shape, blog-path probing, **rawHead cap on `lib/scanner/fetch.ts` — community detection reads from rawHead and is only as deep as that cap allows**, etc.). Day-to-day calibration: edit `scoreDistribution`, bump `RUBRIC_VERSION`, run `recompute_projections`. Day-zero or sub-signal change: run `backfill_distribution`. **Diagnostic:** `pnpm tsx scripts/diagnose_distribution.ts [--sort=dist|agg|name] [--limit=N]` dumps raw signals + scores per report — fastest way to see whether a low score is driven by missing community channels, weak SERP, RDAP failure, or a scoring-curve issue.

## Similarity engine

Powers the report-body `compare` / `similar scans.` rail on `/r/[slug]` and landing-page scan results. Pure deterministic over the projection — no LLM at query time. Layered on top of the normalization layer's `report_capabilities` rows.

- **Scoring formula:** `similarity = jaccard(source, candidate) × segment_factor`. Weighted Jaccard over capability sets where each slug carries a corpus-aware **IDF² weight**: `weight(slug) = ln((N+1)/(df+1))²`. Universal capabilities (df ≈ N) collapse toward 0 weight; rare capabilities (df = 1-2) dominate. Squared instead of linear so common-cap-only pairs (sharing `user-data-storage` + `integrations` + `social-login`) drop below the threshold while real-twin pairs (sharing `appointment-booking` or `form-builder`) stay well above. **Descriptor 2× boost:** capabilities with `is_descriptor: true` get a 2× multiplier on top of IDF² — categorical signal outranks shared infrastructure. **Stack overlap intentionally excluded** — every B2B SaaS shares Stripe+Postgres+Vercel, so stack overlap is high-overlap-but-no-signal noise.
- **Segment factor (charitable on null):** 1.00 same segment / 0.85 same business model OR either side missing taxonomy data / 0.70 both known and different. Spread is intentionally tight so capability overlap drives ranking, not segment metadata. The earlier 0.4 floor caused segment-mismatched pairs to lose to less-similar segment-matched pairs even when capability overlap was 3× higher.
- **Threshold + cardinality:** `MIN_SIMILARITY_SCORE = 0.10`, `MIN_CARDS_TO_SHOW = 1`, `MAX_CARDS = 6`. Single high-quality matches render. The rail hides only when zero candidates clear the threshold — we never pad with random reports.
- **Comparison framing (the differentiator):** each card surfaces `score_delta` (candidate.score − source.score) with green/red/muted color and a **wedge** — capabilities the candidate has that the source doesn't, descriptors first then alphabetical, top 2 displayed with `+N` overflow. That answers the question users actually have ("what makes this alternative different from what I'm looking at?") rather than the question they don't ("what looks vaguely similar?"). Falls back to `via {shared cap}` only when the candidate is a strict subset (rare).
- **Diagnostics:** `lib/db/neighbors.ts::getSimilarReports` emits `[similar]` console.info dumps server-side on every render — source state (caps, segment, business model), corpus size, top-12 scored regardless of threshold (slug-enriched + shared/same_segment fields), and how many cleared. Cheap to leave on; remove once calibration stabilizes corpus-wide.
- **Descriptor set is derived, not hardcoded.** `lib/normalization/similarity.ts` builds the descriptor set from `ctx.capabilities.is_descriptor` at module load (cached per `EngineContext` identity). Adding a descriptor via `/admin/similarity-gaps` flows: DB write → next `loadEngineContextFromDb()` picks it up → recompute applies. No code change needed.
- **Performance posture:** Phase A is lazy — every `/r/[slug]` render reads all projection rows once via `getAllSimilarityCandidates()` (~80KB at N=1000), scores in memory, pulls full StoredReport rows for the top-K only. ISR caps the effective rate to once-per-hour-per-page. Materialize to a `report_neighbors` table only when N > ~500 OR render p95 > 200ms — the public surface (`getSimilarReports`, `SimilarReport` shape) stays the same when we swap.

## Compare pages

Head-to-head at `/compare/<slug-a>-vs-<slug-b>`. Pure deterministic over existing projection + moat rows; no LLM, no new tables, no materialization.

- **Routing:** `app/compare/[pair]/page.tsx`. The pair param is split exactly once on `-vs-`; multi-`-vs-` URLs return 404 (we don't have any slugs containing `-vs-` today, and the page is too important an SEO surface to risk mis-parsing). Self-pair (`a === b`) and unresolved-slug → 404. **Canonical alphabetical order:** if `a > b` we 301-redirect to `/compare/<b>-vs-<a>` so link equity stays consolidated.
- **Data flow:** `lib/db/compare.ts::getComparePair` does one parallel fetch — both reports (with the existing `moat` 1:1 join), capabilities + attributes (segment, business_model, monthly_floor_usd, is_usage_based) + components, all filtered by `.in("report_id", [a.id, b.id])`. Either side may be missing a projection (legacy / failed); the page degrades section-by-section rather than 404'ing.
- **Diffing:** `lib/normalization/compare.ts::diffPair` is pure. Convention everywhere is signed `b - a`: positive `score_delta` = B easier to clone, positive `cost_delta` = B's monthly floor is higher. Capability buckets sort descriptor-first then alphabetical (matches the rail's wedge ordering). Stack diff hides components with `commoditization_level >= 4` by default — Postgres/Stripe/Vercel et al. — because they're noise in a head-to-head; a `↓ show all (+N commodity)` toggle in `StackDiff` (the only client component on the page) reveals the full set.
- **Verdict engine:** `lib/normalization/compare_verdict.ts::computeCompareVerdict(pair, diff)` is pure. Picks a winner (higher wedge score wins; same-tier-and-`|delta| < 5` is a tie), assembles a chip (`ATTACK <name> FIRST` / `TOO CLOSE TO CALL`), a one-line summary built from concrete reasons (tier delta → thinner walls; cost delta over a 1.5× ratio → `smaller monthly bill`; moat aggregate → `matched moat depth` / `shallower moat`; stack count → `smaller stack`), a verdict-band line that wraps a tier-aware wedge phrase, and a CTA href to the winner's report. No LLM, no DB. Drives both the title-block sub-row and the bottom verdict band so they stay in lockstep.
- **SEO:** `comparePageTitle` produces `{a} vs {b}: which SaaS is easier to compete with? - saaspocalypse` — comparison intent (NOT the per-report "Can you compete with X?" intent). `comparePageJsonLd` emits a `WebPage` with `mainEntity = ItemList` of two `Review`s, one per side. `comparePageOgTitle` gets a longer share-card form including both scores. The OG image (`app/compare/[pair]/opengraph-image.tsx`) is a split panel — each side gets its tier-colored score + name + time, divider in the middle shows `vs` and the signed score delta. Same Satori sanitization rules as the per-report OG.
- **Page chrome:** the global `<Nav />` from `app/layout.tsx` is the ONLY nav on the page. The handoff prototype embeds a second inline site-nav band mid-page — that's a prototype-only artifact (the design exists as a self-contained HTML file with no real layout chrome around it) and must NOT be reimplemented; we already get the nav from the root layout.
- **N² mitigation:** the indexable surface is `O(N×K)` ≈ linear, not N². `lib/db/neighbors.ts::getAllNeighborPairs(limit=6)` loads candidates ONCE, scores every report against the rest in memory, returns the canonical-ordered deduped pair set with `lastModified` (max of both sides' `updated_at`). The sitemap iterates this list. Off-list pairs still resolve at the URL — they just aren't crawled or internally linked.
- **Internal links:** the similarity rail's `SimilarCard` is the primary entry point. The whole card href is `/compare/<source>-vs-<candidate>` (alphabetical), with a small mono-caps `vs.` / `compare →` strip in the footer to make the destination obvious. Every report page emits 6 internal compare links — the SEO compounding play.
- **ISR:** `revalidate = 3600` on the page. Same posture as `/r/[slug]`. Calibration tweaks to the diff math don't need a recompute.

## Calibration framework

Phase 2.6 — every tunable parameter on the deterministic engine moves from code constants into DB rows so calibration is a data edit, not a code deploy. Three tables, one loader, one admin surface.

- **Three tables.** `scoring_patterns` (regex / domain rows; columns: `axis`, `kind` ∈ `capex | capex_exclude | fortress_thesis | distribution_authoritative_domain`, `pattern`, `weight`, `status`, `evidence`, `added_by`, `added_at`); `scoring_weights` (key/value/description; key format `<axis>.<knob>`, e.g. `aggregate.capital`, `distribution.sub_weight.has_sitelinks`, `capital.heavy_capex_anchor`, `technical.nightmare_weight`, `capability.hit_multiplier`); `scoring_audit` (append-only log: who changed what, before/after JSON, reason, `reports_moved` count). Defined at the bottom of `lib/db/schema.sql` as the `2026-05-02 (Phase 2.6 — calibration framework)` block. Idempotent migration; no destructive drops.

- **Defaults still live in code.** `lib/normalization/scoring_defaults.ts` exports `DEFAULT_PATTERNS` + `DEFAULT_WEIGHTS` (the source-of-truth fallback when DB is unreachable or pre-seed). `pnpm tsx scripts/seed_scoring_config.ts` upserts these defaults into the DB on first deploy of the framework — idempotent on `(axis, kind, pattern)` and `key`, so re-running won't undo curator edits. Pattern dumps back to TS aren't a thing yet (we don't `dump_scoring_config.ts`); the source of truth flips to the DB once seeded, and the TS defaults are just the cold-start fallback.

- **Loader + cache.** `lib/normalization/scoring_loader.ts::getCachedScoringConfig()` is the only entry point. Reads `scoring_patterns` (active rows) + `scoring_weights` once, builds a `ScoringConfig`, caches in-process for 5 minutes. On DB error falls back to `DEFAULT_SCORING_CONFIG`. Admin write endpoints call `invalidateScoringConfigCache()` after every change so the next request sees fresh config. Production scans (`runScan` in the pipeline) await this once per scan; admin recompute paths await with `force=true` so just-edited patterns apply on the next click.

- **Refactored scoring engine.** `lib/normalization/moat.ts` no longer owns CAPEX_PATTERNS / FORTRESS_THESIS_PATTERNS / weight constants. Every per-axis scorer takes a `ScoringConfig` and reads patterns via `activeRegexes(config, axis, kind)` and weights via `weight(config, key)`. Same for `lib/scanner/distribution.ts::extractSignals` — accepts an `authoritativeDomains` param. `scoreMoat` defaults to `DEFAULT_SCORING_CONFIG` when no config is passed (legacy callers); production paths always pass a fresh config.

- **What-fired breakdown.** The new `scoreMoatWithBreakdown(input)` returns `{ score, breakdown }` where `breakdown` records every capex hit (with surface + matched text + which pattern fired), every fortress-thesis match, the technical difficulty distribution, every capability-tag hit per axis, and every distribution sub-signal's raw value + weight + score + contribution. Drives the per-axis "what fired?" panels on the score-audit drilldown.

- **Score-audit pages.** `/admin/score-audit` lists every scored report with axis breakdown + filter presets. `/admin/score-audit/<slug>` is the drilldown: shows the breakdown, lets the curator add patterns / disable patterns / edit weights / recompute the single report / call the AI audit. The patterns table is filterable by axis + kind and toggle-able row-by-row (active ↔ disabled).

- **AI suggestions.** `lib/normalization/scoring_audit_llm.ts::suggestScoringPatterns` (Sonnet 4.6, ephemerally-cached prompt that includes the active pattern catalog so Claude doesn't propose duplicates) is purpose-built for capital + distribution patterns — distinct from `moat_audit_llm.ts` which still owns capability suggestions. Output is structurally validated (regex compilation eagerly tested), persisted as `active` rows tagged `added_by='llm:score_audit'`, and surfaced in the patterns table with the LLM evidence visible. The curator disables anything they don't want; `↻ recompute this report` immediately shows the effect.

- **API surface.** `POST /api/admin/scoring-patterns` (add active pattern), `PATCH /api/admin/scoring-patterns` (toggle active/disabled), `POST /api/admin/scoring-weights` (upsert), `POST /api/admin/score-audit/recompute` (single-report recompute, returns before/after), `POST /api/admin/score-audit/suggest` (LLM audit, queues disabled pattern rows for review, returns summary). All admin-cookie-gated; all write `scoring_audit` rows.

- **Drift tracking.** `scripts/recompute_projections.ts` now logs a corpus-wide `scope='recompute'` audit row with `reports_moved` count + a sample of the tier crossings, so the audit history shows "this calibration change moved 8 reports across tiers." Single-report recomputes do the same with `change_kind='recompute_one'`.

- **Weekly sweep.** `app/api/cron/score-sweep/route.ts` runs every Monday 13:00 UTC (Vercel Cron) and writes a snapshot to `scoring_audit`: tier counts, mean aggregate, axis-zero counts by axis, pending vs. verified anomaly counts. Bearer-auth gated by `CRON_SECRET` (same posture as the social cron). Surfaces drift over time so a calibration change that gradually corrupts the corpus is visible in the audit log.

- **Per-axis tunability matrix.** Every axis IS calibratable; different axes use different mechanisms. The score-audit drilldown surfaces the relevant calibration paths inline (each panel has a "tunable" footer listing the relevant pattern kinds + weight keys + cross-links to other admin surfaces).

  | Axis | scoring_patterns | scoring_weights | Other surface |
  |---|---|---|---|
  | capital | `capex`, `capex_exclude`, `fortress_thesis` | path anchors (`descriptive_anchor`, `fortress_thesis_anchor`, `heavy_capex_anchor`), `heavy_capex_hits_min`, `surface_cap`, `numeric.threshold_*` + `numeric.tier_*`, `aggregate.capital` | — |
  | technical | none (uses pre-categorized challenge difficulties) | per-difficulty multipliers (`nightmare_weight` / `hard_weight` / `medium_weight`), `aggregate.technical` | — |
  | network / switching / data_moat / regulatory | none in scoring_patterns — these axes are pattern-driven through the capability catalog instead | `capability.hit_multiplier`, `aggregate.<axis>` | capability `match_patterns` + `moat_tags` at `/admin/moat-anomalies` |
  | distribution | `distribution_authoritative_domain` | 6 sub-signal weights (`distribution.sub_weight.*`), `aggregate.distribution` | — |

- **What's still in code.** The path-resolution logic in `scoreCapital` (descriptive_total → fortress_thesis → heavy_capex → numeric) is structural, not a tunable. The curves `SERP_CURVE` and `AUTHORITATIVE_CURVE` for distribution are arrays of constants (curve shapes — change the shape if you want to tune, then the values become weights). The `AXIS_TAGS` mapping in `moat.ts` (which `MoatTag` values feed which axis) is structural — adding a new tag means adding to the `MoatTag` enum in `taxonomy/capabilities.ts` first, which is a code change anyway.

- **RUBRIC_VERSION discipline.** Bump `lib/normalization/moat.ts::RUBRIC_VERSION` only when the FORMULA changes (new path, new sub-signal, structural rewrite). Pattern adds / weight tweaks via the admin UI do NOT bump it — they're calibration data, not formula. Recompute scripts key off `rubric_version` to find structurally-stale rows.

## Admin curation surfaces

`/admin/*` routes are cookie-gated by `ADMIN_SECRET` (single shared secret, no multi-user accounts). `/admin` itself is now a landing page listing the available curation surfaces; click into one to triage. Auth + login flow unchanged.

- **Auth:** `lib/admin/auth.ts` — `isAdmin()` for server-side checks, `loginWithSecret(secret)` to issue the cookie. The cookie holds the SHA-256 of the secret, not the secret itself; comparisons are constant-time. `clearAdminCookie()` for sign-out (no UI for this yet — change `ADMIN_SECRET` to invalidate all sessions).
- **Landing:** `/admin` is a list of curation surface cards (score audit, unknowns, moat anomalies, similarity gaps), each linking to its respective queue. Replaces the previous behavior of auto-redirecting to `/admin/unknowns`. Add new surfaces by appending to `SURFACES` in `app/admin/page.tsx`.
- **Score audit (Phase 2.6 calibration framework):** `/admin/score-audit` is the consolidated calibration surface. The list view shows every scored report with axis-by-axis breakdown sorted lowest aggregate first, plus filter presets (any axis = 0 / weak walls / thick walls / unscored / by-axis sort). Click into `/admin/score-audit/<slug>` for the drilldown: per-axis "what fired" panels (capex hits with the matched_text shown inline, capability-tag hits, distribution sub-signal contributions), a "suggest capital/dist patterns" button that calls `lib/normalization/scoring_audit_llm.ts::suggestScoringPatterns` (Sonnet 4.6, only proposes `capex` / `capex_exclude` / `fortress_thesis` / `distribution_authoritative_domain` patterns — not capability changes), an "↻ recompute this report" button, plus inline editable tables for `scoring_patterns` (add/disable/enable rows) and `scoring_weights` (edit numeric knobs in place). AI-suggested scoring patterns are inserted **disabled** (`added_by='llm:score_audit'`), so they do not affect scores until the curator enables them, then recomputes. Every write hits the DB through `lib/db/scoring_config.ts` and creates a `scoring_audit` row. The admin pages call `invalidateScoringConfigCache()` after active config writes so the next request sees the new config. **The whole point:** capex regex changes / weight tweaks / authoritative-domain additions used to require a code edit + deploy; now they're DB rows edited from the UI, applied on the next recompute. Production scans pick up scoring config changes within 5 minutes via `getCachedScoringConfig()` and taxonomy changes immediately through `loadEngineContextFromDb()`. See "Calibration framework" below for the full architecture.
- **Login:** `/admin/login` — server-rendered form, POSTs to `/api/admin/login`, sets the cookie and 303s to `/admin/unknowns` (or to `?next=` if specified). Login errors round-trip via `?error=`.
- **Unknowns review:** `/admin/unknowns` lists open rows from `normalization_unknowns` sorted by occurrences desc. Per-row: select-and-alias to an existing component (grouped by category), expand-and-promote to a new component (slug, display_name, category, commoditization_level, extra aliases), or ignore. All three actions POST to `/api/admin/unknowns/[id]` with a discriminated-union body, validated server-side via Zod. The `Triage` component is `"use client"` and `router.refresh()`s on success so resolved rows disappear immediately.
- **LLM curation suggestions:** the "Suggest" button at the top of the page POSTs to `/api/admin/unknowns/suggest`, which loads every open row + its source report's name/tagline/tier/sibling stack, then makes a single batched Claude call (capped at 50 rows/run) that returns one `alias | promote | ignore` suggestion per row. Suggestions persist on the row (`llm_action`, `llm_target_slug`, `llm_category`, `llm_commoditization`, `llm_note`) and render inline as a purple banner with a one-click "Use →" that either submits the resolution directly (alias/ignore) or pre-fills the promote form (so the human can tweak the category/level/aliases first). Idempotent — re-running overwrites prior suggestions. **This is the one LLM call inside the normalization layer, and it's deliberately admin-only — the deterministic engine is unchanged, the product surface stays AI-wrapper-free, and only the curation aid is LLM-assisted.** Code lives in `lib/normalization/suggestion_llm.ts` (Sonnet 4.6, ephemerally-cached system prompt that includes the full canonical-component catalog so Claude can recommend valid alias targets).
- **Capability moat review:** the old `/admin/moat-anomalies` route now redirects into `/admin/score-audit?filter=suspects`; the useful moat-anomaly workflow lives inside the score-audit drilldown. Use it for network / switching / data / regulatory coverage gaps where the deterministic projection missed a moat-bearing capability. The drilldown surfaces capability hits per axis, the `capability catalog fixes` panel, `AI capability audit` (`lib/normalization/moat_audit_llm.ts::auditMoat`, Sonnet 4.6, proposes `add_pattern` / `new_capability` edits with human-applied buttons), recompute, and mark verified/pending. Verified state lives on `report_moat_scores.review_status` ('pending' | 'verified') and survives recomputes — re-flag manually after a material taxonomy change if the dismissal might be stale. **Same posture as the unknowns flow:** admin-only, deterministic engine unchanged, LLM is curation aid only.
- **Bulk moat audits:** the Pending queue has a `✦ Audit N un-audited` button at the top that loops the visible rows in chunks of 5 against `POST /api/admin/moat-anomalies/audit-batch` (each request audits up to 5 reports sequentially within the 60s function budget). Each audit persists onto `report_moat_scores.audit_summary` / `audit_suggestions` (jsonb) / `audited_at` so the suggestions render inline on every card without a re-click — and survive page refreshes. `persistMoatScore` clears those columns on recompute since the audit was generated against the prior score + capability matches; once the score moves, the suggestions are stale. Per-row "AI audit this report" still works for one-off audits and uses the same persistence path. **Audit-prompt gate (important):** `moat_audit_llm.ts` strongly prefers `add_pattern` over `new_capability` because the scoring engine counts capability hits flatly — every new capability permanently inflates aggregates corpus-wide on re-projection, while patterns are elastic. Keep that bias in any prompt edits.
- **Similarity gaps review:** `/admin/similarity-gaps` is the curation surface for filling holes in the descriptor taxonomy. **Detector** (`lib/normalization/similarity_gaps.ts::detectSimilarityGaps`) is a pure function: tokenize **name + tagline only** (lowercase, stopword-stripped, ≥3 chars — `take`/`take_sub` deliberately excluded; their judgment-laced prose drowns category signal), pairwise text-Jaccard, joined with the deterministic engine score. Flags a pair when `text ≥ 0.20` AND **either** `engine ≤ 0.10` (sharing zero descriptors) **or** `text - engine ≥ 0.10` (engine under-scoring relative to obvious text overlap — catches pairs like ahrefs/semrush sharing only generic `fine-tuning, proprietary-dataset` where engine sits at 0.226 when it should be 0.5+). Curator runs `↻ detect new gaps` to scan the corpus; results persist to `similarity_gaps` (canonical-ordered pair, unique constraint deduplicates re-runs across statuses). The detect endpoint emits `[gaps]` console.info dumps (top-20 by text-Jaccard with engine score, gap, and which rule flagged) so the curator can spot threshold problems without re-running with code changes. Per-row: shows both reports' tagline + currently-firing capabilities, offers `✦ suggest` (calls `lib/normalization/descriptor_suggestion_llm.ts::suggestDescriptor` — Sonnet 4.6 returns `add_pattern | new_capability | no_action`), `apply →` (one-click for `add_pattern`; promote-form with editable slug/name/category/patterns for `new_capability`), or `dismiss`. **Apply triggers a per-pair recompute** of both reports against DB-fresh taxonomy so the convergence is immediately visible on `/r/<slug>`. Same posture as moat-anomalies: deterministic engine unchanged, LLM is curation aid only, human applies each fix. Admin-only.
- **Descriptor flag distinct from `moat_tags: []`:** Capabilities have an `is_descriptor` boolean (DB column + TS field). A descriptor names what a product CATEGORICALLY IS (`form-builder`, `appointment-booking`, `ai-agent-platform`); a non-descriptor `moat_tags: []` capability is a sub-feature many products share (`rich-text-editor`, `social-login`, `pdf-generation`, `kanban`). The similarity engine boosts shared descriptors 2× on top of IDF² — without that, generic features can outrank category matches. The moat engine ignores both equally (only non-empty `moat_tags` arrays feed network/switching/data/regulatory axes). New capabilities created via `/admin/similarity-gaps` default `is_descriptor: true`; new capabilities created via `/admin/moat-anomalies` default `is_descriptor: false`.
- **Live taxonomy in scans + recompute (important):** Production scans and admin recompute both read taxonomy *from the DB*. `lib/db/taxonomy_loader.ts::loadEngineContextFromDb` joins all four taxonomy tables and assembles a fresh `EngineContext` (via `engine.ts::buildEngineContext`) which is passed to `projectReport(ctx)` and `scoreMoat({ catalog })`. This means: admin adds a capability/pattern via UI → DB updated → fresh scan or recompute reflects the taxonomy immediately, no redeploy needed. The TS-bundled taxonomy is still the git snapshot and fallback/reference surface; after material DB-side taxonomy work, run `pnpm tsx scripts/dump_taxonomy.ts` → review the diff → commit → deploy so code and DB do not drift.
- **TS-vs-DB sync:** the admin actions write to the DB. Both the stack-components and capabilities TS files are regenerated via `pnpm tsx scripts/dump_taxonomy.ts` (now also dumps `lib/normalization/taxonomy/capabilities.ts` in addition to `stack_components.ts`). The capabilities dump emits `is_descriptor: true` inline when set; absent when false (default). Workflow: triage → dump → review diff → commit. `market_segments.ts` and `business_models.ts` remain TS-only (no admin write path yet).

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

Current hero uses `design_handoff_clean_hero`: centered scanner, top pill `SaaS moat scanner`, split headline (`Scan any SaaS.` / `Find the weak spot.`), preserved subheading + legal copy. Other sections come from `design_handoff_saaspocalypse`.

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
- **Similarity engine uses IDF², not linear IDF.** `lib/normalization/similarity.ts::buildCorpusWeights` computes `weight = ln((N+1)/(df+1))²`. Linear IDF wasn't aggressive enough — pairs sharing three generic capabilities clustered close to real twins. Squaring widens the gap because common caps contribute near-zero in BOTH the intersection and the union. Real-twin scores compress less than noise scores; ratio improved from ~2× to ~4×. Don't "simplify" back to linear without revisiting the threshold.
- **Descriptor 2× boost is corpus-wide, not pair-specific.** Setting `is_descriptor: true` on a capability boosts every pair that shares it, not just one. New descriptors created via `/admin/similarity-gaps` apply to existing reports too once they recompute. The apply endpoint at `/api/admin/similarity-gaps/[id]/apply` recomputes only the two reports in the flagged pair — corpus-wide effects show up next time other reports recompute (manual `pnpm tsx scripts/recompute_projections.ts` after material taxonomy changes).
- **Similarity rail works without recompute on calibration tweaks.** Threshold, IDF formula, segment factor, descriptor boost are all query-time math over existing `report_capabilities` rows. Editing `lib/normalization/similarity.ts` and reloading a `/r/<slug>` page picks up the new math immediately (modulo ISR — visit a fresh slug or set `revalidate = 0` locally).
- **Anthropic tool `input_schema` requires a top-level `type: "object"`.** A bare `z.discriminatedUnion(...)` serializes to `{ anyOf: [...] }` with no top-level type, and the API rejects it with `tools.0.custom.input_schema.type: Field required`. Wrap unions in an outer `z.object({ field: SuggestionSchema })` (see `descriptor_suggestion_llm.ts::SubmissionSchema` and `moat_audit_llm.ts::BatchSchema`) so the JSON Schema root is an object. Unwrap `parsed.data.field` after validation. Sanitize step strips `$schema` / `$id` either way.
- **Compare-page slug parsing.** `app/compare/[pair]/page.tsx` splits the param on `-vs-` and 404s if the result isn't exactly two non-empty halves. We do NOT split on the last occurrence — multi-`-vs-` URLs are rejected as ambiguous. None of our slugs contain `-vs-` today, and the page is too important an SEO surface to risk silently mis-parsing.
- **Similarity-gap detector tokenizes name + tagline only.** Earlier versions added `take` + `take_sub` to the blob and the noise floor sat below threshold across the entire corpus (across 1,225 pairs at N=50, only one cleared text-Jaccard ≥ 0.20 — and it was vercel.app vs vercel.com on the literal brand token). Take-prose is high-entropy judgment vocabulary that doesn't carry category signal. Don't add the takes back without re-tuning the threshold.

## Flagship feature backlog

Strategic features that compound on the normalization + moat-scoring layer. **#1 (compare pages) and #2 (similarity rail) shipped** — see "Compare pages" and "Similarity engine" above. The remaining items are ordered roughly by leverage.

1. ~~**Head-to-head compare — `/compare/<slug-a>-vs-<slug-b>`**~~ — **shipped.** See "Compare pages" above for the canonical-301 routing, the `diffPair` math, the split-card OG, and the `getAllNeighborPairs` sitemap wiring.
2. ~~**"Products like X" rail inside every report**~~ — **shipped.** See "Similarity engine" above for the IDF² + descriptor-boost calibration, the comparison-framed cards (score delta + wedge), the report-body `comparisons` slot, and the `/admin/similarity-gaps` curation flow.
3. **"How to attack X" wedge inversion** — surface a report's weakest moat axes as competitive wedges ("low switching cost + no data moat → undercut on portability"). Slots next to the verdict on FORTRESS reports where head-on cloning dies but flank plays may still exist. Pure projection over `report_moat_scores`, no LLM.
4. **Leaderboards — `/leaderboards/{fortress-50,weakest-moats,most-capital-intensive,...}`** — auto-updating sharable artifacts; natural fodder for the X content engine ("new entrant on the fortress 50 this week is…"). Single SQL query per board, ISR'd.
5. **Per-segment benchmarks — `/segments/<slug>`** — moat-axis distributions, median monthly floor, common stack components, member reports, "products in this segment." Turns the segment taxonomy into landing pages and gives the methodology page somewhere to deep-link.
6. **Capability-gap finder** — combinations no scanned product has in a given segment. Idea generator. Weak below ~500 reports — shelve until corpus matures, then revisit.
7. **Moat archetypes** — k-means or similar over the 6-axis moat vectors → 4-6 named archetypes ("regulatory fortress", "pure capital play", "shallow & fast"); tag every report with its archetype. Cleaner than leaderboards for explaining *why* something is hard. Recompute when `RUBRIC_VERSION` bumps.

Not on the roadmap (intentionally): time-series re-scans (corpus too young to detect drift), pricing-prediction features (would require an inference layer that pulls us back toward AI-wrapper territory), distribution/brand moat scoring (can't derive from a homepage scan; methodology page already calls this out).

## Not yet built

- Scan quality logging (`scan_metrics` table — see plan §"Quality measurement").
- Playwright-based scraping for JS-heavy sites.
- Admin regenerate / moderation / refund tools.
- Guide regeneration / versioning (currently `build_guides.report_id` is unique — regen would need either a new-column version or an "archive old row" flow).
