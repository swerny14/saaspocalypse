# Handoff: Saaspocalypse — Comparison Page (head-to-head)

## Overview
A side-by-side **comparison page** that pits two scanned SaaS products against each other on the four Saaspocalypse axes: buildability score, moat depth (six sub-axes), feature overlap, stack overlap, and cost + time floor. The page closes with a one-line "verdict" band that tells the reader which one to build first and why. Reachable from the Directory ("compare these two ↗"), and from any individual scan report ("compare to another scan ↗").

The example used throughout this handoff compares two stand-in products: `notion-ish.com` (a rich-text + DB editor, score 48, "MONTH" tier) vs. `calendly-ish.com` (an appointment-booking form, score 84, "WEEKEND" tier). Both are sample data — the page is fully driven by two `ScanReport` objects + a derived `Comparison` object (see Data shape below).

## About the design files
The files in this bundle are **design references created in HTML/CSS** — a working static prototype showing the intended look and behavior. They are **not production code to copy directly**.

Your task is to **recreate this design in the target codebase's existing environment** (React, Vue, Svelte, SwiftUI, native, etc.) using its established patterns, primitives, and design tokens. If no environment exists yet, choose the framework most appropriate for the project. Pixel-match the visuals; do not ship the HTML as-is.

## Fidelity
**High-fidelity (hifi).** All colors, typography, borders, shadows, spacing, and section composition are final. Match them.

## Files in this folder
- `README.md` — this file
- `comparison-page.html` — the rendered design. Open in a browser at ≥ 1200px wide for the intended layout.
- `logo-s.png` — the saaspocalypse "S" mark used in the inline site-nav band.

---

## Page architecture

The page is a single column of stacked cards on the warm-cream page background. **Outer page padding: 28px;** **max-width: 1200px;** centered.

```
┌── top rail (mono crumbs · scan meta) ───────────────────────────┐
├── Page title block ─────────────────────────────────────────────┤
│   eyebrow · "head-to-head"                                     │
│   H1 with two ink/lime "ransom" chips                           │
│   verdict pill row                                              │
├── HEAD-TO-HEAD card ────────────────────────────────────────────┤
│   [ product A side ] [ vs gutter ] [ product B side ]            │
├── MOAT card ────────────────────────────────────────────────────┤
│   aggregate strip · ink delta center · aggregate strip           │
│   6 axis rows: bar / num | axis label center | num / bar         │
├── inline SITE NAV band (matches site chrome) ───────────────────┤
├── OVERLAP triptych card ────────────────────────────────────────┤
├── STACK triptych card ──────────────────────────────────────────┤
├── COST + TIME (FLOOR) card · 2 quads ───────────────────────────┤
├── VERDICT band (ink/lime, full-width) ──────────────────────────┤
└── footer links + footer rail ──────────────────────────────────┘
```

Every card uses the brutalist frame:
- `background: #ffffff` (paper)
- `border: 2.5px solid #0a0a0a`
- `box-shadow: 6px 6px 0 0 #0a0a0a` (no blur — hard offset)
- `margin-bottom: 24px`

---

## Section specs

### 1. Top rail (breadcrumb)
- Flex row, space-between, `padding-bottom: 18px`
- Mono 11px / 700 / `letter-spacing: 0.18em` / uppercase, color `--muted`
- Crumbs: `← directory  /  compare  /  notion-ish vs calendly-ish` (last segment ink-700, separators 40% opacity)
- Right side: `scan #04 · last updated 14h ago`

