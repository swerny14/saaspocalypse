# Handoff: Saaspocalypse Blog — Layout A + Sample Article

## Overview

This package covers two screens for the **Saaspocalypse** blog (a satirical "indie hacker confessions" publication):

1. **Blog index — Layout A** ("Editorial broadsheet"): a featured serif headline + 3-up card grid for older posts.
2. **Sample article** ("Just one more feature"): the single-post detail page.

Both share a brutalist editorial aesthetic — heavy black rules, hard offset shadows, cream paper background, lime/yellow/coral spot colors, and a serif/sans/mono type pairing.

## About the Design Files

The files in `reference/` are **design references created in HTML/React** — prototypes that show intended look and behavior. They are **not production code to copy directly**. The mocks were built inside a `DesignCanvas` (a pan/zoom inspector tool); you should ignore that wrapper entirely and focus on the two top-level components: `BlogIndexA` and `BlogArticle`, plus the shared `BlogShell` and `NewsletterBlock`.

Your job is to **recreate these designs in the target codebase's existing environment** (React, Next.js, Astro, Vue, etc.) using its established patterns, routing, and content layer (MDX, CMS, etc.) — or, if no environment exists yet, choose the most appropriate framework and implement them there.

## Fidelity

**High-fidelity (hifi).** All colors, fonts, sizes, weights, spacing, and decorative details (offset shadows, dashed dividers, rotated highlight blocks) are intentional. Match the look pixel-for-pixel using your codebase's component primitives. Treat copy as final unless the user says otherwise.

---

## Design Tokens

These are shared with the rest of the Saaspocalypse site. Drop them into your design-system / theme file.

### Colors
| Token   | Hex       | Usage |
|---------|-----------|-------|
| `INK`   | `#0a0a0a` | All text, all borders, primary buttons |
| `CREAM` | `#f4f1e8` | Page background |
| `PAPER` | `#ffffff` | Card backgrounds, input fields, top nav |
| `LIME`  | `#c6ff00` | Spot accent #1 — logo wordmark fill, button text-on-ink, callouts, tag highlight |
| `YELLOW`| `#ffd84d` | Spot accent #2 — featured-post left tile |
| `CORAL` | `#ff6b4a` | Spot accent #3 — newsletter card (variant A) |

### Typography
Three Google Fonts, loaded together:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;700&family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap" rel="stylesheet" />
```

| Token          | Stack                                                  | Usage |
|----------------|--------------------------------------------------------|-------|
| `FONT_DISPLAY` | `"Space Grotesk", system-ui, sans-serif`               | Logo, sans display text, buttons, newsletter heading |
| `FONT_BODY`    | `"Space Grotesk", system-ui, sans-serif`               | Body paragraphs, excerpts |
| `FONT_MONO`    | `"JetBrains Mono", ui-monospace, monospace`            | Eyebrows, dates, tags, labels, nav links — uppercase, tracked |
| `FONT_SERIF`   | `"Fraunces", Georgia, serif`                           | Editorial headlines (masthead, featured title, card titles, article H1/H2, italic callouts) |

### Borders, shadows, radii
- **Border weights:** primary `2.5px solid INK`, secondary `1.5px solid INK`, separator `1.5px dashed INK`. No rounded corners anywhere — every element is hard-edged.
- **Offset shadow ("brutalist drop"):**
  - Standard cards: `box-shadow: 5px 5px 0 0 #0a0a0a` over a `2.5px solid #0a0a0a` border.
  - Newsletter card: `box-shadow: 8px 8px 0 0 #0a0a0a`.
- **Border radius:** `0` everywhere.

### Spacing
Used pixel values (no formal scale): `6, 8, 10, 12, 14, 16, 18, 20, 22, 24, 28, 32, 38, 40, 44, 56`. Page outer padding is `40px 32px 56px`; top nav padding is `14px 32px`. Card grid gap is `16px`. Featured-row gap is `28px`.

### Letter-spacing patterns
- Mono labels: `0.1em–0.2em`, always `text-transform: uppercase`.
- Serif headlines: tight, `-0.025em` to `-0.04em`.
- Sans display headlines: `-0.02em` to `-0.05em`.
- Body: default (no tracking).

---

## Shared Shell (used by both screens)

A `BlogShell` wraps both screens. Reference: `reference/blog-layouts.jsx`, lines 15–38.

