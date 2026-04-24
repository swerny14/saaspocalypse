# Handoff: Saaspocalypse — Verdict Report

A fully-designed verdict report card in neo-brutalist style. Shown to users after a SaaS URL is scanned. Presents a buildability verdict across six sections: header → title → score + take → cost breakdown → alternatives → build challenges + stack → CTA.

## Fidelity

**High-fidelity.** Final colors, type scale, spacing, and layout. Implement as-is.

---

## Files in this handoff

- `README.md` — this file. Full spec.
- `verdict-report-preview.html` — self-contained working preview (open in browser). All 4 example verdicts.
- `verdict-report-source.jsx` — the React component source (for reference).
- `verdict-data.schema.md` — shape of the `v` prop + example data.

---

## Design tokens

```css
/* Colors */
--ink:        #0a0a0a;
--cream:      #f4f1e8;   /* page + header-bar bg */
--lime:       #c6ff00;   /* primary accent + WEEKEND tier + CTA */
--yellow:     #ffd84d;   /* MONTH tier */
--coral:      #ff6b4a;   /* HARD difficulty + "their price" header */
--purple:     #8b5cf6;   /* NIGHTMARE difficulty */
--paper:      #ffffff;   /* card bg */

/* Tier backgrounds (pale) — used in score cell + tier pill */
--tier-weekend-bg: #dcfce7;
--tier-month-bg:   #fef9c3;
--tier-dont-bg:    #fee2e2;

/* Per-tier foreground (used for the label dot, optional) */
--tier-weekend-fg: #22c55e;
--tier-month-fg:   #eab308;
--tier-dont-fg:    #ef4444;

/* Type */
--font-display: "Space Grotesk", system-ui, sans-serif;  /* 400/500/600/700 */
--font-body:    "Space Grotesk", system-ui, sans-serif;  /* same family, different weights/sizes */
--font-mono:    "JetBrains Mono", ui-monospace, monospace; /* 400/500/700 */

/* Brutalist primitives */
--border:   2.5px solid var(--ink);
--border-1: 1.5px solid var(--ink);
--border-2: 2px solid var(--ink);
--shadow:   5px 5px 0 0 var(--ink);   /* no blur. offset only. */
```