### 2. Page title block
- Container: `border-bottom: 2.5px solid --ink; padding: 4px 0 22px; margin-bottom: 28px`
- **Eyebrow:** mono 11px 700 uppercase ink, gap 10px, with an 8×8 coral dot, then `head-to-head · buildability comparison` (the `·` clause is `--muted`).
- **H1:** Space Grotesk, 64px, 700, `letter-spacing: -0.035em`, `line-height: 0.96`, `text-wrap: balance`. Two `<em>` chips — `notion-ish` and `calendly-ish` — render as inline lime-on-ink ransom blocks: `background: --ink; color: --lime; padding: 0 10px; box-shadow: 4px 4px 0 0 --ink; transform: translateY(-2px); margin: 0 4px;`. The `<em>` is **not italic** — `font-style: normal`.
- **Sub row** (mono 12px, gap 14px, wrap): an ink/lime "VERDICT" pill (mono 10.5px 700 0.16em uppercase, padding 3px 9px), a lime/ink boxed verdict chip with hard shadow ("BUILD CALENDLY-ISH FIRST"), then a one-sentence summary in `--muted`.

### 3. Head-to-head card
3-column grid: `1fr 86px 1fr`. Both side panels have **min-height 240px**.

**Per side panel** (`padding: 26px 30px 22px`):
- Top row (flex space-between, baseline-aligned, gap 14px):
  - Mono 10.5px 700 0.18em uppercase metadata block: `clone time` (muted) + `<value>` (ink) on next line.
  - **Tier stamp**: mono 11px 700 0.16em uppercase, padding 4px 9px, `border: 2px solid --ink; box-shadow: 2px 2px 0 0 --ink;`. Background by tier: WEEKEND = `--lime` (or `--green` for the smaller variant), MONTH = `--yellow`, DON'T = `--pink`. Always ink text.
- **Product name**: Space Grotesk 56px 700, `letter-spacing: -0.04em`, `line-height: 0.95`, margin `0 0 6px`.
- **Tag line**: 15px 500 `--muted`, margin-bottom 22px.
- **Score row**: baseline flex; **score number** Space Grotesk 96px 700 `letter-spacing: -0.06em` `line-height: 0.85`, color = severity (gold = `--yellow`, go = `--green`); suffix `/ 100` Space Grotesk 22px 500 0.5 opacity `letter-spacing: -0.03em`.
- **Score bar**: 6px tall, `border: 1.5px solid --ink`, background `--cream`. Fill = `width: <score>%`, ink for low scores or `--green` for high scores. Add 3 `<i class="tick">` divs at 25/50/75% — 1.5px wide ink, 25% opacity.
- **Foot row** (mono 10.5px 700 0.18em uppercase): `buildability score` (muted) on the left, `full report ↗` (ink, 2px ink underline) on the right. Hover swaps to `--coral`.

**Background asymmetry**: left panel `--paper`, right panel `--paper-alt` (`#fafaf5`). This subtly distinguishes the two halves.

**vs gutter** (middle column, 86px wide):
- `border-left/right: 2.5px solid --ink`
- Background: `repeating-linear-gradient(45deg, --cream 0 6px, transparent 6px 12px)` over `--paper` — a fine diagonal hatch.
- Flex column, `space-between`, padding 16px 0.
- Top: mono `→` (18px 700 ink). Bottom: mono `↑` (18px 700 ink). Center: vertical `vs` text — Space Grotesk 56px 700 `letter-spacing: -0.04em`, rendered with `writing-mode: vertical-rl; transform: rotate(180deg);`.

### 4. Moat card
Header strip (shared `card-head` pattern — see token "Card head" below): black `§ moat` badge + `how deep is each moat.` H3 (Space Grotesk 26px 700 `-0.02em`). Right side: `aggregate · TIE · ±0.4 · methodology →`. The `tie` chip is a small lime/ink boxed chip with hard 2px shadow.

**Aggregate strip** (`grid-template-columns: 1fr 130px 1fr`, divided by 2.5px ink rules):
- Each side `padding: 22px 28px`. Mono 10.5px 700 0.18em uppercase eyebrow (`<product> · aggregate`), then a baseline-aligned big number (Space Grotesk 46px 700 `-0.04em`) + `/10` (18px, 0.4 opacity) and a right-side severity word (mono 10.5px 700 0.16em uppercase, muted, e.g. `shallow ditch`). Below: a 10px-tall ink-bordered bar with a `--cream` track and an ink fill = `<aggregate>*10%`.
- **Center delta**: ink background, lime text. Stacked column: mono 10px 700 0.2em uppercase `moat delta` (70% opacity), Space Grotesk 38px 700 `-0.03em` value (e.g. `+0.4`), mono 13px 70% opacity `→ <winner>`.