### Top Nav (`<header>`)
- Full-width white bar (`background: PAPER`).
- `border-bottom: 2.5px solid INK`.
- Padding: `14px 32px`.
- Layout: flex, space-between, baseline-aligned.
- **Left cluster** (gap `14px`, baseline):
  - Logo wordmark: text "saaspocalypse", `background: INK`, `color: LIME`, padding `3px 10px`, `font: 700 18px FONT_DISPLAY`, `letter-spacing: 0.05em`.
  - Tagline: text "/ the blog", `font: 11px FONT_MONO`, `opacity: 0.5`, `letter-spacing: 0.1em`, uppercase.
- **Right cluster — nav** (gap `22px`):
  - Items: `scan`, `archive`, `blog`, `about`.
  - `font: 700 12px FONT_MONO`, `letter-spacing: 0.08em`, uppercase, `color: INK`.
  - Active item ("blog") gets `border-bottom: 2px solid INK` with `padding-bottom: 2px`.
  - Hover state (add when implementing): underline appears, `text-decoration-thickness: 2px`, color stays.

### Page wrapper
Inside the nav, content sits in `padding: 40px 32px 56px`, max-width centered:
- **Layout A:** `max-width: 1200px`.
- **Article:** `max-width: 780px`.

---

## Screen 1 — Blog Index (Layout A)

Reference: `reference/blog-layouts.jsx`, function `BlogIndexA` (lines 43–130).

### Sections, top to bottom

#### 1. Masthead row
- `border-bottom: 2.5px solid INK`, `padding-bottom: 18px`, `margin-bottom: 28px`.
- Flex row, space-between, baseline-aligned.
- **Left:**
  - H1, two lines, `font: 700 64px Fraunces`, `letter-spacing: -0.04em`, `line-height: 0.95`, `margin: 0`. Copy:
    - Line 1: `field notes from`
    - Line 2: `<em>the apocalypse.</em>` — the `<em>` gets `background: LIME`, `padding: 0 8px`. Italic comes from Fraunces' italic axis.
  - Subtitle paragraph, `font: 16px FONT_BODY`, `opacity: 0.7`, `max-width: 640px`, `margin-top: 14px`. Copy: *"Essays and confessions from indie hackers who probably shouldn't be left alone with a dev server. Updated when we feel like it."*
- **Right (issue marker):** mono, `11px`, `opacity: 0.6`, `letter-spacing: 0.1em`, uppercase, right-aligned, two lines:
  - `▸ vol. 02 · iss. 14`
  - `▸ apr 2026`

#### 2. Featured article block
- CSS Grid: `grid-template-columns: 1.4fr 1fr`, `gap: 28px`.
- `padding-bottom: 32px`, `border-bottom: 2.5px solid INK`, `margin-bottom: 32px`.
- **Left tile** (the yellow card):
  - `background: YELLOW (#ffd84d)`, `border: 2.5px solid INK`, `box-shadow: 5px 5px 0 0 INK`, `padding: 28px 32px`, `min-height: 320px`.
  - Flex column, space-between.
  - **Top row:** mono `11px 700`, `letter-spacing: 0.15em`, uppercase, flex space-between:
    - Left: `▸ this week's confession`
    - Right: post date, lowercased (e.g. `apr 23, 2026`)
  - **Bottom:** quoted headline, `font: 700 44px Fraunces`, `letter-spacing: -0.025em`, `line-height: 1.05`, `text-wrap: balance`, `margin-top: 20px`. Wrap the post title in real `"…"` quote marks.
- **Right column:**
  - Flex column, space-between (so excerpt sits at top, CTA cluster at bottom).
  - Excerpt paragraph: `font: 19px FONT_BODY`, `line-height: 1.5`, `text-wrap: pretty`, `margin: 0`.
  - Bottom cluster:
    - Tag row, gap `8px`, margin-bottom `14px`. Each tag: `font: 11px FONT_MONO`, `padding: 3px 8px`, `border: 2px solid INK`, `background: PAPER`, prefix `#`. After tags, an extra `▸ {readTime} read` mono span at `opacity: 0.6`.
    - Primary CTA button: `background: INK`, `color: LIME`, `font: 700 16px FONT_DISPLAY`, `padding: 12px 22px`, `letter-spacing: -0.01em`, no border, no radius. Copy: `→ read the whole confession`.

