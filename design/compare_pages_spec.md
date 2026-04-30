# Compare pages — spec

`/compare/<slug-a>-vs-<slug-b>` — head-to-head comparison page. Combinatorial SEO surface ("X vs Y" queries are some of the highest-intent on the internet). Pure deterministic over existing projection + moat rows; no LLM at request time. Builds on the similarity rail's neighbor list as the canonical pair surface so indexable count stays linear (O(N×K), not O(N²)).

## Routing & canonicalization

- **URL:** `/compare/[pair]/page.tsx` where `pair` is `<slug-a>-vs-<slug-b>`.
- **Parse:** split on the **last** ` -vs- ` occurrence (be defensive — slugs can contain `-`). Two halves both need to resolve via `getReportBySlug`.
- **Canonical order:** alphabetical (`a < b`). If the URL has them reversed, return a **301** redirect to the canonical order (Next: `redirect(...)` from `next/navigation` inside the page; or middleware). This halves duplicate pair URLs and keeps link equity consolidated.
- **Self-pair:** if `a === b`, return `notFound()`.
- **Either slug 404s:** `notFound()`.
- **Neither has a projection:** render anyway — the moat radar + verdict side-by-side still has value. Capability/stack diff sections show empty states.

## Data layer

New helper `lib/db/compare.ts::getComparePair(slugA: string, slugB: string)`:

```ts
export type ComparePair = {
  a: StoredReport;          // includes moat:StoredMoatScore | null
  b: StoredReport;
  projA: SimilarityCandidate | null;   // capabilities + segment + business_model
  projB: SimilarityCandidate | null;
  componentsA: ReportComponentRow[];   // for stack diff
  componentsB: ReportComponentRow[];
};
```

One parallel fetch — both reports (the existing 1:1 moat join already lands `a.moat`/`b.moat`), both projection candidates from `getAllSimilarityCandidates()` (already cached in-memory by getter), both component rows. ~2 round trips total.

## Computed deltas (pure)

`lib/normalization/compare.ts::diffPair(pair: ComparePair): CompareDiff`:

- `score_delta` — `b.score - a.score` (signed). Convention: positive = B easier to clone than A.
- `cost_delta` — `monthly_floor_b - monthly_floor_a` (when both non-null; else null).
- `capability_diff` — three sets:
  - `shared` — present on both, descriptor-first then alphabetical.
  - `a_only` — A has, B doesn't, same ordering.
  - `b_only` — B has, A doesn't, same ordering.
- `stack_diff` — same shape over component slugs. Suppress `commoditization_level >= 4` rows (Postgres/Stripe/Vercel) from both sides — they're noise that obscures the differentiating bits. Keep them if user clicks "show all".
- `moat_diff` — per-axis: `{ axis, a, b, delta }` for the 6 axes + `aggregate`.
- `tier_match` — boolean; same tier OR not.

## Page layout (top-to-bottom)

```
┌─ HEADER ────────────────────────────────────────────────┐
│ ← back                                       saaspocalypse │
│                                                            │
│ Can I build {a.name} or {b.name}?                          │
│ buildability head-to-head                                  │
└────────────────────────────────────────────────────────────┘

┌─ VERDICT TWIN ────────────────────────────────────────────┐
│  ┌────────────┐               ┌────────────┐              │
│  │ {a.name}   │      vs       │ {b.name}   │              │
│  │ {tier-A}   │               │ {tier-B}   │              │
│  │ {score-A}  │   {±delta}    │ {score-B}  │              │
│  │ {time-A}   │               │ {time-B}   │              │
│  └────────────┘               └────────────┘              │
│                                                            │
│  {a.tagline}                  {b.tagline}                  │
└────────────────────────────────────────────────────────────┘

┌─ MOAT COMPARISON ─────────────────────────────────────────┐
│  6-axis grid; each axis row shows two bars (A / B) on a   │
│  shared 0-10 scale, with the delta to the right.          │
│  Aggregate up top, hero-styled like MoatBreakdown.        │
└────────────────────────────────────────────────────────────┘

┌─ CAPABILITY WEDGE ────────────────────────────────────────┐
│  shared: [ chip chip chip ]                                │
│  only A: [ chip chip ]      only B: [ chip chip chip ]    │
│  Descriptors styled distinctly (filled vs outlined).       │
└────────────────────────────────────────────────────────────┘

┌─ STACK DIFF ──────────────────────────────────────────────┐
│  Same three-column structure for components.               │
│  Default hides commoditization >= 4; toggle to show.       │
└────────────────────────────────────────────────────────────┘

┌─ COST + TIME STRIP ───────────────────────────────────────┐
│  monthly floor: $A vs $B  ({±delta} or "usage-based")     │
│  time-to-clone: A vs B (display side-by-side, no math —    │
│    time strings are LLM-authored prose, not numeric)       │
└────────────────────────────────────────────────────────────┘

┌─ FOOTER ──────────────────────────────────────────────────┐
│  → full report on {a.name}      → full report on {b.name}  │
│  → see other comparisons (links to neighbors of A and B)   │
└────────────────────────────────────────────────────────────┘
```

## Components

