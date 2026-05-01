# Handoff: Saaspocalypse — Clean centered hero

## Overview

A clean, centered hero for the Saaspocalypse landing page (Version A — neo-brutalist direction). Replaces the original left-aligned ransom-note treatment with a calmer **editorial** headline and a **pill eyebrow** above it. The input bar / scanner and everything below it are unchanged from the existing page.

## About the design files

The HTML in this bundle is a **design reference**, not production code. It shows the intended look of the new hero block in isolation. Reimplement it in the target codebase using its established framework (React/Vue/Svelte/etc.), component library, and design tokens. If the codebase has no styling system yet, plain semantic HTML + CSS as shown here is a fine starting point.

Files included:
- `hero-preview.html` — standalone, self-contained preview of the new hero (nav + eyebrow + headline + scanner + footnote)
- This `README.md`

## Fidelity

**High-fidelity.** Final colors, typography, spacing, and the exact accent treatment. Implement pixel-faithful.

## Scope of the change

Only the **eyebrow + headline pair** at the top of the hero changes. Specifically:

- **Removed**: the old `robot is awake · 12,483 SaaS ruined today` status box (white rectangle with green dot, left-aligned).
- **Removed**: the multi-word "ransom note" headline treatment (each word a tilted, shadowed chip with alternating fills).
- **Added**: a small **Pill eyebrow** with a single accent dot.
- **Added**: a centered, two-part **Editorial headline** ("Scan any SaaS." / "Find the weak spot.") where "weak spot" sits on a low accent highlight bar.
- **Layout shift**: the hero block is now **center-aligned** (eyebrow, headline, scanner, footnote). The old layout was left-aligned.

The input bar, preset chips ("notion-ish.com" etc.), and footnote line ("no signup · no credit card · …") keep their existing styling — they just live in a centered container now.

## Layout

Container: `max-width: 1100px; margin: 0 auto;`. Vertical stack with `gap: 28px` and `justify-items: center`, `text-align: center`.

Order (top to bottom):
1. **Eyebrow pill** (small)
2. **Headline H1** ("Scan any SaaS.") — heavy display weight
3. **Subhead H2** ("Find the weak spot.") — medium weight, muted, with accent highlight on "weak spot"
4. ~28px gap
5. **Scanner** (`max-width: 780px`, centered) — input bar + preset chips
6. **Footnote row** (centered, flex-wrap)

Outer hero padding: `80px 48px 60px`.

## Component 1 — Eyebrow pill

A small rounded pill with a hairline border and a single accent dot.

| Property | Value |
|---|---|
| Display | inline-flex, align-items center, gap 10px |
| Padding | `7px 14px` |
| Border | `1.5px solid var(--ink)` |
| Border radius | `999px` (full pill) |
| Background | `#ffffff` |
| Font | `'Space Grotesk', system-ui, sans-serif` |
| Font size | `12px` |
| Font weight | `600` |
| Letter spacing | `0.05em` |
| Color | `var(--ink)` |
| Copy | **A free SaaS teardown tool** |

Dot:
| Property | Value |
|---|---|
| Size | `7px × 7px` |
| Background | `var(--accent)` (`#c6ff00`) |
| Border radius | `999px` |
| Border | `1.5px solid var(--ink)` |

## Component 2 — Editorial headline (H1)

The first sentence is the dominant visual. Heavy display weight, tightly tracked.

| Property | Value |
|---|---|
| Element | `<h1>` |
| Font family | `'Space Grotesk', system-ui, sans-serif` |
| Font weight | `700` |
| Font size | `clamp(62px, 9vw, 140px)` |
| Line height | `0.98` |
| Letter spacing | `-0.04em` |
| Margin | `0` |
| Color | `var(--ink)` (`#0a0a0a`) |
| Text wrap | `balance` |
| Copy | **Scan any SaaS.** |

## Component 3 — Editorial subhead (H2)

The second sentence is smaller and softer. The phrase **"weak spot"** is highlighted with a low accent bar (background gradient anchored to the bottom of the line), not a full highlighter — it sits *under* the descenders, not behind the text.

