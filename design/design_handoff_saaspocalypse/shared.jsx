// shared.jsx — content + shared hooks for all three directions

const HEADLINES = [
  { top: "Can I build this myself?", sub: "Paste any SaaS URL. We'll tell you if it's a weekend or a life sentence." },
  { top: "Your subscription is a skill issue.", sub: "We scan the SaaS. You build the SaaS. Economy healed." },
  { top: "Unsubscribe, but like, forever.", sub: "Drop a URL. Get a verdict, a stack, and a shame-free tutorial list." },
  { top: "It's just a CRUD app in a trenchcoat.", sub: "Let us prove it. Paste a URL and we'll undress the stack." },
];

const EXAMPLE_VERDICTS = [
  {
    name: "notion-ish.com",
    tier: "WEEKEND",
    tierColor: "#22c55e",
    score: 78,
    time: "14 hrs",
    cost: "$0.42/mo",
    stack: ["Postgres (tree-ish schema)", "Next.js + TipTap", "S3 for uploads", "auth.js"],
    verdict: "It's a rich-text editor with a database attached. You are the database.",
    tutorials: 3,
  },
  {
    name: "calendly-ish.com",
    tier: "WEEKEND",
    tierColor: "#22c55e",
    score: 82,
    time: "9 hrs",
    cost: "$0.00/mo",
    stack: ["Google Calendar API", "Next.js form", "Resend for emails", "sqlite"],
    verdict: "You're charging $12/mo for an if-statement and a calendar invite. Respect.",
    tutorials: 2,
  },
  {
    name: "linear-ish.app",
    tier: "MONTH",
    tierColor: "#eab308",
    score: 54,
    time: "6 weeks",
    cost: "$14/mo",
    stack: ["Postgres + CRDTs", "Electric/SQLite sync", "Websockets", "Tauri desktop"],
    verdict: "The UI is the product. Build the boring bug tracker in 2 days, spend 40 on the keyboard shortcuts.",
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
    verdict: "Absolutely not. This is the one thing worth paying for. Go outside.",
    tutorials: 0,
  },
  {
    name: "loom-ish.com",
    tier: "MONTH",
    tierColor: "#eab308",
    score: 48,
    time: "3 weeks",
    cost: "$9/mo",
    stack: ["MediaRecorder API", "Cloudflare Stream", "Next.js", "ffmpeg.wasm"],
    verdict: "The browser records video now. It's fine. The hard part is the little bouncy cursor.",
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
    verdict: "You'd need a rendering engine, a multiplayer engine, and a therapist. Pass.",
    tutorials: 1,
  },
];

const TESTIMONIALS = [
  { who: "dave, 34", role: "recovering solopreneur", quote: "Saaspocalypse told me my 'Uber for dogs' was a Google Form. It was. I saved $40k.", stars: 5 },
  { who: "@hackergrrrl", role: "perpetual side-project haver", quote: "Cancelled 11 subscriptions in one afternoon. My wife thinks I have a new girlfriend and her name is SQLite.", stars: 5 },
  { who: "brian", role: "indie hacker (unemployed)", quote: "Built three of them this weekend. Launched zero. Normal stuff.", stars: 4 },
  { who: "the ghost of YC '19", role: "haunts a WeWork", quote: "I raised $8M for what this site just told a college freshman he could build in 11 hours. No notes.", stars: 5 },
  { who: "linda", role: "CFO, small business", quote: "I don't know what 'Supabase' is but the robot says it costs zero dollars so I'm firing our SaaS budget.", stars: 5 },
  { who: "a raccoon", role: "found this in a dumpster", quote: "chittering intensifies", stars: 5 },
];

const HOW_STEPS = [
  { n: "01", t: "Paste the URL", b: "Of the SaaS you're about to subscribe to in a moment of weakness. Or the one you just did.", icon: "paste" },
  { n: "02", t: "We do the thing", b: "Our very smart robot (it's a prompt) scans the site, sniffs the JS, and guesses the schema. Mostly right. Sometimes hilariously wrong.", icon: "scan" },
  { n: "03", t: "Get the goods", b: "A buildability score, an itemized stack receipt, a time estimate, and a linked tutorial list. Then you ignore it and subscribe anyway.", icon: "receipt" },
];

const FAQS = [
  { q: "Is this real?", a: "Define 'real'. It runs. It returns JSON. Whether that JSON is 'true' is a philosophical question we are not qualified to answer." },
  { q: "Do you actually build the thing for me?", a: "No. That's the whole bit. We tell you you CAN build it. You, famously, will not. But you could. And that's beautiful." },
  { q: "Is it free?", a: "Yes. It will be free forever. If we ever add a paid tier, you have our permission to paste our own URL into it and build the replacement yourself." },
  { q: "What if I'm the SaaS and you roasted me?", a: "Congrats on the exposure. Also, don't worry — the indie hacker who read your verdict is currently 4 hours into yak-shaving their Tailwind config. You're safe." },
  { q: "Your verdict was wrong.", a: "Sometimes the robot thinks Webflow is a Postgres schema. We're working on it. By 'working on it' we mean we tweeted about it." },
  { q: "Can I use this to decide what to build?", a: "Yes, but inversely. If we say 'WEEKEND', the market is saturated. If we say 'DON'T', that's your billion-dollar idea. You're welcome." },
];

const FOOTER_EASTER = [
  "we're not a real company",
  "the robot is lying to you (a little)",
  "curl -X POST /verdict",
  "shoutout to supabase for existing",
  "if you're reading this you should ship",
  "no VCs were harmed",
];

// Shared tone rewriter — dials copy from tame to unhinged
function toneRewrite(text, dial) {
  if (dial < 30) return text.replace(/\b(lol|lmao|lmfao|bro)\b/gi, '').replace(/!{2,}/g, '.');
  if (dial > 80) return text + (Math.random() > 0.5 ? ' ⚡' : ' 🫠');
  return text;
}

// Hook: fake URL scan animation
// Returns { phase: 'idle'|'scanning'|'done', url, verdict, start, reset }
function useScanner(initialUrl = "") {
  const [phase, setPhase] = React.useState('idle');
  const [url, setUrl] = React.useState(initialUrl);
  const [verdictIdx, setVerdictIdx] = React.useState(0);
  const [step, setStep] = React.useState(0);

  const steps = [
    "Pinging URL...",
    "Sniffing <script> tags...",
    "Guessing the database schema...",
    "Consulting the indie hacker oracle...",
    "Calculating Vercel bill...",
    "Printing verdict...",
  ];

  React.useEffect(() => {
    if (phase !== 'scanning') return;
    let i = 0;
    setStep(0);
    const id = setInterval(() => {
      i++;
      setStep(i);
      if (i >= steps.length) {
        clearInterval(id);
        setTimeout(() => setPhase('done'), 300);
      }
    }, 450);
    return () => clearInterval(id);
  }, [phase]);

  const start = (u, idx) => {
    if (u) setUrl(u);
    if (typeof idx === 'number') setVerdictIdx(idx);
    setPhase('scanning');
  };
  const reset = () => { setPhase('idle'); setStep(0); };

  return {
    phase, url, setUrl,
    verdict: EXAMPLE_VERDICTS[verdictIdx],
    verdictIdx, setVerdictIdx,
    step, steps,
    start, reset,
  };
}

Object.assign(window, {
  HEADLINES, EXAMPLE_VERDICTS, TESTIMONIALS, HOW_STEPS, FAQS, FOOTER_EASTER,
  toneRewrite, useScanner,
});
