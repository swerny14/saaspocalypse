# Handoff: Saaspocalypse — Scan Directory (Layout A · "Filing Cabinet")

## Overview

This is the **directory / archive page** for Saaspocalypse — a tongue-in-cheek site that "scans" SaaS products and tells indie hackers whether they should build a clone themselves or just pay for the real thing. Each scan produces a verdict (WEEKEND / A MONTH / A QUARTER / DON'T) and a buildability score (0–100).

The directory is where users browse, search, and filter every scan that's been published. **Layout A** is the "filing cabinet" treatment: a sticky left sidebar of facet filters next to a 2-up grid of scan cards, with a fat top search bar and pagination at the bottom.

## About the Design Files

The files in this bundle are **design references created in HTML/JSX** — prototypes showing the intended look and behavior, not production code to ship as-is. They render inside a custom `<DesignCanvas>` shell that's specific to this design tool and should not be carried over.

Your job is to **recreate this layout in the target codebase's existing environment**. If the project already has React + Tailwind / CSS-in-JS / vanilla CSS conventions, use those. If no codebase exists yet, pick a stack appropriate for the project (Next.js + Tailwind is a sensible default) and implement there. Lift the visual tokens, structural decisions, copy, and behavior from this handoff — not the JSX literally.

## Fidelity

**High-fidelity.** Colors, typography, spacing, border weights, and shadow offsets are all final. Recreate pixel-perfectly. The neo-brutalist aesthetic is intentional and consistent across the rest of the Saaspocalypse site (hero, blog, verdict reports) — keep the same tokens.

---

## Page: Scan Directory (Layout A)

**Purpose:** Let users browse all scans on file, narrow down by verdict / score / category / build-time / author, and click into individual verdict reports.

### Page Layout

- **Outer background:** `#f4f1e8` (cream paper)
- **Top nav bar:** full width, white background, 2.5px ink bottom border, 14px / 32px padding
- **Content area:** centered, `max-width: 1280px`, `padding: 36px 32px 56px`
- **Below nav, the page is a vertical stack:**
  1. Masthead block (headline + tagline)
  2. Big search bar
  3. Two-column body: 240px sidebar + flexible results column
  4. Pagination row

### Top Nav

- Background: white (`#fff`), border-bottom: `2.5px solid #0a0a0a`
- Left side:
  - Logo chip: `saaspocalypse` — black background, lime (`#c6ff00`) text, padding `3px 10px`, Space Grotesk 700, 18px, letter-spacing `0.05em`
  - Section label after the chip: `/ the directory` — JetBrains Mono, 11px, opacity 0.5, letter-spacing `0.1em`, uppercase
- Right side: nav links (`scan` / `archive` / `blog` / `about`) — JetBrains Mono 700, 12px, uppercase, letter-spacing `0.08em`, gap 22px. The active one (`archive`) has a 2px solid bottom border with 2px padding-bottom.

### Masthead

- 2.5px ink bottom border, padding-bottom 24px, margin-bottom 28px
- Eyebrow line above headline: JetBrains Mono 700, 11px, opacity 0.6, letter-spacing `0.2em`, uppercase. Text: `▸ the archive · 18 scans on file · updated daily`
- Headline + side blurb arranged horizontally, `justify-content: space-between`, `align-items: flex-end`, `gap: 32px`, wraps on narrow widths.
- **Headline:** Space Grotesk 700, **88px**, letter-spacing `-0.045em`, line-height 0.92, margin 0. Two lines:
  - Line 1: `every saas we [roasted],`
  - Line 2: `now sortable.`
  - The word **roasted** is wrapped in an inline span with `background: #0a0a0a; color: #c6ff00; padding: 0 14px; transform: rotate(-1.5deg); display: inline-block;` — a chunky angled lime-on-black sticker.
- **Side blurb (right):** Space Grotesk 400, 16px, line-height 1.5, opacity 0.75, max-width 360px. Copy: *"Every scan we've run, filed by buildability. Find one before you accidentally spend $144/year on a CRUD app."*

### Search Bar

A single horizontal block, 2.5px ink border, white background, with a hard `6px 6px 0 0 #0a0a0a` shadow. Three columns via grid (`1fr auto auto`):

1. **Input column** (flex):
   - Left icon: `▸` — JetBrains Mono 700, 14px, opacity 0.4
   - Input: placeholder `search scans — try 'notion', 'analytics', 'don't build'…`
   - Input typography: Space Grotesk 500, 22px, letter-spacing `-0.01em`
   - Padding: `20px 0` vertical, container has `0 22px` horizontal
   - Trailing blinking cursor: `_` JetBrains Mono 700, 18px, animated via `@keyframes blink { 0%,49% { opacity: 1; } 50%,100% { opacity: 0; } }` — 1s step-end infinite
2. **Sort column:** 2.5px ink left border, padding `0 18px`. JetBrains Mono 700, 11px, uppercase, letter-spacing `0.1em`. Two pieces with 8px gap: `sort:` (opacity 0.5) and `newest ▾` with a 2px ink bottom border.
3. **Search button:** background `#0a0a0a`, color `#c6ff00`, Space Grotesk 700, 16px, letter-spacing `-0.01em`, padding `0 28px`. Label: `→ search`.

Margin-bottom: 32px.

### Body Grid

CSS Grid: `grid-template-columns: 240px 1fr; gap: 28px; align-items: flex-start`.

#### Sidebar (240px, `position: sticky; top: 20px`)

A vertical stack of 5 filter groups separated by 2.5px ink horizontal rules, plus a reset button at the bottom.

**Each `FilterGroup`:**
- Top border: `2.5px solid #0a0a0a` (the last group also has a bottom border)
- Padding: `14px 0 18px`
- Group title: JetBrains Mono 700, 11px, uppercase, letter-spacing `0.18em`, margin-bottom 12px. Prefixed with `▸ `.

**Filter group 1 — `▸ by verdict`:**
- Vertical list of `FilterRow`s, gap 8px.
- Each row: `display: flex; justify-content: space-between; padding: 5px 8px; font: JetBrains Mono 700 12px; letter-spacing 0.05em; uppercase`.
- Active row (`all`) has `background: #0a0a0a; color: #c6ff00; border: 1.5px solid #0a0a0a`.
- Other rows have a 12×12 color swatch on the left (matching the verdict's badge color) with a 1.5px ink border, then the label, then a count number on the right (opacity 0.5).
- Rows: `all 18`, `weekend 5` (swatch `#b6f24a`), `a month 6` (`#ffd84d`), `a quarter 4` (`#ffa066`), `don't 3` (`#0a0a0a`).

**Filter group 2 — `▸ score range`:**
- Range track: 36px tall, 2px ink border, white background. A lime-filled inner band sits from `left: 20%` to `right: 15%` with 2px ink left/right borders to give it a chunky brutalist feel.
- Endpoints `0` and `100` rendered absolutely inside the track at `left: 8px` / `right: 8px`, `top: 9px`, JetBrains Mono 700, 11px.
- Beneath the track, a `min: 20` / `max: 85` row in JetBrains Mono 11px, opacity 0.6.

**Filter group 3 — `▸ category`:**
- Wrap row of small chips, gap 6px.
- Each chip: JetBrains Mono 700, 11px, padding `4px 9px`, 1.5px ink border, white background, letter-spacing `0.04em`. The second chip (`devtools` in the demo) is highlighted with `background: #c6ff00`.
- Categories: `analytics, automation, design, devtools, fintech, forms, marketing, nocode, productivity, publishing, support, video`.

**Filter group 4 — `▸ time to build`:**
- Vertical stack of checkbox rows, gap 6px, JetBrains Mono 12px.
- Each row: 14×14 checkbox (2px ink border) followed by 10px gap and label.
- Checked state: black-filled box with a lime `✓` (Space Grotesk-ish, 14px, 700) absolutely positioned at top -2 / left 1.
- Options: `< 1 day` (checked), `1–7 days` (checked), `1–4 weeks`, `1+ months`, `forever`.

**Filter group 5 — `▸ by author`** (last, has bottom border):
- Vertical stack of rows, gap 6px, JetBrains Mono 12px.
- Each row: `@mara` left-aligned, count right-aligned (opacity 0.5).
- Demo authors: `mara 5`, `jules 7`, `rin 5`.

**Reset button (under last group, margin-top 18px):**
- Full-width, `padding: 10px 0`, 2px ink border, white background, JetBrains Mono 700 11px, uppercase, letter-spacing `0.15em`. Label: `↻ reset filters`.

#### Results column

**Result meta row** (margin-bottom 18px, JetBrains Mono 700 11px uppercase letter-spacing 0.1em):
- Left: `showing 12 of 18 · 4 filters active` (opacity 0.7)
- Right: view-mode toggle — a 2px ink bordered group with two cells. `⊞ grid` is active (`#0a0a0a` bg, lime fg, padding `6px 12px`). `≡ list` is inactive (transparent bg, padding `6px 12px`).

**Card grid:** `grid-template-columns: repeat(2, 1fr); gap: 16px;`. 12 cards on first page.

**`DirCardA` component** (each card):
- Outer: 2.5px ink border, white background, `min-height: 220px`, flex column.
- **Top color stripe:** 8px tall, background = the verdict's badge color, 2.5px ink bottom border. (Lime, yellow, orange, or black depending on tier.)
- **Inner body:** padding `18px 20px 16px`, flex column, fills remaining height.
  - **Top meta row** (margin-bottom 10px): JetBrains Mono 700, 10px, uppercase, letter-spacing `0.15em`, opacity 0.65, space-between. Left: `scan № 001` (zero-padded 3-digit index). Right: scan date `2026.04.24`.
  - **Domain name:** Space Grotesk 700, 22px, letter-spacing `-0.02em`, margin-bottom 4px. e.g. `notion-ish.com`.
  - **Tagline:** Space Grotesk 400, 13px, opacity 0.7, margin-bottom 14px, `text-wrap: pretty`. e.g. `block-based docs + database`.
  - **Tier + Score row** (margin-bottom 12px, flex space-between):
    - **TierBadge:** JetBrains Mono 700, 11px, padding `4px 10px`, letter-spacing `0.12em`, 2px ink border. Background and foreground per tier (see Design Tokens).
    - **ScoreBar:** 10 segments. Outer: 1.5px ink border, white bg, 2px padding, width 120px. Inside: 10 equal-flex bars, height 10px, gap 2px. Filled segments are solid `#0a0a0a`, empty are transparent. Followed by a numeric score (JetBrains Mono 700, 12px, min-width 28px). E.g. score 78 → 8 filled, 2 empty.
  - **Foot meta row** (margin-top auto, top border `1.5px dashed #0a0a0a`, padding-top 10px): JetBrains Mono 700, 11px, letter-spacing `0.05em`, three pieces separated by `·` (opacity 0.4 dots). Pieces (opacity 0.7): `≈ 14h build` (or `≈ 2d`, `≈ 6w`, `≈ ∞`), `@mara`, `4,821 👁` (with thousands separator).

Build-time formatting:
- `>= 99999` → `∞`
- `< 24` → `${h}h`
- `< 168` → `${Math.round(h/24)}d`
- otherwise → `${Math.round(h/168)}w`

#### Pagination

Centered row at bottom of results column, margin-top 36px, gap 6px, JetBrains Mono 700, 12px.

Each `PageBtn`: padding `7px 14px`, 2px ink border, uppercase, letter-spacing `0.1em`. Active (`1`) is `#0a0a0a` bg with `#c6ff00` text; inactive are white bg with ink text.

Buttons in order: `← prev`, `1` (active), `2`, `3`, `next →`.

---

## Interactions & Behavior

- **Search input:** debounced text filter across `name`, `tagline`, `category`. Update results live; keep the blinking cursor present at idle.
- **Sort dropdown:** options `newest`, `oldest`, `score ↑`, `score ↓`, `quickest build`, `most popular`. Default: `newest`. The `▾` triangle indicates clickable.
- **Search button (`→ search`):** submits the current query; on hover, invert to lime bg / ink fg.
- **Sidebar facet rows (`by verdict`, `by author`):** clicking toggles that filter. Active style is the inverted black-on-lime row. Multiple rows can be active at once except for `all`, which clears its sibling filters.
- **Score-range slider:** dual-handle. Drag handles to update min/max readout. Track is `0` to `100`, step `1`.
- **Category chips:** click toggles inclusion. Active chip uses lime background, ink border. Multi-select.
- **Build-time checkboxes:** standard multi-select. Checked = black box + lime check.
- **Reset filters:** clears all filter state, resets sort to `newest`, leaves search query intact.
- **Result count + filter count** in the meta row updates live as filters change. View-mode toggle (grid / list) switches between the 2-up card grid (Layout A) and a denser row layout (Layout B is in `directory-layouts.jsx` for reference, but **out of scope** for this handoff).
- **Cards:** entire card is clickable → navigates to `/scan/<id>` (the verdict report page). On hover, translate the card up 2px and offset a 3px hard shadow (`3px 3px 0 0 #0a0a0a`) for the brutalist lift. No other state changes.
- **Pagination:** standard. Active page is inverted. Disable `← prev` on page 1 and `next →` on the final page (use 0.4 opacity).
- **Sticky sidebar:** stays in place while results scroll. Don't make the sidebar itself scroll; it's short enough.

### Empty / Loading states

- **Empty results** (no scans match): replace the card grid with a 2.5px ink border block, white bg, padding 40px, centered. Headline (Space Grotesk 700, 28px): *"no scans match. weird flex."* Subline (Space Grotesk 400, 15px, opacity 0.7): *"loosen a filter or try a different search."* Button (Space Grotesk 700, 14px, ink bg, lime fg, padding `10px 18px`): `↻ clear filters`.
- **Loading:** swap each card with a skeleton — same outer dimensions, the color stripe shows in the active filter color, body content replaced with three pulsing 2px ink-border bars at 60% / 90% / 40% widths.

---

## State Management

```ts
type Tier = 'WEEKEND' | 'MONTH' | 'QUARTER' | "DON'T";

type Scan = {
  id: string;
  name: string;          // 'notion-ish.com'
  tagline: string;
  tier: Tier;
  score: number;         // 0-100
  scannedAt: string;     // 'YYYY.MM.DD'
  author: string;        // username, no @
  hours: number;         // 99999 = forever
  pop: number;           // view count
  category: string;      // single category slug
};

type DirectoryFilters = {
  query: string;
  tiers: Set<Tier>;          // empty = all
  scoreMin: number;          // default 0
  scoreMax: number;          // default 100
  categories: Set<string>;   // empty = all
  buildTimeBuckets: Set<'<1d' | '1-7d' | '1-4w' | '1m+' | 'forever'>;
  authors: Set<string>;
  sort: 'newest' | 'oldest' | 'score-desc' | 'score-asc' | 'quickest' | 'popular';
  page: number;              // 1-indexed
  pageSize: number;          // 12
  view: 'grid' | 'list';
};
```

- Persist filters in the URL query string so directory views are shareable.
- Data fetching: `GET /api/scans?<query>` returns `{ items: Scan[], total: number, facetCounts: {...} }`. Facet counts are computed server-side against the *other* active filters so each facet shows what's available if you toggle it.
- Pre-render the first page server-side; subsequent paginations and filter changes can be client-side fetches.

---

## Design Tokens

### Colors

| Token        | Hex        | Usage |
|--------------|------------|-------|
| `INK`        | `#0a0a0a`  | All borders, text, dark fills |
| `CREAM`      | `#f4f1e8`  | Page background |
| `PAPER`      | `#ffffff`  | Card and surface backgrounds |
| `LIME`       | `#c6ff00`  | Primary accent — active states, CTA text on dark |
| `YELLOW`     | `#ffd84d`  | A MONTH tier badge |
| `CORAL`      | `#ff6b4a`  | Secondary accent (newsletter blocks elsewhere) |
| `PINK`       | `#ff3366`  | Tertiary accent (used in stat block elsewhere) |
| Tier WEEKEND bg | `#b6f24a` | Verdict swatch |
| Tier MONTH bg   | `#ffd84d` | Verdict swatch |
| Tier QUARTER bg | `#ffa066` | Verdict swatch |
| Tier DON'T bg   | `#0a0a0a` | Verdict swatch (fg = `#f4f1e8`) |

### Typography

- **Display / body:** `"Space Grotesk", system-ui, sans-serif` — weights 400, 500, 600, 700
- **Mono (labels, meta, chips):** `"JetBrains Mono", ui-monospace, monospace` — weights 400, 500, 700
- **Serif (used elsewhere on site, not in Layout A):** `"Fraunces", Georgia, serif` — weights 400, 600, 700

Google Fonts: `Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700`.

Type scale used in this layout:
- 88px / -0.045em / 0.92 lh — masthead headline
- 22px / -0.02em — card domain name
- 16px / -0.01em — search button, side blurb
- 22px / -0.01em / 500 — search input text
- 13–15px — body / meta
- 10–12px — mono labels (with 0.05–0.2em letter-spacing, uppercase)

### Borders & Shadows

- Standard ink border: **2.5px solid `#0a0a0a`**
- Thin variants: **2px** (chips, page buttons), **1.5px** (small chips, dashed dividers, score-bar outer)
- Hard offset shadows (no blur):
  - Search bar: `6px 6px 0 0 #0a0a0a`
  - Card hover: `3px 3px 0 0 #0a0a0a` + 2px translate-y
  - (Other site components use `4–8px` offsets — keep increments consistent.)
- **No border-radius anywhere.** Everything is square. This is non-negotiable for the brutalist aesthetic.

### Spacing

Loose 4px scale, but not strict. Common values seen: 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 56.

### Iconography

No icon library. Use Unicode glyphs only: `▸`, `→`, `←`, `↑`, `↓`, `▾`, `↻`, `≈`, `№`, `·`, `✓`, `⊞`, `≡`, `👁`. Keep it terminal-like.

---

## Assets

No image assets, no icon files, no illustrations. Everything is text + CSS. The blinking cursor is a CSS `@keyframes` animation (see `directory.html` `<style>` block).

---

## Files in this Handoff

- `directory.html` — host HTML page that loads React + Babel and mounts the design canvas. Reference only; not for production.
- `directory-layouts.jsx` — both Layout A (`DirectoryA`) and Layout B (`DirectoryB`) live here, plus shared subcomponents (`DirShell`, `TierBadge`, `ScoreBar`, `FilterGroup`, `FilterRow`, `PageBtn`, `DirCardA`, `Chip`, etc.) and the mock dataset (`DIRECTORY_SCANS`). **Layout A is the target for this handoff** — `DirectoryA`, `FilterGroup`, `FilterRow`, `PageBtn`, `DirCardA`, `TierBadge`, `ScoreBar`, `DirShell`. You can ignore `DirectoryB`, `Chip`, `Stat`, `HeaderCell`, `DirRowB`.
- `design-canvas.jsx` — the design-tool wrapper. **Do not port.** It exists only to present the artboards in the prototype.

The mock dataset (`DIRECTORY_SCANS`) is included as a useful reference for shape and tone of copy, but the real implementation should pull from the `/api/scans` endpoint described above.