#### 3. Category chip row
- Flex row, gap `8px`, baseline aligned, `margin-bottom: 22px`.
- Leading mono label: `browse:`, `11px 700`, `letter-spacing: 0.15em`, uppercase, `opacity: 0.5`, `margin-right: 6px`.
- Chips: `all`, `essays`, `opinion`, `build-log`, `roasts`.
  - Common: `font: 700 12px FONT_MONO`, `padding: 5px 12px`, `border: 2px solid INK`, `letter-spacing: 0.05em`.
  - Active (first one, `all`): `background: INK`, `color: LIME`.
  - Inactive: `background: PAPER`, `color: INK`.
  - Add hover: invert to active style.

#### 4. Post grid (3-up cards)
- CSS Grid: `grid-template-columns: repeat(3, 1fr)`, `gap: 16px`.
- Each card (`<article>`):
  - `border: 2.5px solid INK`, `background: PAPER`, `padding: 20px 22px`, `min-height: 260px`.
  - Flex column, gap `12px`. **No offset shadow on these cards** — only the featured tile and newsletter use the drop shadow.
  - **Top meta row:** mono `10px 700`, `letter-spacing: 0.15em`, uppercase, `opacity: 0.7`, flex space-between.
    - Left: `№ 02`, `№ 03`, … (zero-padded, starting at 02 because the featured was 01).
    - Right: lowercased date.
  - **Title:** `font: 700 22px Fraunces`, `letter-spacing: -0.015em`, `line-height: 1.15`, `text-wrap: balance`.
  - **Excerpt:** `font: 14px FONT_BODY`, `line-height: 1.55`, `opacity: 0.75`, `flex: 1` so the footer stays pinned.
  - **Footer row:** flex, space-between, center-aligned, `border-top: 1.5px dashed INK`, `padding-top: 10px`.
    - Left: up to 2 tags as `#tag` text only (no border), mono `10px`, `opacity: 0.65`, gap `6px`.
    - Right: read time, mono `10px`, `opacity: 0.65`.
  - Hover state to add: lift via `transform: translate(-2px, -2px)` and add `box-shadow: 4px 4px 0 0 INK`, snap back on leave.

#### 5. Newsletter block
See "Newsletter Block" section below — Layout A uses `variant="A"` (coral).

---

## Screen 2 — Sample Article

Reference: `reference/blog-layouts.jsx`, function `BlogArticle` (lines 219–289). Article body content lives in `reference/blog-data.jsx` as `SAMPLE_ARTICLE`.

Wrapper: same `BlogShell`, but `max-width: 780px`.

### Sections, top to bottom

#### 1. Breadcrumb
- Mono `11px 700`, `letter-spacing: 0.1em`, uppercase, `opacity: 0.6`, `margin-bottom: 28px`.
- Format: `← blog  /  essays  /  this one` — the trailing crumb dims further to `opacity: 0.4`. Separators are literal ` / ` with surrounding nbsp.

#### 2. Article header
- `margin-bottom: 32px`.
- **Tag row:** flex, gap `8px`, `margin-bottom: 18px`. Each tag: `font: 700 11px FONT_MONO`, `padding: 3px 10px`, `border: 2px solid INK`, **`background: LIME`**, `letter-spacing: 0.05em`, prefix `#`.
- **H1:** `font: 700 56px Fraunces`, `line-height: 1.0`, `letter-spacing: -0.03em`, `text-wrap: balance`, `margin: 0`.
- **Byline strip:** flex row, gap `22px`, mono `12px 700`, `letter-spacing: 0.1em`, uppercase, `opacity: 0.7`, `padding-top: 16px`, `border-top: 1.5px solid INK`, `margin-top: 20px`. Items in order:
  1. `by {author}`
  2. lowercased date
  3. `{readTime} read`
  4. (right-aligned, `margin-left: auto`, `opacity: 0.5`) `scroll for more cope`

#### 3. Body
Render an array of blocks (see `SAMPLE_ARTICLE.body` in `reference/blog-data.jsx`). Three block types:

**`p` — paragraph**
`font: 18px FONT_BODY`, `line-height: 1.65`, `text-wrap: pretty`, `margin: 0 0 18px`.

**`h2` — section heading**
`font: 700 30px Fraunces`, `letter-spacing: -0.02em`, `line-height: 1.15`, `margin: 38px 0 14px`.

