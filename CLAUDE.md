# saaspocalypse

Marketing landing page for a (not yet built) tool that tells indie hackers whether they could build a given SaaS themselves — returning a buildability score, stack receipt, time-to-clone, and a snarky one-liner. The tone is intentionally pun-heavy and corny; the jokes are the product.

## Stack

- **Framework:** Next.js 15 (App Router) + React 19 + TypeScript
- **Styling:** Tailwind CSS v4 (CSS-based config, no `tailwind.config.ts`)
- **Fonts:** `next/font/google` — Space Grotesk (display) + JetBrains Mono (body)
- **Package manager:** pnpm
- **Deployment target:** Vercel

**In progress:** real scanner + verdict storage + SEO report pages. See the full plan at `C:\Users\swerny\.claude\plans\looks-good-let-s-address-mutable-lamport.md`. Phase 1 (read path) is code-complete but needs Supabase provisioning + env vars + seeding before it's live.

**Planned but not yet wired:** Upstash Redis (Phase 2), Anthropic Claude scanner (Phase 2), Stripe + Resend (Phase 3). The hero scanner is still a fake-timed animation; Phase 2 replaces it.

## Commands

```
pnpm dev              # dev server with Turbopack (fast HMR)
pnpm build            # production build (webpack — see Gotchas)
pnpm typecheck        # tsc --noEmit
pnpm lint             # next lint
pnpm tsx scripts/seed.ts   # seed the 4 handoff reports into Supabase (requires env vars)
```

## Project layout

- `app/` — App Router entry. `layout.tsx`, `page.tsx` (landing), `r/[slug]/page.tsx` (per-report SEO page), `globals.css`.
- `components/` — section + interactive components. `VerdictReport.tsx` is the full report card (used on both `/r/[slug]` and — Phase 2 — inline in `<Scanner>` after a scan).
- `lib/content.ts` — static copy (headlines, testimonials, FAQs, footer, marquee). **Change copy here, not in components.** Note: `EXAMPLE_VERDICTS` here is only still used by the Phase-1 fake scanner; Phase 2 will remove it.
- `lib/scanner/schema.ts` — Zod `VerdictReportSchema` (the canonical verdict shape used by the DB row, the LLM tool, and the UI). Exports `VerdictReport`, `Tier`, `Difficulty`, plus tier/difficulty color maps.
- `lib/domain.ts` — `normalizeUrl(input)` (→ eTLD+1 via `tldts`), `toSlug`, `fromSlug`.
- `lib/db/schema.sql` — source-of-truth Postgres schema. Apply via the Supabase SQL editor or (later) migrations.
- `lib/db/supabase.ts` — `getSupabaseAnon()` (returns `null` if env missing, so `pnpm build` works pre-provisioning) and `getSupabaseAdmin()` (server-only; bypasses RLS).
- `lib/db/reports.ts` — DAL: `getReportByDomain`, `getReportBySlug`, `getRecentReports`, `insertReport`, `upsertReport`. All anon reads degrade gracefully to `null`/`[]` if Supabase isn't configured.
- `scripts/seed.ts` — seeds the 4 handoff example reports. Needs `SUPABASE_SERVICE_ROLE_KEY`.
- `design/` — design handoff bundles (`README.md` + prototype `.jsx`/`.html`). **These are specs, not production code.** Don't import from them. Each new design direction gets its own `design_handoff_*` subfolder.

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

Required for the read path (Phase 1) once Supabase is provisioned:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=           # server-only; needed by seed script + Phase 2 writes
```

Phase 2 adds `ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `SCAN_RATE_LIMIT_PER_HOUR`. Phase 3 adds Stripe + Resend vars. See the plan file for the full list.

Without these vars set, the code still builds and runs — DB reads degrade to empty results and the homepage "Recent verdicts" shows a friendly placeholder.

## Setting up Supabase (first-time)

1. Create a Supabase project. Copy URL, anon key, and service-role key into `.env.local`.
2. Open the Supabase SQL editor and paste the contents of `lib/db/schema.sql`. Run it.
3. Run `pnpm tsx scripts/seed.ts` to insert the 4 example reports.
4. Visit `/r/notion-so` — the full VerdictReport should render. The homepage "Recent verdicts" grid now shows live DB data.

## Content & copy

All copy is final and intentional — the jokes are the product. Don't sanitize. Edit `lib/content.ts`.

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
- **Zod 4 is installed** and has built-in `z.toJSONSchema()` — use that for the Phase 2 LLM tool schema, no separate `zod-to-json-schema` dependency.

## Not yet built

- Real URL scanning backend (Phase 2 — see plan file). The hero scanner still uses fake-timed animation + `EXAMPLE_VERDICTS`.
- Upstash Redis rate limiting + scan locks (Phase 2).
- Stripe build-guide monetization + Resend delivery (Phase 3).
- Dynamic OG images per report, `/directory` page, `app/sitemap.ts`, JSON-LD (Phase 4).
- Favicon, `public/` directory.
- Mobile hamburger for nav (spec says collapse below ~700px).
