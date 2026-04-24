# Handoff: Saaspocalypse — Hero headline "Ransom note" treatment

## Overview

A single, bold typographic treatment for the Saaspocalypse hero headline. Each word of the headline becomes its own **chip** — black-bordered, offset-shadowed, rotated slightly, with alternating background colors. Neo-brutalist energy. Works for any short headline (3–6 words ideal).

## Fidelity

**High-fidelity.** Final colors, spacing, rotations, and type. Implement as-is in your target framework's conventions.

## What it looks like

Given the headline "Can I build this myself?", each word renders as a separate chip:

- **Chip 1** (white bg, black text) — rotated **-2°**
- **Chip 2** (lime `#c6ff00` bg, black text) — rotated **+1.5°**
- **Chip 3** (yellow `#ffd84d` bg, black text) — rotated **-1°**
- **Chip 4** (black bg, lime text) — rotated **+2.2°**
- Chips 5+ cycle through the same 4 backgrounds/rotations

All chips share identical border and shadow so they read as a set even with different fills.

## Design tokens

| Token | Value |
|---|---|
| Ink (text + borders) | `#0a0a0a` |
| Accent (lime) | `#c6ff00` |
| Secondary (yellow) | `#ffd84d` |
| Paper (white) | `#ffffff` |
| Font family | `"Space Grotesk", system-ui, sans-serif` — weight 700 |
| Font size | `clamp(48px, 7.5vw, 104px)` |
| Line-height | `1.1` |
| Letter-spacing | `-0.02em` |
| Chip border | `2.5px solid #0a0a0a` |
| Chip shadow | `5px 5px 0 0 #0a0a0a` (no blur) |
| Chip padding | `0.02em 0.14em` (em-relative so it scales with font size) |
| Chip row gap | `0.18em` vertical, `0.25em` horizontal |
| Chip rotations (cycled) | `-2°, +1.5°, -1°, +2.2°` |
| Backgrounds (cycled) | `white, lime, yellow, ink` — with text color `ink, ink, ink, lime` |
| Container | `display: flex; flex-wrap: wrap;` — let chips wrap naturally |

## Layout rules

- Chips must wrap as a single visual paragraph — use `flex-wrap: wrap` with the gap above.
- Each chip is `display: inline-block` so its rotation doesn't affect line flow.
- Rotations are small (max ±2.2°) so adjacent chips don't collide; at this scale the em-based gap keeps separation clean.
- Never use border-radius. Hard corners are the whole point.
- Do not use blurred shadows. `5px 5px 0 0` is a pure offset solid.

## HTML/CSS reference

```html
<h1 class="hero-ransom">
  <span class="chip c0">Can</span>
  <span class="chip c1">I</span>
  <span class="chip c2">build</span>
  <span class="chip c3">this</span>
  <span class="chip c0">myself?</span>
</h1>

<style>
.hero-ransom {
  font-family: "Space Grotesk", system-ui, sans-serif;
  font-weight: 700;
  font-size: clamp(48px, 7.5vw, 104px);
  line-height: 1.1;
  letter-spacing: -0.02em;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.18em 0.25em;
}
.hero-ransom .chip {
  border: 2.5px solid #0a0a0a;
  box-shadow: 5px 5px 0 0 #0a0a0a;
  padding: 0.02em 0.14em;
  display: inline-block;
  transform-origin: center;
}
.hero-ransom .c0 { background: #ffffff; color: #0a0a0a; transform: rotate(-2deg); }
.hero-ransom .c1 { background: #c6ff00; color: #0a0a0a; transform: rotate(1.5deg); }
.hero-ransom .c2 { background: #ffd84d; color: #0a0a0a; transform: rotate(-1deg); }
.hero-ransom .c3 { background: #0a0a0a; color: #c6ff00; transform: rotate(2.2deg); }
</style>
```

## React reference

```jsx
const BGS = ['#ffffff', '#c6ff00', '#ffd84d', '#0a0a0a'];
const FGS = ['#0a0a0a', '#0a0a0a', '#0a0a0a', '#c6ff00'];
const ROTS = [-2, 1.5, -1, 2.2];

function RansomHeadline({ text }) {
  return (
    <h1 style={{
      fontFamily: '"Space Grotesk", system-ui, sans-serif',
      fontWeight: 700,
      fontSize: 'clamp(48px, 7.5vw, 104px)',
      lineHeight: 1.1,
      letterSpacing: '-0.02em',
      margin: 0,
      display: 'flex',
      flexWrap: 'wrap',
      gap: '0.18em 0.25em',
    }}>
      {text.split(' ').map((word, i) => (
        <span key={i} style={{
          background: BGS[i % 4],
          color: FGS[i % 4],
          border: '2.5px solid #0a0a0a',
          boxShadow: '5px 5px 0 0 #0a0a0a',
          padding: '0.02em 0.14em',
          display: 'inline-block',
          transform: `rotate(${ROTS[i % 4]}deg)`,
          transformOrigin: 'center',
        }}>{word}</span>
      ))}
    </h1>
  );
}
```

## Responsive notes

- `font-size` uses `clamp()` — it self-scales from 48px (mobile) to 104px (1920+).
- Keep the em-based padding and gap so proportions stay correct at every size.
- Shadow stays at fixed 5px on purpose — scaling it with em feels wrong for a brutalist offset shadow. If you must, cap it: `box-shadow: min(5px, 0.06em) min(5px, 0.06em) 0 0 #0a0a0a;`.

## Accessibility

- Rotations are cosmetic; screen readers read the `<h1>` contents naturally.
- `@media (prefers-reduced-motion: reduce)` — no motion to reduce here, but consider zeroing the rotations for users who prefer flat UI.
- Contrast: all four chip combos pass WCAG AA for large text at these sizes.

## Files

- `ransom-hero-preview.html` — standalone page: paste any headline, see it render. Open in a browser.
