# Handoff: Moat Section — v1 (typographic hero)

## Overview
This is the **"how deep is the moat"** section of a Saaspocalypse scan report. It scores a SaaS product across six moat axes (capital, technical, network, switching, data, regulatory), each on a 0–10 scale, and rolls them up into a single aggregate score. The section's job is to make the aggregate score feel *visceral* — not a row in a table — while keeping the six underlying axes scannable.

## About the design files
The files in this bundle are **design references created in HTML/JSX** — a working prototype showing the intended look and behavior. They are **not production code to copy directly**.

Your task is to **recreate this design in the target codebase's existing environment** (React, Vue, Svelte, SwiftUI, native, etc.) using its established patterns, primitives, and design tokens. If no environment exists yet, choose the framework most appropriate for the project. Pixel-match the visuals; do not ship the HTML as-is.

## Fidelity
**High-fidelity (hifi).** All colors, typography, spacing, borders, and layout in the prototype are final. Match them.

## Files in this folder
- `README.md` — this file
- `moat-section-v1-preview.html` — open this in a browser to see the rendered design
- `moat-section-v1-source.jsx` — the React source for the component, fully self-contained

---

## Layout

The section is a single bordered card on a cream page background. The card is composed of three horizontal regions, stacked top-to-bottom, separated by full-width 2.5px ink dividers:

1. **Header strip** (auto height ≈ 50px)
2. **Hero score row** (~ 220px tall)
3. **Axes grid** — 2 columns × 3 rows of axis cells

Outer page padding: `36px` on all sides. Card has a 2.5px ink border and a hard `6px 6px 0 0` ink drop-shadow (offset, no blur).

```
┌───────────────────────────────────────────────────────────┐  ← cream page bg
│  ┌─────────────────────────────────────────────────────┐  │
│  │ § 04   how deep is the moat.        methodology →   │  │  header
│  ├─────────────────────────────────────────────────────┤  │
│  │              AGGREGATE SCORE · SHALLOW              │  │
│  │  3.0 /10    weighted average of the six axes …      │  │  hero row
│  │             [██████░░░░░░░░░░░░░░░] shallow ditch   │  │
│  ├──────────────────────────┬──────────────────────────┤  │
│  │ CAPITAL          4.0/10  │ TECHNICAL        4.7/10  │  │
│  │ ████████░░░░░░░░░░░░░░░  │ █████████░░░░░░░░░░░░░░  │  │  axes grid
│  │ what it costs to keep…   │ depth of the underlying… │  │
│  ├──────────────────────────┼──────────────────────────┤  │
│  │ NETWORK          0.0/10  │ SWITCHING        4.0/10  │  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░  │ ████████░░░░░░░░░░░░░░░  │  │
│  │ users compound users     │ stickiness of customer…  │  │
│  ├──────────────────────────┼──────────────────────────┤  │
│  │ DATA             0.0/10  │ REGULATORY       0.0/10  │  │
│  │ ░░░░░░░░░░░░░░░░░░░░░░░  │ ░░░░░░░░░░░░░░░░░░░░░░░  │  │
│  │ proprietary data …       │ real licenses + compl…   │  │
│  └──────────────────────────┴──────────────────────────┘  │
└───────────────────────────────────────────────────────────┘
```

---

## Components & specs

### Outer card
- `background: #ffffff` (paper)
- `border: 2.5px solid #0a0a0a`
- `box-shadow: 6px 6px 0 0 #0a0a0a` (no blur — hard offset shadow)
- Surrounding page background `#f4f1e8` (cream), padding `36px`

### Header strip
- `display: flex; justify-content: space-between; align-items: center`
- `padding: 14px 24px`
- `background: #f4f1e8` (cream)
- `border-bottom: 2.5px solid #0a0a0a`

**Left cluster** (gap 14px, baseline-aligned):
- Section badge `§ 04`:
  - Background `#0a0a0a` (ink), text `#c6ff00` (lime)
  - `padding: 3px 9px`
  - JetBrains Mono, 11px, 700, `letter-spacing: 0.15em`
- Heading `how deep is the moat.`:
  - Space Grotesk, 28px, 700, `letter-spacing: -0.02em`
  - Color `#0a0a0a`
  - Note the trailing period — it's part of the brand voice; keep it lowercase