New under `components/compare/`:
- `ComparePage.tsx` — top-level layout shell (server component).
- `VerdictTwin.tsx` — the side-by-side header card.
- `MoatTwin.tsx` — paired-bar 6-axis grid + aggregate. Reuses severity colors from `MoatBreakdown` (coral ≥7 / ink ≥4 / muted ≥1 / faded).
- `CapabilityDiff.tsx` — three-column chip grid. Re-exports use the existing `CAP_LOOKUP` pattern.
- `StackDiff.tsx` — same shape over components. Has a `"use client"` toggle for show-all.
- `CompareFooter.tsx` — escape hatches to both reports + neighbor crosslinks.

All server components except `StackDiff`'s show-all toggle.

## Internal linking

The similarity rail's `SimilarCard.tsx` becomes the primary entry point. Two options:

- **Option A (cleaner):** card itself links to `/compare/<source>-vs-<candidate>`. No solo-link.
- **Option B (richer):** card body links to compare; small footer link `→ {candidate}` opens the solo report.

Recommend **A** — the compare page already has "→ full report on X" footers, so the per-report page is two clicks away, and the card stays uncluttered. One concrete benefit: every report page emits 6 internal compare links, which is the SEO compounding play.

## Sitemap

Append to `app/sitemap.ts`:

```ts
const compareEntries: MetadataRoute.Sitemap = [];
for (const source of reports) {
  const neighbors = await getSimilarReports(source.id, 6);
  for (const n of neighbors) {
    if (source.slug >= n.report.slug) continue; // canonical order, dedup
    compareEntries.push({
      url: `${SITE_URL}/compare/${source.slug}-vs-${n.report.slug}`,
      changeFrequency: "weekly",
      priority: 0.65,
      lastModified: new Date(Math.max(
        new Date(source.updated_at).getTime(),
        new Date(n.report.updated_at).getTime(),
      )),
    });
  }
}
```

At N=1000, K=6 → ~3000 pair URLs after dedup. Cached at the sitemap's existing `revalidate = 3600` cadence. Off-list pairs still resolve at the URL — they just aren't crawled or internally linked.

**Performance caveat:** `getSimilarReports` is per-source today and re-fetches projection candidates each call (server-cached but still N round-trips). Sitemap regeneration becomes O(N) calls. Add a batch helper `getAllNeighborPairs()` that loads candidates **once**, scores all sources in memory, and returns the canonical-ordered pair set. ~80KB working set at N=1000; sub-second.

## SEO

`lib/seo/meta.ts`:
- `comparePageTitle(a, b)` → `Can I build {a.name} or {b.name}? — head-to-head · saaspocalypse`
- `comparePageDescription(a, b, diff)` → `{a.name} vs {b.name}. {a.score} vs {b.score} buildability. Stack, capabilities, time, cost — side by side.` (≤155 chars; truncate gracefully).

`lib/seo/jsonld.ts::comparePageJsonLd(a, b)` — emit a `WebPage` with `mainEntity` an `ItemList` of two `Review` items (one per report). One `<script type="application/ld+json">` server-rendered.

## OG image

`app/compare/[pair]/opengraph-image.tsx` — split card:
- Left half: A's score circle + tier color band, name, tagline.
- Center: vertical divider with "vs" set in `font-display`.
- Right half: B's score circle + tier color band, name, tagline.
- Bottom strip: `time-A · time-B`.

Same Satori sanitization rules as the per-report OG (no smart quotes, no em-dashes, basic-Latin only, every multi-child div needs explicit `display: "flex"`).

## ISR + caching

- `revalidate = 3600` on the page (matches the rest of the site).
- `getComparePair` and `diffPair` are pure over existing projection rows — no extra DB writes, no new tables, no LLM. A taxonomy edit + recompute of either side propagates on next ISR rebuild.
- No materialization until N >> 1000. Same posture as the similarity rail's Phase A.

## Edge cases

- **One side missing moat scores** (`moat: null`): render `MoatTwin` with the present side only and a muted "{name} hasn't been moat-scored yet" placeholder on the other. The existing `report_moat_scores` recompute path covers this when the curator catches up.
- **One side missing projection:** capability + stack diff sections show "no projection — recompute pending" placeholders. Verdict twin + cost strip + footer still work.
- **Same tier on both sides:** legitimate. The page still adds value — comparing two WEEKEND tools is a real query.
- **Identical capability sets:** the diff shows all-shared, both `_only` columns empty. Header copy adjusts: "{a.name} and {b.name} cover the same ground — here's where the moat math diverges."

## Out of scope (deliberately)

- LLM-authored "which would I build?" verdict at request time. The deterministic deltas are the value prop; an LLM commentary belongs in a separate phase if at all.
- User-editable comparisons (multi-product, drag-and-drop). One-vs-one is the SEO surface; N-way is a different product.
- Historical comparisons across re-scans. Corpus is too young.

## Implementation order

1. `lib/db/compare.ts::getComparePair` — DAL + types.
2. `lib/normalization/compare.ts::diffPair` — pure compute + tests against the seed reports.
3. `app/compare/[pair]/page.tsx` — minimal layout with `VerdictTwin` only; verify routing + canonical 301.
4. `MoatTwin` + `CapabilityDiff` + `StackDiff` + `CompareFooter`.
5. `lib/seo/meta.ts` + `lib/seo/jsonld.ts` additions.
6. OG image.
7. `getAllNeighborPairs` batch helper + sitemap wiring.
8. Swap `SimilarCard` href to compare URL (Option A above).

Phases 1–6 can ship behind a noindex meta tag if we want to QA visually before wiring sitemap + internal links. Once those are wired, the SEO surface comes online.
