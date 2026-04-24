# Handoff: Saaspocalypse — Neo-brutalist landing page

## Overview

Saaspocalypse is a playful marketing site where indie hackers paste a SaaS URL and get a verdict on whether they could build it themselves — including a buildability score, stack receipt, time-to-clone estimate, and a snarky one-liner. The tone is Porkbun-style: witty, pun-heavy, corny on purpose.

This handoff covers the **Neo-brutalist direction** that was selected from three explored options.

## About the design files

The HTML/JSX files in this bundle are **design references**, not production code. They're a prototype built with inline React + Babel to demonstrate the intended look, behavior, copy, and interaction. Your job is to **recreate these designs in your target codebase's environment** (Next.js/React, Astro, SvelteKit, whatever you're using) using its established patterns, component library, and conventions — or, if this is greenfield, to pick an appropriate stack and implement there. Do not ship the in-browser Babel prototype.

## Fidelity

**High-fidelity.** All colors, type, spacing, and copy are final. Animations and interaction details (scan sequence, verdict reveal, marquee speed) are specified exactly. Implement as-is.

## Files included

| File | What it is |
|---|---|
| `brutalist-preview.html` | Open this in a browser for a live, scrollable preview of the full page |
| `direction-brutalist.jsx` | The React source for every section, component, and micro-interaction — READ THIS for exact layout values |
| `shared.jsx` | Content (headlines, verdicts, testimonials, FAQs, footer strip) + the `useScanner` hook driving the scan animation |

Treat `direction-brutalist.jsx` as the spec. It's ~420 lines and contains every measurement, color, and piece of copy.

---

## Design system (tokens)

### Colors

| Token | Hex | Usage |
|---|---|---|
| `--bg` | `#f4f1e8` | Page background (warm cream) |
| `--ink` | `#0a0a0a` | All borders, primary text, dark CTA section |
| `--accent` | `#c6ff00` | Electric lime — CTA buttons, highlights, nav pill, scan progress, dark-section accents |
| `--paper` | `#ffffff` | Card/panel backgrounds inside brutalist frames |
| `--paper-alt` | `#fafaf5` | Stack receipt background (subtle warm tint vs. `--paper`) |
| `--muted` | `#666666` | Secondary text |
| `--success` | `#22c55e` | "WEEKEND" tier, completed scan steps |
| `--warning` | `#eab308` | "MONTH" tier |
| `--danger` | `#ef4444` | "DON'T" tier |
| `--sticky` | `#ffd84d` | Third testimonial card variant only |

### Typography

- **Display:** `Space Grotesk` — weights 500, 600, 700. Used for h1/h2/h3, buttons, score numbers, verdict quotes. Letter-spacing `-0.02em` to `-0.04em` tightens at larger sizes.
- **Body / mono:** `JetBrains Mono` — weights 400, 500, 700. Used for body copy, labels, eyebrows, URLs, stack receipts, scan steps.
- **Balance:** All multi-line headlines use `text-wrap: balance`.

### Type scale (final sizes)

| Element | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|
| H1 hero | `clamp(56px, 8vw, 120px)` | 700 | 1.08 | -0.03em |
| H2 section | `clamp(40px, 5.5vw, 68px)` | 700 | 1.0 | -0.03em |
| H3 card title | 32px | 700 | 1.2 | -0.02em |
| Big number (verdict score) | 88px | 700 | 1.0 | -0.04em |
| Body large | 20px | 400 | 1.5 | 0 |
| Body | 15–16px | 400 | 1.5–1.6 | 0 |
| Eyebrow | 13px | 700 | 1.2 | 0.15em, UPPERCASE |
| Micro label | 11–12px | 700 | 1.2 | 0.1em, UPPERCASE |

### Spacing & layout

- Section vertical padding: `80px` top/bottom, `48px` horizontal.
- Max content width: varies per section (no hard container), most grids are `auto-fill minmax(320–340px, 1fr)` with `22px` gap.
- Card gap inside examples: `22px`. Between testimonials: `22px` (slightly tilted ±0.8deg). Between pricing checklist items: `10px`.

### Brutalist borders + shadows

Three recurring utilities — use as CSS classes or inline styles:

```css
.bru     { border: 2.5px solid #0a0a0a; box-shadow: 6px 6px 0 0 #0a0a0a; }
.bru-sm  { border: 2px solid #0a0a0a;   box-shadow: 4px 4px 0 0 #0a0a0a; }
.bru-xs  { border: 2px solid #0a0a0a;   box-shadow: 3px 3px 0 0 #0a0a0a; }
```

All offset shadows are pure black, no blur. All borders are pure black. No rounded corners anywhere except one pill-shaped status dot (`border-radius: 99`). Commit to the hard-edged look.

---

## Sections, top to bottom

### 1. Nav (sticky)
- 18px × 48px padding, 2.5px black bottom border, cream background.
- Left: 34×34 lime square with "§" glyph (rotated -3deg, black border) + wordmark "saaspocalypse" + a black `beta, probably` pill with lime text.
- Right: text links (Examples, How it works, FAQ) + lime `Scan a URL ↓` button with `.bru-xs` treatment.

### 2. Hero
- Top-left status chip: `.bru-xs` white chip w/ green dot + "robot is awake · 12,483 SaaS ruined today".
- H1 headline, last word wrapped in a span with lime background — uses `padding: 0.05em 0.12em` + `box-shadow: 0.12em 0 0 <accent>, -0.12em 0 0 <accent>` + `box-decoration-break: clone` so the highlight hugs the word across line breaks without clipping descenders.
- Subheadline in JetBrains Mono, 20px, max-width 620px.
- **URL scanner** (see section 10 below).
- Footer row of `✦ no signup · ✦ no credit card · …` micro-notes.
- Absolute top-right label: `est. 2026 · a public service`.

### 3. Marquee strip
- Full-width, black bg, lime text, 22px Space Grotesk 600, 14px vertical padding, 2.5px black borders top/bottom.
- Looping messages separated by `✦`. Duplicate the content twice and translate `-50%` over 28s linear infinite for a seamless loop.

### 4. Recent verdicts grid
- SectionHead: eyebrow `Recent verdicts`, h2 "We've been busy roasting.", sub "Real URLs, real robot opinions, real receipts. Names changed to protect the funded."
- Grid of `VerdictCard` components (6 cards). Each: `.bru` white card, `name` mono + tier badge (tier color bg, black text, 10px uppercase), big score number in tier color, time + cost top-right, italic-style verdict quote in display font, dashed black separator, first 3 stack items in mono.

### 5. How it works (dark section)
- Full-width black bg, cream text, 80px vertical padding.
- 3-column grid of step cards: dark-gray card (`#1a1a1a`) with 2px lime border, 28px padding, lime eyebrow `STEP 01/02/03`, 32px display title, mono body copy.
- Giant ghosted step number (`64px`, lime, 15% opacity) absolutely positioned top-right of each card.

### 6. Testimonials
- Same section pattern, cards use `.bru` treatment.
- **Alternating card backgrounds:** index 0,3 → lime; 1,4 → white; 2,5 → sticky yellow `#ffd84d`.
- Each card rotated `-0.8deg` or `+0.8deg` alternating.
- ★★★★★ stars (14px), 20px display quote, mono name/role below.

### 7. Pricing
- Full-bleed lime background section with 2.5px black borders top+bottom.
- Centered `PRICING` eyebrow, enormous `$0` (56–96px, with `.00` at 50% size and 60% opacity), mono subtitle "forever · per URL · per lifetime · per regret".
- Checklist panel is `.bru` on cream bg, 6 items, each with a 20×20 black square holding a lime `✓`.
- Sub-footnote: "if we ever charge, you have our permission to clone us. seriously."

### 8. FAQ
- Standard section padding, max-width 820 list.
- Each item: 2px black top border, 20px vertical padding, 22px display question, 36px toggle button with black border (`+` → `−`, lime bg when open). Answer 16px mono, max-width 700.

### 9. CTA (dark)
- Black bg, cream text, 80px padding, centered.
- Headline `go on then.` wrapped in `.wob` class (rotate -1° ↔ +1° over 4s ease-in-out infinite) — the only "toy" animation on the page.
- Lime `Scan a URL →` button with full `.bru` treatment, 18×36 padding, 22px display font.

### 10. Footer
- 40×48 padding, cream bg, 2.5px black top border.
- Left: wordmark + "© 2026 · made by someone who should've been sleeping".
- Right: inline flex row of easter-egg strings at 70% opacity ("we're not a real company", "the robot is lying to you (a little)", `curl -X POST /verdict`, etc.)

---

## Interactive component: URL scanner

Lives in the hero. State machine with three phases: `idle` → `scanning` → `done`.

### Input bar
- `.bru` white frame, flex row, stretchable.
- Left column: `https://` label, 18px 20px padding, 2.5px black right border, 16px mono, muted color.
- Middle: text input, 18×20 padding, 20px mono, transparent background, no border. Placeholder: `your-next-victim.com`.
- Right: lime button with 2.5px black left border, 28px horizontal padding, 18px Space Grotesk 700. Label switches based on phase: `judge it →` / `scanning…` / `scan again`.
- Enter key also triggers scan.

### Preset chips (below input)
- "or try:" label + 4 `.bru-xs` white chips: `notion-ish.com`, `calendly-ish.com`, `linear-ish.app`, `stripe-ish.com`. Clicking a preset sets the URL and starts the scan with the matching verdict index.

### Scanning panel (phase: scanning)
- `.bru` white panel, 24×28 padding.
- Header row: `SCANNING <URL>` (13px uppercase, letter-spacing 0.1em) + `N/6` counter right-aligned.
- 6-step vertical list (hook `useScanner` in `shared.jsx` drives it):
  1. "Pinging URL..."
  2. "Sniffing `<script>` tags..."
  3. "Guessing the database schema..."
  4. "Consulting the indie hacker oracle..."
  5. "Calculating Vercel bill..."
  6. "Printing verdict..."
- Each row: 16×16 black-bordered square status marker (green check when done, lime dot when active, empty when pending) + mono step label + animated `...` dots (3 staggered dots, 1.2s cycle) while active.
- Steps advance every **450ms**. After the last step, wait **300ms** then transition to `done`.
- Below the list: a 6px-tall progress bar, black border, lime fill, width = `step / total * 100%`, 400ms transition.

### Verdict panel (phase: done)
Structured in three zones, all divided by 2.5px black borders:

**Header strip** (`#f4f1e8`, 20×28 padding): left "▸ verdict for <name>" uppercase; right "generated by a robot · don't sue us" muted.

**Main body** (2-column grid, 1.2fr/1fr):
- Left (28px padding): eyebrow "buildable: <TIER>", then giant 88px score in tier color + "/ 100" muted, then 20px quoted verdict in display font, weight 500.
- Right: two rows (Time to clone / Monthly cost), each 20px padding, mono eyebrow + 36px display number.

**Stack receipt** (`#fafaf5`, 24×28 padding, full mono): eyebrow "✦ your stack receipt", then numbered rows (`01  Postgres …`) separated by dashed lines, right-aligned faux prices ("free tier", "vibes", "$0.00", "included"). Bottom row: solid 2px black top divider, bold "TOTAL" / cost.

**Tutorials bar** (lime bg, 18×28 padding, 2.5px black top border): "▸ N tutorials queued for your weekend of self-loathing" + black CTA button "email me the build guide →".

### Content data
`EXAMPLE_VERDICTS` array in `shared.jsx` has 6 pre-canned verdicts (Notion-ish through Figma-ish). Each has: `name`, `tier` (WEEKEND/MONTH/DON'T), `tierColor`, `score` (0-100), `time`, `cost`, `stack` (array), `verdict` (one-liner), `tutorials` (count). When a preset is clicked, the matching index is used; when the user types a URL, keep whatever verdict was last selected (or default to index 0).

---

## Content / copy

All copy is final and intentional — the jokes are the product. Pull verbatim from `shared.jsx`:

- `HEADLINES` — 4 hero variants (the primary is index 0: "Can I build this myself?" / "Paste any SaaS URL. We'll tell you if it's a weekend or a life sentence.")
- `EXAMPLE_VERDICTS` — 6 verdict records
- `TESTIMONIALS` — 6 testimonials (yes, keep "a raccoon" and "chittering intensifies")
- `HOW_STEPS` — 3 process steps
- `FAQS` — 6 Q&A pairs
- `FOOTER_EASTER` — 6 footer strings

---

## Interactions & behaviour

- **Scroll:** long scrollable page; nav is `position: sticky; top: 0; z-index: 10`.
- **Marquee:** CSS-only, 28s linear infinite, `translateX(0) → -50%`. Content duplicated inline so the seam is invisible.
- **Scan sequence:** 6 × 450ms = 2.7s scan + 300ms settle = ~3s total. Don't make it faster — the comedy lives in the fake-serious pacing.
- **Wobble CTA:** `go on then.` rotates ±1° over 4s, `ease-in-out infinite`.
- **FAQ:** click question row to toggle answer. Plus→minus, lime background when open.
- **Keyboard:** `Enter` in the URL input triggers scan.
- **No modals, no routing.** Everything is a single scroll page.

---

## Responsive notes

The prototype was designed at 1280px. At production time:
- Below ~900px, collapse 3-column grids (How it works, stack receipt 2-col) into 1 column.
- Below ~720px, the verdict panel should stack the left/right main zones vertically.
- Hero H1 uses `clamp()` and will self-size; keep it.
- Marquee is fine on mobile — it already overflows gracefully.
- Nav should collapse the text links behind a hamburger below ~700px; keep the lime CTA visible.

---

## Accessibility

- Lime on black passes AA for large text; don't use lime for body-sized text on cream.
- FAQ toggles: use `<button>` with `aria-expanded`; the prototype already uses buttons.
- Status chip uses a decorative green dot — the "robot is awake" text carries the meaning.
- The scanner button label changes; ensure screen readers get the update (live region or re-announce by key change).
- Motion: wrap the marquee, wobble, and loading dots in `@media (prefers-reduced-motion: reduce) { animation: none; }`.

---

## Assets

No images, no raster logos, no icon libraries. Everything is type + shape + unicode glyphs (`§`, `✦`, `★`, `✓`, `▸`, `◆`, arrows). Keep it that way — part of the aesthetic.

If you want a favicon, render the `§`-in-a-lime-square wordmark glyph at 32×32.

---

## Suggested component breakdown (for React/Vue/Svelte)

```
<Page>
  <Nav />
  <Hero>
    <StatusChip />
    <Headline variant={0} />
    <Scanner />                 // owns phase state
      <ScannerInput />
      <ScannerPresets />
      <ScanningPanel />         // visible when phase=scanning
      <VerdictPanel />          // visible when phase=done
    <HeroMicroNotes />
  </Hero>
  <Marquee items={…} />
  <VerdictGrid verdicts={EXAMPLE_VERDICTS} />
  <HowItWorks steps={HOW_STEPS} />
  <Testimonials items={TESTIMONIALS} />
  <Pricing />
  <FAQ items={FAQS} />
  <CTA />
  <Footer easter={FOOTER_EASTER} />
</Page>
```

---

## How to preview

Open `brutalist-preview.html` in any modern browser. It loads React + Babel from CDN and renders the full page inline. Scroll through, click the preset URLs, click "judge it", open FAQ items. What you see is what to build.