**Right side** — methodology link:
- JetBrains Mono, 11px, 700, uppercase, `letter-spacing: 0.15em`
- `color: #0a0a0a`, `text-decoration: none`
- Underline rendered as `border-bottom: 2px solid #0a0a0a; padding-bottom: 1px` (not text-decoration)
- Trailing right arrow `→`

### Hero score row
- `display: grid; grid-template-columns: auto 1fr; gap: 28px`
- `padding: 36px 28px 28px`
- `border-bottom: 2.5px solid #0a0a0a`
- `align-items: end` (so the description bottom-aligns with the giant numeral baseline)

**Big aggregate score** (left column, baseline-aligned flex row, gap 4px):
- Number `3.0` — Space Grotesk, **200px**, 700, `line-height: 0.78`, `letter-spacing: -0.06em`, color ink
- `/10` suffix — Space Grotesk, 56px, 500, `opacity: 0.35`, `letter-spacing: -0.04em`

**Right column** (`padding-bottom: 14px` to bottom-align):
- Mono caption: `aggregate score · shallow` — JetBrains Mono, 11px, 700, uppercase, `letter-spacing: 0.18em`, color `#666`. The word after the dot comes from the severity map (see "Severity logic" below) and tracks the aggregate score live.
- Blurb paragraph — Space Grotesk, 22px, 500, `line-height: 1.25`, `letter-spacing: -0.01em`, `text-wrap: balance`, `max-width: 560px`, `margin-top: 12px`. Color ink. Copy: `"weighted average of the six axes below. higher = harder for an indie hacker to displace."`
- Aggregate bar (margin-top 18px, flex row, gap 10px, vertically centered):
  - Track: `flex: 1; height: 14px; background: #eee; border: 2px solid #0a0a0a; position: relative`
  - Fill: `position: absolute; inset: 0; width: ${score * 10}%; background: #0a0a0a` (i.e. 30% wide for a 3.0)
  - Trailing label `shallow ditch` — JetBrains Mono, 11px, uppercase, `letter-spacing: 0.1em`, color `#666`, no-wrap. This is a hardcoded verdict string for *aggregate* (see notes).

### Axes grid
- `display: grid; grid-template-columns: 1fr 1fr` (no gap — cells share borders)

**Each axis cell:**
- `padding: 18px 22px`
- `border-right: 2.5px solid #0a0a0a` on left-column cells, none on right-column cells
- `border-bottom: 2.5px solid #0a0a0a` except on the last row
- `background: #f4f1e8` (cream) when score is exactly 0, else `#ffffff` (paper). The cream bg makes zero-score axes recede.

**Cell content** (top to bottom):
1. Top row — flex `space-between`, baseline-aligned, gap 12px:
   - Axis name (uppercased via the `MoatLabel`): JetBrains Mono, 11px, 700, `letter-spacing: 0.18em`, `text-transform: uppercase`, color ink
   - Score `4.0/10`: Space Grotesk **30px** for the digits (700, `letter-spacing: -0.03em`, `line-height: 1`, color ink — or `#999` when the score is 0), followed by Space Grotesk 14px `/10` at `opacity: 0.4`
2. Bar (`margin-top: 10px`):
   - Track: `height: 8px; background: #eee; border: 1.5px solid #0a0a0a; position: relative`
   - Fill: `position: absolute; inset: 0; width: ${score * 10}%; background: ${severity.bar}`
3. Subtitle (`margin-top: 10px`):
   - JetBrains Mono, 12px, color `#555`. Sentence case. Examples: `"what it costs to keep the lights on"`.

---

## Severity logic
A small pure helper maps a numeric score → `{ label, bar }`:

| Score range | label        | bar color        |
| ----------- | ------------ | ---------------- |
| `>= 7`      | `fortress`   | `#ff3366` (pink) |
| `>= 4`      | `meaningful` | `#0a0a0a` (ink)  |
| `>= 1`      | `shallow`    | `#666666`        |
| `< 1`       | `none`       | `#999999`        |

The aggregate score's mono caption shows `aggregate score · ${label}`. Each axis's bar fill uses `bar`. The trailing `"shallow ditch"` label next to the aggregate bar is *separate* hardcoded copy in this prototype — for production, derive it from severity (or product copy) rather than hardcoding.

---