**Per-axis rows** (×6 — capital, technical, network, switching, data, regulatory):
- Grid `1fr 130px 1fr`, hairline `1.5px solid --hairline` between rows, last row no border.
- **Side cells** (`padding: 16px 28px`): inner sub-grid `1fr 70px`, gap 16px, items center.
  - **Bar** (14px tall, 2px ink border, `--cream` track) with a ink fill scaled to `score*10%`. Severity rules:
    - `>= 7` (fortress) → `--pink`
    - **leader** of a row that isn't fortress → `--coral`
    - normal score → `--ink`
    - score 0 (or trailing axis) → `#d8d4c4` (faint)
  - **Number** (Space Grotesk 22px 700 `-0.03em`, line-height 1). Right-aligned on left side, left-aligned on right side. Variants: `lead` color `--coral`, `zero` color `--muted-2` (`#999`).
  - **Mirroring**: the LEFT side bar uses `transform: scaleX(-1)` so the fill grows leftward toward the center label. The right side grows rightward (default).
- **Center axis label**: `--cream` background, ink rule on both sides, mono 11px 700 0.18em uppercase axis name + a small `delta-mini` chip below (mono 10px 700, 0.12em). Delta colors: `pos` `--green`, `neg` `--coral`, `tie` `--muted-2`. Text examples: `−3.0 →`, `+0.4`, `±0`.

Reference data for the canonical rendering:
| axis | left score | right score | bar style |
|---|---|---|---|
| capital | 6.0 | 3.0 | left ink, right muted |
| technical | 5.1 | 2.6 | left ink, right muted |
| network | 8.0 | 0.0 | left coral (lead), right faint |
| switching | 10.0 | 8.0 | left pink (fortress), right ink |
| data | 0.0 | 0.0 | both faint |
| regulatory | 0.0 | 0.0 | both faint |

### 5. Inline site nav
Re-use the existing site nav band (paper card, 2.5px ink border, 6px hard shadow). Padding `10px 18px`, flex space-between. Brand cluster: 30px logo + `saaspocalypse` (Space Grotesk 18px 700 `-0.02em`) + lime `BETA, PROBABLY` chip (mono 9.5px 700 0.18em, 1.5px ink border, 3px 7px padding). Center links (Space Grotesk 14px 500): Directory, Blog, How it works, FAQ. Right CTA: lime/ink mono 11px 700 0.16em `SCAN A URL ↓` button with 2px ink border + 3px hard ink shadow.

### 6. Overlap triptych
Standard card head: coral `§ overlap` badge + `where they fight, where they don't.` H3. Right side gives a one-line description.

3 equal columns separated by 2.5px ink, each `padding: 18px 22px 22px`, min-height 184px.
- **Col head** (flex space-between):
  - Title: mono 10.5px 700 0.18em uppercase, format `only <product> · <count>` or `shared · <count>`.
  - **Count badge**: Space Grotesk 28px 700 `-0.03em` numeral on a colored block (`padding: 4px 10px 5px`, `box-shadow: 3px 3px 0 0 --ink`). Variants:
    - `coral` (only-left): coral bg / ink text
    - `lime` (shared): lime bg / ink text
    - `zero` (empty): paper bg / `--muted-2` text + `--muted-2` border + 3px muted-2 shadow
- **Tag list** (flex wrap, gap 6px):
  - Base tag: mono 11px 500, `padding: 3px 8px`, `border: 1.5px solid --ink`, paper bg, ink text, `line-height: 1.4`.
  - **Solid variants**: `solid-coral` (the first tag in only-A column), `solid-lime` (the first tag in shared), `solid-ink` (when used). One solid tag per column maximum — anchors the eye.
  - `muted` variant for placeholder text like `— nothing exclusive —`.
