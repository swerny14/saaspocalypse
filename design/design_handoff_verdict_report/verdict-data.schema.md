# Verdict data schema + examples

The component accepts one prop: `v: VerdictReport`.

## Type

```ts
type Tier = 'WEEKEND' | 'MONTH' | "DON'T";
type Difficulty = 'easy' | 'medium' | 'hard' | 'nightmare';

type VerdictReport = {
  id: string;                 // slug used in the verdict header ID (e.g. "notion")
  name: string;               // "notion-ish.com"
  tagline: string;            // "block-based docs + database"
  scannedAt: string;          // "2026.04.24 · 14:32"

  // Verdict tier
  tier: Tier;
  tierBg: string;             // pale bg used in score cell + tier pill
  tierColor: string;          // darker fg (unused in variation A; kept for future use)
  score: number;              // 0..100

  // Narrative
  take: string;               // blunt 1-2 sentence verdict, rendered as a quote
  take_sub: string;           // follow-up explanation paragraph

  // Cost — what they charge
  currentCost: {
    label: string;            // "Plus plan"
    price: number | string;   // 10 or "2.9% + $0.30"
    unit: string;              // "seat/mo"
    annual: number | string;  // 120 or "scales w/ GMV"
    note?: string;            // optional small print
  };

  // Cost — what building it costs you
  estCost: Array<{
    line: string;             // "Vercel (hobby tier)"
    cost: number | string;    // 0 or "???"
  }>;
  estTotal: number | string;  // 1.00 or 172000
  breakEven: string;          // "immediately — pays for itself on day one"

  // Alternatives (exactly 3; fill with empties if fewer)
  alternatives: Array<{
    name: string;             // "Cal.com (self-host)"
    why: string;              // one-line reason
  }>;

  // Challenges (any number — visually tested with 5–6)
  challenges: Array<{
    diff: Difficulty;
    name: string;             // "Recursive page tree"
    note: string;              // one-line implementation hint
  }>;

  // Recommended stack (shown as pills, 3–5 entries ideal)
  stack: string[];

  // Time
  timeEstimate: string;       // "14 hours" / "6 weeks" / "∞"
  timeBreakdown: string;      // "1 weekend hacking · 4 evenings polishing"
};
```

## Tier → bg/color mapping

```ts
const TIER_THEME = {
  WEEKEND: { tierBg: '#dcfce7', tierColor: '#22c55e' },
  MONTH:   { tierBg: '#fef9c3', tierColor: '#eab308' },
  DONT:    { tierBg: '#fee2e2', tierColor: '#ef4444' },  // key for "DON'T"
};
```

## Example (WEEKEND, high score)

```js
{
  id: 'calendly',
  name: 'calendly-ish.com',
  tagline: 'scheduling link generator',
  scannedAt: '2026.04.24 · 14:48',
  tier: 'WEEKEND',
  tierBg: '#dcfce7',
  tierColor: '#22c55e',
  score: 86,
  take: "You're charging $12/mo for an if-statement and a calendar invite. Respect. But also, an if-statement.",
  take_sub: "The whole product is: check Google Calendar busy times, subtract from a schedule template, render the gaps as clickable buttons. That's the tweet.",
  currentCost: { label: 'Standard plan', price: 12, unit: 'user/mo', annual: 144 },
  estCost: [
    { line: 'Vercel (hobby tier)', cost: 0 },
    { line: 'Google Calendar API', cost: 0 },
    { line: 'Resend (notifications)', cost: 0 },
    { line: 'Domain', cost: 1.00 },
  ],
  estTotal: 1.00,
  breakEven: 'immediately — pays for itself on day one',
  alternatives: [
    { name: 'Cal.com (self-host)', why: 'open source. Docker-up. Genuinely feature-complete.' },
    { name: 'Zcal, SavvyCal free tier', why: 'if you want to skip the build.' },
    { name: 'A bento.me booking link', why: 'if your needs are two per week.' },
  ],
  challenges: [
    { diff: 'easy',   name: 'OAuth with Google',         note: 'Literally follow the quickstart.' },
    { diff: 'easy',   name: 'Read busy times',            note: 'One API call. freebusy.query.' },
    { diff: 'medium', name: 'Availability template UI',   note: 'Weekly grid. Checkboxes. Done.' },
    { diff: 'medium', name: 'Timezone math',              note: 'Use Luxon. Do not roll your own. Please.' },
    { diff: 'hard',   name: 'Round-robin team scheduling', note: 'Only if you have a team. You do not.' },
  ],
  stack: ['Next.js + form actions', 'Google Calendar API (freebusy)', 'Resend for emails', 'SQLite via Turso'],
  timeEstimate: '9 hours',
  timeBreakdown: '1 Saturday morning, minus a coffee break',
}
```

## Example (DON'T, very low score)

```js
{
  id: 'stripe',
  name: 'stripe-ish.com',
  tagline: 'payments infrastructure',
  scannedAt: '2026.04.24 · 15:29',
  tier: "DON'T",
  tierBg: '#fee2e2',
  tierColor: '#ef4444',
  score: 6,
  take: "Absolutely not. This is the one thing on the internet that is genuinely worth paying for. Put your laptop down. Go outside.",
  take_sub: "You are not going to get PCI DSS Level 1 certified this weekend...",
  currentCost: { label: 'Standard rate', price: '2.9% + $0.30', unit: 'per txn', annual: 'scales w/ GMV', note: 'no seat fees, no monthly minimum' },
  estCost: [
    { line: 'PCI DSS Level 1 audit', cost: 50000 },
    { line: 'Acquiring bank relationship', cost: '???' },
    // ...
  ],
  estTotal: 172000,
  breakEven: 'approximately never',
  // ...
}
```

See `verdict-report-preview.html` for all 4 examples rendered inline.