## Interactions & behavior
The prototype is static. For implementation:
- The `methodology →` link should navigate to a methodology page/anchor.
- No hover/active treatments are specified; if your design system has standard link-hover behavior (e.g. shift the bottom border to coral, or a subtle translation), follow it.
- The component is purely presentational. No internal state.

## Responsive behavior
The prototype is fixed-width (designed against ~1080px). For production:
- Below ~720px, collapse the axes grid to a single column.
- The hero score row should remain horizontal as long as the giant numeral fits next to a ~280px copy column; below that, stack the numeral above the copy.
- The header strip can stay as-is on mobile but reduce heading size to ~22px.

---

## Design tokens

```css
/* Colors */
--ink:    #0a0a0a;   /* primary text, borders, shadows, "meaningful" bar */
--cream:  #f4f1e8;   /* page bg, header bg, zero-score cell bg */
--paper:  #ffffff;   /* card bg, non-zero cell bg */
--lime:   #c6ff00;   /* badge text on ink */
--coral:  #ff6b4a;   /* reserved brand accent (not used in v1) */
--pink:   #ff3366;   /* "fortress" bar color (>= 7) */
--muted-track: #eee; /* bar track */
--muted-1: #555;     /* axis subtitle */
--muted-2: #666;     /* mono caption */
--muted-3: #999;     /* zero-score score number */

/* Typography */
--font-display: "Space Grotesk", system-ui, sans-serif;
--font-mono:    "JetBrains Mono", ui-monospace, monospace;

/* Type scale used in this section */
/* hero numeral:    200 / 0.78 / -0.06em / 700 */
/* /10 suffix:      56  / 1    / -0.04em / 500, opacity .35 */
/* heading h2:      28  / 1    / -0.02em / 700 */
/* axis numeral:    30  / 1    / -0.03em / 700 */
/* axis /10:        14  /      /         / 500, opacity .4 */
/* blurb body:      22  / 1.25 / -0.01em / 500 */
/* mono caption:    11  /      /  0.18em / 700, uppercase */
/* mono link:       11  /      /  0.15em / 700, uppercase */
/* subtitle (mono): 12  /      /         / 400, color #555 */
/* mono trailing:   11  /      /  0.10em / 400, uppercase */

/* Spacing & geometry */
--page-padding: 36px;
--card-border:  2.5px solid var(--ink);
--cell-border:  1.5px solid var(--ink); /* the inner bar's border */
--card-shadow:  6px 6px 0 0 var(--ink);
--header-pad:   14px 24px;
--hero-pad:     36px 28px 28px;
--cell-pad:     18px 22px;
--bar-h-hero:   14px;
--bar-h-axis:   8px;
```

## Assets
None — no images or icons. The arrow `→` is a literal Unicode character.

## Fonts
Both fonts are Google Fonts. Load with the weights actually used:
- **Space Grotesk** — 500, 700
- **JetBrains Mono** — 400, 700

```html
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet" />
```

If your codebase self-hosts fonts, use those instead. Both are Open Font License.

## Data shape
The component reads a single `moat` object. Match this shape exactly:

```ts
type MoatScore = {
  aggregate: number;          // 0..10, one decimal (e.g. 3.0)
  blurb: string;              // sentence shown next to hero number
  axes: {
    key: string;              // lowercase single word, e.g. 'capital'
    score: number;            // 0..10, one decimal
    sub: string;              // lowercase one-line description
  }[];                        // exactly 6 items, in the order shown above
};
```

The component formats numbers as `n.toFixed(1)` everywhere — so `4` renders as `4.0` and `0` renders as `0.0`. Replicate that.

## Implementation notes
- **Hard offset shadows are part of the brand.** Do not soften them with blur.
- **Borders are 2.5px**, not 2 or 3. If your codebase rounds to integer pixels, prefer 2px on the inner bar borders and 3px on the card/dividers rather than 2/2 or 3/3 — keeping the visual hierarchy of "card border > inner bar border" matters more than the exact value.
- **No emoji, no icons.** Brand voice avoids both.
- **Lowercase copy throughout the heading and subtitles** is intentional — preserve the sentence's lowercase + period style (`how deep is the moat.`).
- **Mono uppercase labels** with wide letter-spacing (0.15–0.18em) are the brand's small-text rhythm. Reuse them anywhere a small descriptive label is needed.