- **Empty line** (when count is 0): mono 12px `--muted-2`, prefixed by an ink `_` cursor (`--ink` 700 `blink` class).
- The middle (`shared`) column has `--cream` background to differentiate.

### 7. Stack triptych
Same pattern as Overlap with stack data: usually most cells have very small counts (0/1/1). Use `coral` / `lime` / `zero` count variants the same way.

### 8. Cost + time (floor)
Card head: `§ floor` badge + `cost + time, side by side.` H3 + `how we estimate ↗`.

Two-column "quad" body (2.5px ink divider between):
- Each quad `padding: 24px 28px 26px`.
- **Quad head**: mono 10.5px 700 0.18em uppercase muted label on the left (`monthly floor`, `time to clone`), `<winner>-ish wins` ink/lime tag on the right (mono, padding 3px 8px).
- **Quad grid** (`grid-template-columns: 1fr 28px 1fr`, items end-aligned, gap 10px):
  - Each side: small mono sublabel (`<product>`), then **big number** Space Grotesk 56px 700 `-0.04em` `line-height: 0.9`. The `lose` side is `--muted-2`, the `win` side is ink.
  - Center arrow: mono 18px ink `→`.
- **Quad foot** (margin-top 18px, dashed 1.5px ink top rule, padding-top 14px):
  - **Delta pill**: lime/ink, 2px ink border, 2px hard shadow, mono 11px 700 0.12em uppercase content (`delta −$54`, `delta −56× faster`).
  - **Narration**: Space Grotesk 13.5px `--muted`, regular case (this is the only place we drop the all-mono uppercase rhythm — it's intentional, as a "human voice" callback).

### 9. Verdict band
Full-width ink slab, 2.5px ink border, 6px hard shadow.
- Padding `22px 28px`, grid `auto 1fr auto`, gap 24px, items center.
- **`THE VERDICT` label**: lime/ink mono 11px 700 0.18em uppercase, `padding: 5px 10px`, `align-self: start`.
- **`vline`**: Space Grotesk 22px 500 `-0.01em`, line-height 1.3, paper text. Wrap the punch phrase in `<em>` (non-italic, lime, 700) — e.g. `<em>build the calendar app this weekend.</em>`.
- **CTA**: lime/lime mono 11px 700 0.18em uppercase button with 3px hard shadow (using `#000` for the shadow on the dark band so it remains visible). Hover: paper bg.

### 10. Footer
- **Links row**: mono 11px 700 0.16em uppercase, ink with 2px ink underlines, gap 22px between links. Hover swap to `--coral`.
- **Footer rail**: top `1.5px solid --ink`, padding-top 18px, mono 11px 500 0.18em uppercase muted, flex space-between (left product crumb, right `scan #N · v1.2`).

---

## Design tokens

```css
/* Color */
--ink:        #0a0a0a;   /* borders, primary text, dark slabs */
--bg:         #ece9dc;   /* page background (warm cream, slightly darker) */
--cream:      #f4f1e8;   /* card-head bg, axis-label bg, bar tracks */
--paper:      #ffffff;   /* card surface */
--paper-alt:  #fafaf5;   /* second product side, second-quad alt */
--lime:       #c6ff00;   /* primary accent, CTA bg, chips on ink */
--coral:      #ff6b4a;   /* second accent, leading axis bars, hover state */
--pink:       #ff3366;   /* "fortress" tier (score >= 7) bar fill */
--green:      #22c55e;   /* high-buildability score color (>= 70) */
--yellow:     #eab308;   /* mid-tier score color (40–69) */
--muted:      #666666;   /* secondary text */
--muted-2:    #999999;   /* tertiary text, zero scores */
--hairline:   #e7e3d3;   /* inner row dividers (axis rows) */

/* Type */
--display: "Space Grotesk", system-ui, sans-serif;
--mono:    "JetBrains Mono", ui-monospace, monospace;

/* Geometry */
--card-border:   2.5px solid var(--ink);
--card-shadow:   6px 6px 0 0 var(--ink);
--inner-border:  2px solid var(--ink);   /* tier stamps, count badges */
--inner-shadow:  3px 3px 0 0 var(--ink);
--bar-border:    2px solid var(--ink);   /* score/aggregate bars */
--axis-bar-border: 2px solid var(--ink); /* per-axis bars (14px tall) */

/* Type scale used on this page */
/* H1 page title:    64 / 0.96 / -0.035em / 700 */
/* product name:     56 / 0.95 / -0.04em  / 700 */
/* score number:     96 / 0.85 / -0.06em  / 700 */
/* aggregate num:    46 / 1    / -0.04em  / 700 */
/* delta number:     38 / 1    / -0.03em  / 700 */
/* count badge:      28 / 1    / -0.03em  / 700 */
/* big floor num:    56 / 0.9  / -0.04em  / 700 */
/* H3 (card title):  26 / 1    / -0.02em  / 700 */
/* axis num:         22 / 1    / -0.03em  / 700 */
/* verdict line:     22 / 1.3  / -0.01em  / 500 */
/* score suffix:     22 /      / -0.03em  / 500, opacity 0.5 */
/* product tag:      15 /      /          / 500, --muted */
/* mono caption:     10.5–11 / / 0.16–0.18em / 700, uppercase */
/* tag (mono):       11 /      /           / 500 */
/* narration:        13.5 /    /           / 400, --muted, sentence case */
```

### Card-head pattern
Reused on every section:
- Flex row, space-between, items center.
- `padding: 14px 24px`, `background: --cream`, `border-bottom: 2.5px solid --ink`.
- Left cluster: ink/lime mono badge (e.g. `§ moat`, padding 4px 9px, mono 10.5px 700 0.18em uppercase) + H3 heading (Space Grotesk 26px 700 `-0.02em`).
- Right cluster: mono caption(s) and ink-underlined link (`a { border-bottom: 2px solid --ink; padding-bottom: 1px; }`, hover: coral).
- Available badge variants: default (ink/lime), `coral` (coral/ink), `lime` (lime/ink).

### Severity → color mapping (moat axes)
```
>= 7    → fortress  → --pink
>= 4 (lead)         → --coral
>= 4    → meaningful → --ink
>= 1    → shallow   → #888 (muted)
< 1     → none      → #d8d4c4 (faint)
```
Use `--coral` only on the row's leading side when the lead is `>= 4` and the trailing side is materially behind. Otherwise use the standard ink/muted mapping. Pink trumps coral.

### Severity → color mapping (overall buildability score)
```
>= 70  → --green   (WEEKEND tier)
40–69  → --yellow  (MONTH tier)
< 40   → --pink    (DON'T tier)
```

---

## Data shape

```ts
type ScanReport = {
  slug: string;                 // "notion-ish"
  domain: string;               // "notion-ish.com"
  name: string;                 // "notion-ish.com" (display)
  tag: string;                  // one-line product description, lowercase, sentence-cased
  tier: 'WEEKEND' | 'MONTH' | "DON'T";
  score: number;                // 0..100
  cloneTime: string;            // "18 hours" | "6 weeks"
  monthlyFloor: number;         // dollars; we'll format as $N
  reportHref: string;
  // moat
  moat: {
    aggregate: number;          // 0..10, one decimal
    severityWord: string;       // "shallow ditch", "deep moat", etc
    axes: { key: 'capital'|'technical'|'network'|'switching'|'data'|'regulatory'; score: number; }[];
  };
  // surfaces
  features: string[];           // lowercased feature tags
  stack:    string[];           // lowercased dependency tags
};

type Comparison = {
  scanIndex: number;            // for the top rail "scan #N"
  left: ScanReport;
  right: ScanReport;

  // derived (compute these on the server or in a useMemo):
  scoreDelta: number;           // right.score - left.score (sign drives "→ <winner>")
  moatDelta:  number;           // right.moat.aggregate - left.moat.aggregate
  axisDeltas: number[];         // length 6, right - left
  features: { onlyLeft: string[]; shared: string[]; onlyRight: string[]; };
  stack:    { onlyLeft: string[]; shared: string[]; onlyRight: string[]; };
  costDelta: number;            // right.monthlyFloor - left.monthlyFloor
  timeWinner: 'left' | 'right' | 'tie';
  costWinner: 'left' | 'right' | 'tie';
  scoreWinner: 'left' | 'right' | 'tie';
  verdict: { eyebrow: string; line: string; punch: string; ctaLabel: string; ctaHref: string; };
};
```

Number formatting:
- Scores `n.toFixed(1)` for moat axes (so `0` → `0.0`, `4` → `4.0`).
- Buildability scores are integers (`48`, `84`).
- Cost: `$<n>` with no decimals at this scale.

---

## Interactions & behavior
The prototype is static; for production:
- All breadcrumb links navigate to their canonical routes.
- The `full report ↗` and `read the full reports →` links navigate to each side's individual scan report (`/scan/<slug>`).
- `methodology →` opens the methodology page or anchors into it.
- The `compare` URL pattern is `/compare/<left-slug>/<right-slug>` — make it order-insensitive (canonicalize so `/compare/calendly-ish/notion-ish` redirects to the alphabetical pair).
- Hover state on any link inside an ink-underline border: swap text and border to `--coral`.
- The CTA button (`scan a URL ↓`) opens the global scan modal — same component as the rest of the site.

## Responsive behavior
The design targets ≥ 1200px. Below that:
- **< 880px**: collapse `.h2h-grid`, `.moat-summary`, `.axis-row`, `.triptych`, and `.floor` to a single column. Hide `.h2h-vs`. Drop the H1 to 40px.
- Between 880 and 1200, the three-column triptychs can stay 3-up if width allows; otherwise collapse to 1-up. Floor stays 2-up down to ~720, then 1-up.
- The aggregate strip's center delta column should pin to 130px; below 880 stack instead.

## Assets
- `logo-s.png` — site brand mark, displayed at 30×30 inside the inline site nav.
- No icons elsewhere — arrows are Unicode characters (`→ ← ↑ ↓ ↗`).

## Fonts
Both Google Fonts (Open Font License). Weights actually used:
- **Space Grotesk** — 500, 700
- **JetBrains Mono** — 400, 500, 700

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet" />
```

If your codebase self-hosts fonts, use those instead.

## Implementation notes
- **Hard offset shadows are part of the brand.** Never soften with blur. The card shadow is `6px 6px 0 0 ink`, the inner-element shadow is `3px 3px 0 0 ink`.
- **Borders at 2.5px** for cards/dividers, 2px for inner elements (tier stamps, bars, count badges), 1.5px for tag outlines and inner hairlines. If your platform rounds to integers, prefer 3 / 2 / 1 over 2 / 2 / 1 — keep the visual hierarchy.
- **Lowercase + period style is intentional**: `how deep is each moat.`, `cost + time, side by side.`, `the verdict`. Keep it.
- **Mono uppercase 0.16–0.18em letter-spacing** is the brand's small-text rhythm — reuse it for all eyebrows, badges, and chips.
- **No emoji, no icons.** Use Unicode arrows (`→ ↑ ↗`) and the literal `§` for section badges.
- **The two product sides are ASYMMETRIC by background** (`--paper` vs `--paper-alt`). This is the only place that distinction is used on the page; don't carry it elsewhere.
- **Mirror bars** in the moat axis rows by `transform: scaleX(-1)` rather than re-implementing a right-anchored fill — keeps the bar component reusable.
- **Severity colors apply per-row, not globally.** A 5.1 on the left side renders ink (it's the row's lead but not above the coral threshold of "lead AND ≥ 4"); the same 5.1 on the right side of a row where the left has 8.0 also renders ink, just plain.

## Files in this folder
- `comparison-page.html` — the source design, fully self-contained (one file, inline CSS).
- `logo-s.png` — the brand mark.
