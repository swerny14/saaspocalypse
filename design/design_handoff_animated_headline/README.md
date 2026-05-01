# Handoff: Animated editorial headline

## Overview

A single drop-in headline element used at the top of the Saaspocalypse hero. Two-sentence editorial composition where the punch-line phrase ("weak spot") sits in **italic Fraunces serif** and gets a **hand-drawn SVG marker stroke that animates in on load**. The H1 and H2 fade/slide up in sequence.

This handoff covers **only the headline element** (the H1+H2 unit). The eyebrow, scanner, footnote, and surrounding hero layout are out of scope.

## About the design files

`headline-preview.html` is a self-contained design reference, not production code. It uses plain HTML/CSS so any framework can adapt it. Reimplement in the target codebase using its conventions (React component, Vue SFC, Svelte, etc.).

## Fidelity

**High-fidelity.** Final type, color, animation timings.

## Markup

```html
<div class="editorial-headline">
  <h1 class="eh-h1">Scan any SaaS.</h1>
  <h2 class="eh-h2">
    Find the
    <span class="eh-punch">
      <span class="eh-punch-text">weak spot</span>
      <svg class="eh-mark" viewBox="0 0 320 28" preserveAspectRatio="none" aria-hidden="true">
        <path class="eh-mark-path" d="M6 18 C 60 6, 130 24, 200 12 S 290 16, 314 10" />
      </svg>
    </span>.
  </h2>
</div>
```

The SVG sits *inside* the inline-block `.eh-punch` so the stroke positions itself relative to the phrase, regardless of where it lands on a wrapping line.

## Type

| Slot | Family | Weight | Style | Size |
|---|---|---|---|---|
| H1 | Space Grotesk | 700 | upright | `clamp(62px, 9vw, 140px)` |
| H2 base | Space Grotesk | 500 | upright | `clamp(34px, 4.4vw, 60px)` |
| H2 punch ("weak spot") | **Fraunces** | **600** | **italic** | inherits H2 size |

Fraunces is the only outside font introduced by this element. Load it with `ital,opsz,wght@1,9..144,600` (italic axis on, weight 600) — the optical-size axis lets it render well at the very large punch-word size.

Other type tokens:
- H1 line-height `0.98`, letter-spacing `-0.04em`
- H2 line-height `1.1`, letter-spacing `-0.02em`
- H2 punch letter-spacing `-0.01em` (slightly looser than its surroundings — Fraunces italic packs tighter than Grotesk)
- H2 `max-width: 20ch` so the centered subhead doesn't span the full H1 width
- Both H1 and H2 use `text-wrap: balance`

## Color

| Token | Value |
|---|---|
| `--ink` | `#0a0a0a` (H1 + punch text + marker SVG fallback) |
| `--muted` | `#3a3a3a` (H2 base color) |
| `--accent` | `#c6ff00` (marker stroke) |

Background is whatever the page provides — the element is transparent.

## Marker stroke (SVG)

Draws a single hand-feeling curve under "weak spot" using a cubic + smooth-curve path.

| Property | Value |
|---|---|
| `viewBox` | `0 0 320 28` |
| `preserveAspectRatio` | `none` (so it stretches to phrase width) |
| Position | `absolute; left: -3%; right: -3%; bottom: -0.18em; width: 106%; height: 0.34em` |
| Path | `M6 18 C 60 6, 130 24, 200 12 S 290 16, 314 10` |
| Stroke | `var(--accent)` |
| Stroke width | `9` (in viewBox units) |
| Stroke linecap | `round` |
| Pointer events | `none` |

The 106% width with a -3% / -3% offset extends the stroke slightly past the text on both sides — that subtle overshoot is what reads as "drawn by hand" instead of a UI underline.

## Animations

Three coordinated animations on load:

| Element | Animation | Duration | Delay | Easing |
|---|---|---|---|---|
| H1 | `eh-rise` (fade + 0.18em rise) | 720ms | 0ms | `cubic-bezier(.2,.7,.2,1)` |
| H2 | `eh-rise` (same) | 720ms | 180ms | `cubic-bezier(.2,.7,.2,1)` |
| Marker path | `eh-mark-draw` (stroke-dashoffset 320 → 0) | 760ms | 700ms | `cubic-bezier(.55,.05,.25,1)` |

Total entrance: ~1460ms. The marker draw is timed to start *after* the H2 has fully risen, so the stroke lands on stable text.

```css
@keyframes eh-rise {
  from { opacity: 0; transform: translateY(0.18em); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes eh-mark-draw {
  from { stroke-dashoffset: 320; }
  to   { stroke-dashoffset: 0; }
}
.eh-mark-path {
  stroke-dasharray: 320;
  stroke-dashoffset: 320;
  animation: eh-mark-draw 760ms cubic-bezier(.55,.05,.25,1) 700ms forwards;
}
```

Note: `stroke-dasharray` and the starting `stroke-dashoffset` are both `320` — that's slightly larger than the path length so the stroke is fully hidden before the animation runs. Don't change one without the other.

### Reduced motion

Respect `prefers-reduced-motion: reduce`:

```css
@media (prefers-reduced-motion: reduce) {
  .eh-h1, .eh-h2, .eh-mark-path { animation: none; }
  .eh-mark-path { stroke-dashoffset: 0; }
}
```

The marker should still be visible (final state) — only the entrance is suppressed.

## Replay on framework integration

Re-running the entrance on route change / mount: easiest is to key the React/Vue component on a mount counter so the DOM is recreated. Alternatively, toggle `animation: none` then remove it in the next frame to restart. The CSS as-written runs once per element mount.

## Copy

| Slot | Text |
|---|---|
| H1 | `Scan any SaaS.` |
| H2 | `Find the weak spot.` (where `weak spot` is the punch) |

If the headline copy changes, **the marker SVG width and position will need re-tuning** for the new phrase length. The path geometry assumes a 2-word punch around 8–10 characters; very short or very long phrases will look pinched or stretched.

## Files

- `headline-preview.html` — self-contained preview (also includes a small floating "↻ replay animation" button for QA; not part of the component)
- This `README.md`

## Source files in the source project

In the prototype project, this element lives in `hero-styles.jsx` as `HeroStyle15` ("Editorial"). The class names are different (`hs15-*` instead of `eh-*`) and the keyframes are inlined inside a React `<style>` element, but the markup, geometry, and timings match exactly.