| Property | Value |
|---|---|
| Element | `<h2>` |
| Font family | `'Space Grotesk', system-ui, sans-serif` |
| Font weight | `500` |
| Font size | `clamp(34px, 4.4vw, 60px)` |
| Line height | `1.1` |
| Letter spacing | `-0.02em` |
| Margin | `0.25em 0 0` |
| Color | `var(--muted)` (`#3a3a3a`) |
| Max width | `20ch` |
| Text wrap | `balance` |
| Copy | **Find the *weak spot*.** (where *weak spot* gets the accent mark) |

Accent mark on **"weak spot"**:

```css
.subhead-mark {
  color: #0a0a0a;                    /* darken the marked words */
  background-image: linear-gradient(#c6ff00, #c6ff00);
  background-repeat: no-repeat;
  background-size: 100% 0.22em;      /* ~22% of line height */
  background-position: 0 88%;        /* sit near baseline */
  padding-bottom: 0.04em;
}
```

This produces a low, single-color highlight bar under the words. **Do not** wrap "weak spot" with a full background block, an underline-style border, or a tilted chip — it should read as a quiet marker, not a label.

## Design tokens

| Token | Value | Notes |
|---|---|---|
| `--ink` | `#0a0a0a` | All text, borders, dots |
| `--paper` | `#f4f1e8` | Page background (warm off-white) |
| `--accent` | `#c6ff00` | Lime — eyebrow dot, headline accent mark, scanner button |
| `--muted` | `#3a3a3a` | Subhead color |
| Display font | `'Space Grotesk'`, weights 500/700 | from Google Fonts |
| Mono font | `'JetBrains Mono'` | not used in the hero itself, but used in the scanner placeholder area |

## Copy

| Slot | Text |
|---|---|
| Eyebrow | A free SaaS teardown tool |
| Headline (H1) | Scan any SaaS. |
| Subhead (H2) | Find the **weak spot**. |
| Input placeholder | your-next-victim.com |
| CTA button | judge it → |
| Footnote items | ✦ no signup ・ ✦ no credit card ・ ✦ we don't have a database (yet) ・ ✦ press ↵ to judge |

## Responsive behavior

Headline and subhead use `clamp()` for fluid sizing — they scale down naturally on narrow viewports without media queries. The hero container itself is `max-width: 1100px` with horizontal padding of 48px; on small screens, drop the padding to ~24px.

The scanner row is unchanged; it already wraps the preset chips and the footnote items.

## States & interactions

The hero block itself has no animation. All interactive behavior lives in the scanner (input focus, button click → scan flow) and is unchanged from the existing implementation.

## Implementation notes

- **The pill border is hairline (1.5px)** — thinner than the 2.5px brutalist borders elsewhere on the page. This is intentional: it makes the eyebrow feel like a quiet label instead of a stamped chip.
- **The accent bar on "weak spot" must be drawn as a `background-image` gradient**, not as `text-decoration: underline` or a `<mark>`-style full background. The position (`0 88%`) and height (`0.22em`) are tuned to sit just below the cap-height baseline; don't substitute these without re-eyeballing.
- **The H2 has `max-width: 20ch`** so the centered subhead doesn't visually tie itself to the full-width H1. Keep this constraint or the second line stretches awkwardly.
- The headline's first sentence ends with a period inside the H1 — keep the punctuation, it sets the rhythm for the subhead.

## Source files in the source project

The implementation in the source prototype lives across:
- `direction-brutalist.jsx` — hero container layout (the `centered` branch)
- `hero-styles.jsx` — `HeroStyle15` ("Editorial") component
- `eyebrow-badges.jsx` — `EyebrowV1` ("Pill + dot") component
- `shared.jsx` — `HEADLINES[0]` provides the source string `"Scan any SaaS. Find the weak spot."` which is split on the sentence boundary

A developer can read those for reference, but the **single-file `hero-preview.html` in this bundle is self-sufficient** — it inlines all the styles needed to recreate this hero.
