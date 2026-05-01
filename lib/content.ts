export const HEADLINES: { top: string; sub: string }[] = [
  {
    top: "Scan any SaaS. Find the weak spot.",
    sub: "Paste a URL. We score the moat, expose the stack, and show whether a small builder has a real opening.",
  },
  {
    top: "Your subscription is a skill issue.",
    sub: "We scan the SaaS. You build the SaaS. Economy healed.",
  },
  {
    top: "Unsubscribe, but like, forever.",
    sub: "Drop a URL. Get a verdict, a stack, and a shame-free tutorial list.",
  },
  {
    top: "It's just a CRUD app in a trenchcoat.",
    sub: "Let us prove it. Paste a URL and we'll undress the stack.",
  },
];

export const TESTIMONIALS = [
  {
    who: "dave, 34",
    role: "recovering solopreneur",
    quote:
      "Saaspocalypse told me my 'Uber for dogs' was a Google Form. It was. I saved $40k.",
    stars: 5,
  },
  {
    who: "@hackergrrrl",
    role: "perpetual side-project haver",
    quote:
      "Cancelled 11 subscriptions in one afternoon. My wife thinks I have a new girlfriend and her name is SQLite.",
    stars: 5,
  },
  {
    who: "brian",
    role: "indie hacker (unemployed)",
    quote: "Built three of them this weekend. Launched zero. Normal stuff.",
    stars: 4,
  },
  {
    who: "the ghost of YC '19",
    role: "haunts a WeWork",
    quote:
      "I raised $8M for what this site just told a college freshman he could build in 11 hours. No notes.",
    stars: 5,
  },
  {
    who: "linda",
    role: "CFO, small business",
    quote:
      "I don't know what 'Supabase' is but the robot says it costs zero dollars so I'm firing our SaaS budget.",
    stars: 5,
  },
  {
    who: "a raccoon",
    role: "found this in a dumpster",
    quote: "chittering intensifies",
    stars: 5,
  },
];

export const HOW_STEPS = [
  {
    n: "01",
    t: "Paste the URL",
    b: "Of the SaaS you're about to subscribe to in a moment of weakness. Or the one you just did.",
  },
  {
    n: "02",
    t: "We do the thing",
    b: "Our robot scans the site, sniffs the JS, and renders judgment with the calm confidence of someone who's never been hugged.",
  },
  {
    n: "03",
    t: "Get the goods",
    b: "A wedge score, an itemized stack receipt, a time estimate, and a linked tutorial list. Then you ignore it and subscribe anyway.",
  },
];

export const FAQS = [
  {
    q: "Is this real?",
    a: "Define 'real'. It runs. It returns JSON. Whether that JSON is 'true' is a philosophical question we are not qualified to answer.",
  },
  {
    q: "Do you actually build the thing for me?",
    a: "No, but we like your optimism. We tell you you CAN build it. You, famously, will not. But you could. And that's beautiful.",
  },
  {
    q: "Is it free?",
    a: "The verdict is free, forever. If you want the full step-by-step wedge guide for a specific report, that's $2 — paid once, not monthly. No subscriptions, no seats, no tiers. That's every price we have.",
  },
  {
    q: "What if I'm the SaaS and you roasted me?",
    a: "Congrats on the exposure. Also, don't worry — the indie hacker who read your verdict is currently 4 hours into yak-shaving their Tailwind config. You're safe.",
  },
  {
    q: "Your verdict was wrong.",
    a: "Sometimes the robot thinks Webflow is a Postgres schema. We're working on it. By 'working on it' we mean we tweeted about it.",
  },
  {
    q: "Can I use this to decide what to build?",
    a: "Yes — and read it sideways. SOFT means the engineering bar is low, so distribution is the real moat. FORTRESS means the head-on clone is suicide, but a wedge into a niche might be your billion-dollar idea. You're welcome.",
  },
];

export const MARQUEE_ITEMS = [
  "it's just a CRUD app",
  "your subscription funds a ping-pong table",
  "Postgres is free forever",
  "the backend is a google sheet",
  "Next.js on a potato",
  "Supabase has a generous free tier",
  "you have a laptop. build.",
  "venture capital is cope",
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
      label: "subject to fair-use rate limits — see terms",
    },
  },
  { text: "itemized stack receipts" },
  { text: "challenges ranked easy to nightmare, sorted accordingly" },
  { text: "a sassy verdict (non-negotiable)" },
  { text: "zero dark patterns, zero seat-based anything, zero recurring guilt" },
  { text: 'optional email nag 6 months later: "did u build it tho"' },
];