**`callout` — pull-quote**
- `background: LIME`, `border: 2.5px solid INK`, `box-shadow: 5px 5px 0 0 INK`.
- `padding: 20px 24px`, `margin: 24px 0`.
- `font: 600 italic 24px Fraunces`, `line-height: 1.3`, `text-wrap: balance`.
- Wrap content in real `"…"` quote marks.

(In your implementation, this maps cleanly to MDX components or a CMS rich-text renderer with three custom block types.)

#### 4. End matter
- `border-top: 2.5px solid INK`, `margin-top: 40px`, `padding-top: 24px`.
- Flex row, space-between, center-aligned, wrap, gap `16px`.
- **Left:** `▸ filed under: essays` — mono `12px`, `opacity: 0.7`. The category name is `font-weight: 700`, full-opacity.
- **Right:** prev/next button pair, gap `10px`. Each button: `font: 700 12px FONT_MONO`, `letter-spacing: 0.1em`, uppercase, `padding: 8px 14px`, `border: 2px solid INK`.
  - **Prev:** `background: PAPER`, `color: INK`. Copy: `← prev`.
  - **Next:** `background: INK`, `color: LIME`. Copy: `next →`.

#### 5. Newsletter block
Compact variant — `variant="A"`, `compact={true}`. See below.

---

## Newsletter Block (shared component)

Reference: `reference/blog-layouts.jsx`, function `NewsletterBlock` (lines 295–334).

Two variants. The blog index uses **A** (coral on cream), the article footer uses **A compact**.

- Common: `border: 2.5px solid INK`, `box-shadow: 8px 8px 0 0 INK`, no radius.
- `margin-top: 56px` (default) or `40px` (compact).
- CSS Grid: `1.2fr 1fr` (default) / `1fr auto` (compact). Gap `28px`. Items center-aligned.
- Padding: `40px 44px` (default) / `28px 32px` (compact).
- **Variant A:** `background: CORAL`, `color: INK`.
- **Variant B (not used in this handoff but kept for completeness):** `background: INK`, `color: CREAM`.

### Left side
- Eyebrow: mono `11px 700`, `letter-spacing: 0.2em`, uppercase, `opacity: 0.7` (A) / `0.5` (B), `margin-bottom: 8px`. Copy: `▸ the worst newsletter in indie hacking`.
- Headline: `font: 700 38px FONT_DISPLAY` (default) / `28px` (compact), `letter-spacing: -0.025em`, `line-height: 1.1`, `text-wrap: balance`. Copy: `One email. Roughly weekly. Possibly funny. Definitely real.`
- (Default only) supporting paragraph: `font: 15px FONT_BODY`, `line-height: 1.55`, `opacity: 0.8`, `max-width: 460px`, `margin-top: 12px`. Copy: `Sent when there's something to say, not when the calendar reminder fires. Currently {N} indie hackers reading and slowly nodding.` — the count `{N}` is a static integer (the mock randomized between 4200–7200; pick one and freeze it, or wire it to real subscriber count if you have one).

### Right side — email form
- `border: 2.5px solid INK`, `background: PAPER`, no gap between input and button.
- Input: `flex: 1`, `padding: 14px 16px`, `font: 14px FONT_MONO`, no border, transparent background, placeholder `you@laptop.local`, `min-width: 180px`.
- Submit button: `font: 700 14px FONT_DISPLAY`, `background: LIME`, `color: INK`, `border-left: 2.5px solid INK` (and no other borders), `padding: 0 18px`, `letter-spacing: -0.01em`, `white-space: nowrap`. Copy: `→ subscribe`.

---

## Interactions & Behavior

The mocks are static — fill these in for production:

- **Top nav links:** route to the listed sections. The "blog" link is active on both screens (use whatever active-state mechanism your router provides; render the `border-bottom: 2px solid INK` underline).
- **Category chips (Layout A):** clicking filters the post grid. Active chip uses the inverted (ink/lime) style. URL state recommended (`?cat=essays`) so links are shareable.
- **Featured article block, post cards, list items:** the entire card is a link to the post detail page. Cursor pointer on hover.
- **Card hover (post grid):** translate `(-2px, -2px)` and add `box-shadow: 4px 4px 0 0 INK`. Transition `transform 120ms ease, box-shadow 120ms ease`.
- **Primary CTA buttons (`→ read the whole confession`, `next →`):** hover — push down 2px (`transform: translate(2px, 2px)`) and remove any shadow. Active — same. Mimics a physical key press.
- **Newsletter form:** standard email submit. Validate non-empty + email shape on the client. On submit, swap the form for an inline success state (mono "▸ subscribed. brace yourself.") in the same dimensions.
- **Article prev/next:** route to neighbouring posts (chronological). Disable + dim to `opacity: 0.4` if at the start/end of the archive.
- **Breadcrumb back-link:** `← blog` routes to `/blog`.