### Difficulty colors
| Difficulty | Background |
|---|---|
| `easy` | `--lime` (#c6ff00) |
| `medium` | `--yellow` (#ffd84d) |
| `hard` | `--coral` (#ff6b4a) |
| `nightmare` | `--purple` (#8b5cf6) |

All diff chips use `1.5px solid --ink` border and `--font-mono` uppercase text.

---

## Structural rules

- The whole card is one outer container with `--border` + `--shadow`.
- Every section divider inside the card is `--border` (2.5px) horizontal — not a gap. Sections touch.
- **Never** use `border-radius`. Hard corners throughout.
- **Never** blur shadows. Offset only, solid color.
- Mono font is used for: header metadata, uppercase labels/eyebrows, data rows, difficulty chips, stack pills.
- Display font (Space Grotesk 700) is used for: scanned site name, blunt take quote, section headings, the big score number, CTA headline.

---

## Section-by-section spec

Padding notation: `T R B L` where unambiguous, else symmetric.

### 1 · Outer wrap
- Page bg: `--cream`. Card bg: `--paper`.
- Card: `--border` + `--shadow`. No radius.
- Card-to-page padding: 40px all sides (adjust to taste at container level).

### 2 · Header bar
- `padding: 14px 22px;` bg `--cream`, bottom `--border`.
- Left: black pill "SAASPOCALYPSE" (bg `--ink`, color `--lime`, `2px 8px` padding, `0.1em` letter-spacing, mono 11px 700) + muted mono ID string `verdict #<ID>-<4DIG>`.
- Right: mono 11px 60% opacity `scanned <timestamp>`.

### 3 · Title block
- `padding: 36px 44px 28px;` bottom `--border`.
- Two-column grid `1fr auto`, gap 32, align `end`.
- **Left column:**
  - Mono 12px 700 uppercase eyebrow "subject of investigation" (#666), 10px below.
  - `<h2>` site name: display 52px 700, line-height 1, letter-spacing −0.03em, margin 0.
  - Mono 14px 70% opacity tagline below, prefixed with "▸ ".
- **Right column (tier pill):**
  - `2.5px solid --ink` border, `8px 16px` padding.
  - Background = tier pale bg (`--tier-weekend-bg`, `--tier-month-bg`, or `--tier-dont-bg`).
  - Display 20px 700, `0.05em` letter-spacing, text `verdict: WEEKEND` (tier uppercase).
  - **`transform: rotate(-2deg)`** — the rotation is part of the design.

### 4 · Score + take (two-column)
- Grid `280px 1fr`, bottom `--border`.
- **Left column (score cell):**
  - `padding: 32px 28px;` right `--border`, bg = tier pale bg.
  - `min-height: 260px;` flex column, space-between.
  - Mono 11px 700 uppercase label "buildability score" (#333) at top.
  - Center: big number display 140px 700, line-height 0.85, letter-spacing −0.05em. Followed by `/100` display 28px 500 opacity 0.5, baseline-aligned.
  - Bottom: mono 11px uppercase "tier · <tier name lowercase>" (the word bold ink).
- **Right column (blunt take):**
  - `padding: 32px 40px;` flex column, justify center.
  - Mono 11px 700 uppercase eyebrow "the blunt take" (#666), 14px below.
  - Quote: display 24px 500, line-height 1.3, letter-spacing −0.015em, `text-wrap: balance`, wrapped in `"..."`.
  - Subtake: body 15px 400, line-height 1.5, 16px top margin, opacity 0.7, `max-width: 620px`.

### 5 · Cost breakdown
- `padding: 32px 44px;` bottom `--border`.
- Heading row flex between:
  - Display 26px 700 "cost breakdown." (period is intentional).
  - Mono 11px uppercase opacity 0.6 "their price ←→ your price".
- Body: grid `1fr 40px 1fr`, gap 16, align stretch.
- **Their price card:** `--border`, bg `#fff5f3`.
  - Header strip: `10px 16px` padding, bottom `--border`, mono 11px 700 uppercase "what they charge" + coral `●` dot.
  - Body padding `20px 20px 24px`.
    - Mono 12px 70% opacity plan label.
    - Display 44px 700 price + body 14px 60% unit `/ seat/mo`.
    - Optional mono 11px 60% opacity "※ <note>" row.
    - Dashed top divider `1.5px dashed #ccc` then mono 12px row: `annual:` muted + value bold.
- **Arrow column:** centered display 40px 700 `↔` glyph.
- **Your price card:** `--border` + `--shadow`, bg `#f0fdf4`.
  - Header strip: bg `--lime`, mono 11px 700 uppercase "what it costs you" + "✦" glyph.
  - Body is a mono 13px itemized list. Each row: `"NN · <line>"` left, money right-aligned, rows separated by `1px dashed #ccc`.
  - Final row is `2px solid --ink` top border, display 18px 700: "TOTAL / mo" left, total right.
- **Break-even strip** (18px below grid): `2px dashed --ink` border, bg `--cream`, `10px 16px` padding, mono 13px. Label "▸ break-even:" bold left, value right.

### 6 · Alternatives
- `padding: 32px 44px;` bg `--cream`, bottom `--border`.
- Heading row flex between:
  - Display 26px 700 "or, you know, use one of these."
  - Mono 11px uppercase opacity 0.6 "if building feels spicy".
- Grid `repeat(3, 1fr)`, gap 14.
- Each card: `--border`, bg `--paper`, `16px 18px` padding.
  - Mono 10px 50% opacity uppercase "option A" / "option B" / "option C".
  - Display 22px 700 name, letter-spacing −0.01em, 4px top margin.
  - Body 14px line-height 1.5 80% opacity why line, 8px top margin.

### 7 · Build challenges
- `padding: 32px 44px;` bottom `--border`.
- Heading row flex between:
  - Display 26px 700 "what'll actually be hard."
  - Mono 11px uppercase opacity 0.6 "est. total: <timeEstimate>".
- Below heading: mono 12px 60% opacity "▸ <timeBreakdown>". 20px bottom margin.
- **Legend row:** flex gap 14, mono 11px 70% opacity uppercase. Each entry: 12×12 swatch (diff color, `1.5px solid --ink`) + label.
- **Challenge rows:** grid gap 8. Each row is `grid-template-columns: 40px 110px 1fr`, gap 14, align center, `10px 14px` padding, `2px solid --ink`, bg `--paper`.
  - Col 1: mono 13px 700 #999 index `"01"` `"02"` ...
  - Col 2: difficulty chip — mono 11px 700 uppercase, `4px 8px` padding, diff bg color, `1.5px solid --ink`, text-align center.
  - Col 3: display 16px 600 name, then body 13px 70% opacity note.
- **Stack pills** (at bottom, 22px top margin, `1.5px dashed --ink` top border, 18px padding-top):
  - Mono 11px 700 uppercase 60% opacity "recommended stack" eyebrow.
  - Flex wrap gap 8. Each pill: mono 12px, `5px 10px` padding, `2px solid --ink`, alternating `--paper` / `--cream` bg by index.

### 8 · CTA strip
- `padding: 28px 44px;` bg `--ink`, color `--cream`.
- Grid `1fr auto`, gap 24, align center.
- **Left:** mono 11px 700 uppercase `--lime` eyebrow "ready to build?" + display 26px 700 headline whose copy is score-dependent:
  - `score >= 70`: "We'll email you a 1-page build guide."
  - `30 <= score < 70`: "We'll email you a 3-page build guide. Good luck."
  - `score < 30`: "We'll email you a link to Google Maps. Nearest park."
- **Right (button):** bg `--lime`, color `--ink`, `2.5px solid --lime` border, `5px 5px 0 0 --cream` shadow (so it stands off the black strip), display 18px 700, `16px 28px` padding, letter-spacing −0.01em.
  - Label also score-dependent:
  - `>= 70`: "→ get the build guide"
  - `30–69`: "→ email me anyway"
  - `< 30`: "→ go outside"

### 9 · Footer strip
- `padding: 10px 22px;` bg `--cream`, top `--border`.
- Mono 10px uppercase 0.1em tracking, color #666.
- Flex between: "▸ generated by a robot, vibes-checked by nobody" · "verdict v2.1 · saaspocalypse.biz".

---

## Responsive notes

- The card is designed for a min comfortable width of ~860px. Below that:
  - Collapse the 280 / 1fr score+take grid into stacked rows.
  - Collapse the cost `1fr 40px 1fr` grid into stacked cards; replace the ↔ column with a vertical `↕` between.
  - Alternatives grid drops to 1 column below ~640px.
  - Challenge rows collapse: hide the index column below ~520px; wrap the difficulty chip above the name.
- Keep the tier pill's `-2deg` rotation at all widths.

---

## Accessibility

- The `<h2>` site name is the accessible heading. The blunt take is a `<p>` with quote marks inside the text.
- Difficulty is NOT encoded by color alone — the text label (`easy` / `medium` / `hard` / `nightmare`) is in the chip.
- Contrast: all tier backgrounds with ink text pass WCAG AA. The lime CTA on ink passes at this size.
- `prefers-reduced-motion`: none of the report animates. The −2deg rotation is static.

---

## Data shape

See `verdict-data.schema.md` for the full `v` prop shape. Summary:

```ts
type VerdictReport = {
  id: string;
  name: string;              // "notion-ish.com"
  tagline: string;           // "block-based docs + database"
  scannedAt: string;         // "2026.04.24 · 14:32"
  tier: 'WEEKEND' | 'MONTH' | "DON'T";
  tierBg: string;            // hex — pale tier bg
  tierColor: string;         // hex — darker tier fg (optional, unused in A)
  score: number;             // 0..100
  take: string;              // blunt one-liner
  take_sub: string;          // follow-up paragraph
  currentCost: { label: string; price: number | string; unit: string; annual: number | string; note?: string };
  estCost: Array<{ line: string; cost: number | string }>;
  estTotal: number | string;
  breakEven: string;
  alternatives: Array<{ name: string; why: string }>;
  challenges: Array<{ diff: 'easy'|'medium'|'hard'|'nightmare'; name: string; note: string }>;
  stack: string[];
  timeEstimate: string;      // "14 hours", "6 weeks", "∞"
  timeBreakdown: string;     // "1 weekend hacking · 4 evenings polishing"
};
```
