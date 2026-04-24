export type Tier = "WEEKEND" | "MONTH" | "DON'T";

export type Verdict = {
  name: string;
  tier: Tier;
  tierColor: string;
  score: number;
  time: string;
  cost: string;
  stack: string[];
  verdict: string;
  tutorials: number;
};

export const HEADLINES: { top: string; sub: string }[] = [
  {
    top: "Can I build this myself?",
    sub: "Paste any SaaS URL. We'll tell you if it's a weekend or a life sentence.",
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

export const EXAMPLE_VERDICTS: Verdict[] = [
  {
    name: "notion-ish.com",
    tier: "WEEKEND",
    tierColor: "#22c55e",
    score: 78,
    time: "14 hrs",
    cost: "$0.42/mo",
    stack: [
      "Postgres (tree-ish schema)",
      "Next.js + TipTap",
      "S3 for uploads",
      "auth.js",
    ],
    verdict:
      "It's a rich-text editor with a database attached. You are the database.",
    tutorials: 3,
  },
  {
    name: "calendly-ish.com",
    tier: "WEEKEND",
    tierColor: "#22c55e",
    score: 82,
    time: "9 hrs",
    cost: "$0.00/mo",
    stack: [
      "Google Calendar API",
      "Next.js form",
      "Resend for emails",
      "sqlite",
    ],
    verdict:
      "You're charging $12/mo for an if-statement and a calendar invite. Respect.",
    tutorials: 2,
  },
  {
    name: "linear-ish.app",
    tier: "MONTH",
    tierColor: "#eab308",
    score: 54,
    time: "6 weeks",
    cost: "$14/mo",
    stack: [
      "Postgres + CRDTs",
      "Electric/SQLite sync",
      "Websockets",
      "Tauri desktop",
    ],
    verdict:
      "The UI is the product. Build the boring bug tracker in 2 days, spend 40 on the keyboard shortcuts.",
    tutorials: 5,
  },
  {
    name: "stripe-ish.com",
    tier: "DON'T",
    tierColor: "#ef4444",
    score: 8,
    time: "∞",
    cost: "a soul",
    stack: ["regulatory attorneys", "a bank", "PCI DSS", "tears"],
    verdict:
      "Absolutely not. This is the one thing worth paying for. Go outside.",
    tutorials: 0,
  },
  {
    name: "loom-ish.com",
    tier: "MONTH",
    tierColor: "#eab308",
    score: 48,
    time: "3 weeks",
    cost: "$9/mo",
    stack: [
      "MediaRecorder API",
      "Cloudflare Stream",
      "Next.js",
      "ffmpeg.wasm",
    ],
    verdict:
      "The browser records video now. It's fine. The hard part is the little bouncy cursor.",
    tutorials: 4,
  },
  {
    name: "figma-ish.com",
    tier: "DON'T",
    tierColor: "#ef4444",
    score: 12,
    time: "5 years",
    cost: "your 20s",
    stack: ["WebGL", "CRDTs", "a C++ renderer", "venture capital"],
    verdict:
      "You'd need a rendering engine, a multiplayer engine, and a therapist. Pass.",
    tutorials: 1,
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
    b: "Our very smart robot (it's a prompt) scans the site, sniffs the JS, and guesses the schema. Mostly right. Sometimes hilariously wrong.",
  },
  {
    n: "03",
    t: "Get the goods",
    b: "A buildability score, an itemized stack receipt, a time estimate, and a linked tutorial list. Then you ignore it and subscribe anyway.",
  },
];

export const FAQS = [
  {
    q: "Is this real?",
    a: "Define 'real'. It runs. It returns JSON. Whether that JSON is 'true' is a philosophical question we are not qualified to answer.",
  },
  {
    q: "Do you actually build the thing for me?",
    a: "No. That's the whole bit. We tell you you CAN build it. You, famously, will not. But you could. And that's beautiful.",
  },
  {
    q: "Is it free?",
    a: "Yes. It will be free forever. If we ever add a paid tier, you have our permission to paste our own URL into it and build the replacement yourself.",
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
    a: "Yes, but inversely. If we say 'WEEKEND', the market is saturated. If we say 'DON'T', that's your billion-dollar idea. You're welcome.",
  },
];

export const FOOTER_EASTER = [
  "we're not a real company",
  "the robot is lying to you (a little)",
  "curl -X POST /verdict",
  "shoutout to supabase for existing",
  "if you're reading this you should ship",
  "no VCs were harmed",
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

export const PRESET_URLS = [
  { label: "notion-ish.com", idx: 0 },
  { label: "calendly-ish.com", idx: 1 },
  { label: "linear-ish.app", idx: 2 },
  { label: "stripe-ish.com", idx: 3 },
];

export const PRICING_BULLETS = [
  "Unlimited URLs (please don't actually)",
  "Itemized stack receipts",
  "Tutorial links curated by a Real Human (who owes us a favor)",
  "A sassy verdict (non-negotiable)",
  "Zero dark patterns, zero upsells, zero seat-based anything",
  'Optional email nag 6 months later: "did u build it tho"',
];

export const SCAN_STEPS = [
  "Pinging URL...",
  "Sniffing <script> tags...",
  "Guessing the database schema...",
  "Consulting the indie hacker oracle...",
  "Calculating Vercel bill...",
  "Printing verdict...",
];