### Animations / transitions
None on initial render. All interaction states are 120–150ms ease. Avoid fade-ins or scroll-driven effects — the brutalist aesthetic depends on snap.

### Loading states
- Index: skeleton cards using the same border + min-height, with three pulsing horizontal bars (mono-eyebrow, title, excerpt). No spinners.
- Article: render header immediately, body progressively.

### Responsive behavior
The mocks were designed at desktop width. Recommended breakpoints:

- **`>= 1024px`:** as designed.
- **`768–1023px`:**
  - Layout A: featured grid collapses to single column (yellow tile on top, right column below). Post grid → 2 columns. Newsletter block → 1 column, button below input.
  - Article: same shell, `max-width: 720px`.
  - Top nav stays horizontal.
- **`< 768px`:**
  - Page padding drops to `24px 18px 40px`.
  - All multi-column grids → single column.
  - Masthead H1 (Layout A): `font-size: clamp(40px, 10vw, 56px)`. Issue marker hides.
  - Article H1: `clamp(36px, 9vw, 48px)`.
  - Newsletter form: input above button, full-width, button gets `border-top: 2.5px solid INK` instead of border-left.
  - Top nav: collapse to a hamburger that drops a full-screen overlay menu (same mono uppercase items, larger).

---

## State Management

Light. None of this requires global state.

- **Index:** active category (chip filter) — local component state, mirror to URL `?cat=`.
- **Article:** none. Static content rendered from data source.
- **Newsletter:** local form state (email value, submitting, success/error).
- **Data source:** treat each post as a content record. The mock uses a flat array (`reference/blog-data.jsx`); in production, source from your CMS / MDX folder / database. Article body is an ordered array of typed blocks (`p` / `h2` / `callout`) — your renderer should handle these three types. Add new block types (image, code, etc.) as the editorial calendar demands them.

### Post record shape
```ts
type Post = {
  id: string;
  title: string;
  excerpt: string;
  date: string;        // human-readable, e.g. "Apr 23, 2026"
  readTime: string;    // e.g. "7 min"
  tags: string[];      // 1–3
  category: 'essays' | 'opinion' | 'build-log' | 'roasts';
  author: string;      // first name, lowercase
  featured?: boolean;
  body?: Array<        // present on detail page
    | { type: 'p'; text: string }
    | { type: 'h2'; text: string }
    | { type: 'callout'; text: string }
  >;
};
```

---

## Content (final copy)

All post titles, excerpts, and the full sample article body are in `reference/blog-data.jsx`. Treat this copy as final unless the editor revises it. Specifically:
- **10 posts** in `BLOG_POSTS` for the index (post 1 is featured).
- **`SAMPLE_ARTICLE`** is post 1 with a `body` array attached — use this as the article-detail content.

---

## Assets

No images, icons, or illustrations. The `▸` and `→` and `←` characters are real Unicode (`U+25B8`, `U+2192`, `U+2190`) — use them as text, do not replace with SVG.

---

## Files in this bundle

```
design_handoff_blog_layout_a/
├── README.md                        ← this file
└── reference/
    ├── blog.html                    ← entry point; loads the canvas + the three layouts
    ├── blog-layouts.jsx             ← BlogShell, BlogIndexA, BlogIndexB, BlogArticle, NewsletterBlock
    ├── blog-data.jsx                ← BLOG_POSTS array + SAMPLE_ARTICLE body
    └── design-canvas.jsx            ← the inspector wrapper — IGNORE, not part of the design
```

For implementation, the only components that matter are `BlogIndexA`, `BlogArticle`, `BlogShell`, and `NewsletterBlock` in `blog-layouts.jsx`, and the data in `blog-data.jsx`. `BlogIndexB` is a sibling layout variation that is **not part of this handoff** — ignore it.

To run the reference locally: open `blog.html` in a modern browser (it loads React + Babel from a CDN; no build step needed).
