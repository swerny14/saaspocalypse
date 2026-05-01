export const HEADLINES: { top: string; sub: string }[] = [
  {
    top: "Scan any SaaS. Find the weak spot.",
    sub: "Paste a URL. We score the moat, name the weakest opening, and tell you whether a small builder has a real angle of attack.",
  },
  {
    top: "Your incumbent has weak spots.",
    sub: "We find the attack angle before you spend six weeks heroically cloning the lobby.",
  },
  {
    top: "Don't clone the castle. Find the side door.",
    sub: "Drop a URL. Get a wedge score, a moat map, and a stack receipt with emotional damage.",
  },
  {
    top: "Some moats are just CSS with a PR team.",
    sub: "Let us check. Paste a URL and we'll separate the scary walls from the decorative fog machine.",
  },
];

export const TESTIMONIALS = [
  {
    who: "dave, 34",
    role: "recovering solopreneur",
    quote:
      "Saaspocalypse told me the market leader's moat was mostly onboarding friction and vibes. Horrible news for my excuses.",
    stars: 5,
  },
  {
    who: "@hackergrrrl",
    role: "perpetual side-project haver",
    quote:
      "I came for stack gossip and left with a niche wedge. My notes app now has a war room, which feels healthy.",
    stars: 5,
  },
  {
    who: "brian",
    role: "indie hacker (unemployed)",
    quote: "Found three wedge angles before lunch. Launched zero attacks. Growth mindset.",
    stars: 4,
  },
  {
    who: "the ghost of YC '19",
    role: "haunts a WeWork",
    quote:
      "I raised $8M for a moat this site described as 'distribution and a hoodie.' No notes.",
    stars: 5,
  },
  {
    who: "linda",
    role: "CFO, small business",
    quote:
      "I don't know what a wedge score is but the robot said our vendor's moat is thin, so procurement is being dramatic now.",
    stars: 5,
  },
  {
    who: "marcus",
    role: "B2B founder, pre-revenue in three tabs",
    quote:
      "It did not tell me to build Calendly. It told me where Calendly is annoying. Much ruder, much more useful.",
    stars: 5,
  },
];

export const HOW_STEPS = [
  {
    n: "01",
    t: "Paste a URL",
    b: "The SaaS in your market, your invoice inbox, or your 'surely I can do a better version of this' spiral.",
  },
  {
    n: "02",
    t: "We map the moat",
    b: "The scanner sniffs the stack, scores seven moat axes, and looks for the part of the fortress held together by onboarding copy.",
  },
  {
    n: "03",
    t: "Pick your wedge",
    b: "You get a wedge score, weakest moat axis, stack receipt, build complexity, and a paid wedge guide if you want the battle plan instead of just the heckling.",
  },
];

export const FAQS = [
  {
    q: "Is this real?",
    a: "Real enough to fetch a homepage, score a moat, and hurt your feelings with structured JSON. Not real enough to replace judgment, market research, or talking to customers like a normal adult.",
  },
  {
    q: "Does this tell me what to build?",
    a: "It tells you where the incumbent looks weakest. That is not the same as product-market fit, but it is better than staring at a pricing page and whispering 'AI wrapper?' into the void.",
  },
  {
    q: "Is it free?",
    a: "The verdict is free, forever. If you want the full step-by-step wedge guide for a specific report, that's $2 - paid once, not monthly. No subscriptions, no seats, no tiers. That's every price we have.",
  },
  {
    q: "What if I'm the SaaS and you roasted me?",
    a: "Congrats on the exposure. Also, don't worry - the indie hacker who read your verdict is currently 4 hours into yak-shaving their Tailwind config. You're safe.",
  },
  {
    q: "Your verdict was wrong.",
    a: "Sometimes the robot mistakes a landing page flex for a moat and sometimes it misses the boring enterprise procurement wall hiding in plain sight. We're tuning it. By 'tuning it' we mean arguing with spreadsheets.",
  },
  {
    q: "Can I use this to decide what to build?",
    a: "Yes - and read it sideways. SOFT means the moat is thin, not that customers will magically appear wearing little buyer hats. FORTRESS means the head-on clone is bad cardio; a narrow wedge may still be the whole game.",
  },
];

export const MARQUEE_ITEMS = [
  "find the opening",
  "moats hate receipts",
  "distribution is the final boss",
  "the stack is not the moat",
  "thin moat, loud pricing page",
  "your wedge has entered the chat",
  "some castles are mostly onboarding",
  "venture capital is not a moat",
];

export type PricingBullet = {
  text: string;
  /** Optional footnote rendered as a small superscript link. */
  footnote?: { href: string; label: string };
};

export const PRICING_BULLETS: PricingBullet[] = [
  {
    text: "unlimited URLs (please don't actually)",
    footnote: {
      href: "/terms#the-free-scan-service",
      label: "subject to fair-use rate limits - see terms",
    },
  },
  { text: "itemized stack receipts" },
  { text: "seven-axis moat scoring, because one number needs accomplices" },
  { text: "the weakest opening called out in public, which is rude but efficient" },
  { text: "build complexity without pretending every market is a harmless toy" },
  { text: "zero dark patterns, zero seat-based anything, zero recurring guilt" },
  { text: 'optional emotional support line: "please do not attack Stripe head-on"' },
];
