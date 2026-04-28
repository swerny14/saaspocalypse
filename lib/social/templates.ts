import type { Tier } from "@/lib/scanner/schema";

export type TweetCount = 1 | 2;

export type ReportTemplateId =
  | "report.verdict_quote"
  | "report.score_card"
  | "report.cost_punchline"
  | "report.weekend_pitch"
  | "report.dont_riff";

export type OriginalTemplateId =
  | "original.aphorism"
  | "original.scope_creep"
  | "original.cost_anchor"
  | "original.directory_riff";

export type TemplateId = ReportTemplateId | OriginalTemplateId;

export type ReportTemplate = {
  id: ReportTemplateId;
  kind: "report";
  tweet_count: TweetCount;
  /** Optional tier restriction. WEEKEND-only / DON'T-only templates use this. */
  tier?: Tier;
  description: string;
  examples: string[];
};

export type OriginalTemplate = {
  id: OriginalTemplateId;
  kind: "original";
  tweet_count: TweetCount;
  /** If true, the post is required to include a link to the directory. */
  links_to_directory?: boolean;
  description: string;
  examples: string[];
};

export type Template = ReportTemplate | OriginalTemplate;

/* ──────────────── Report templates ──────────────── */

export const REPORT_TEMPLATES: ReportTemplate[] = [
  {
    id: "report.verdict_quote",
    kind: "report",
    tweet_count: 1,
    description:
      "Lead with a short quote pulled (or distilled) from the report's `take`. Then on a new line: name + tier + time_estimate + URL. Voice: lowercase-deadpan for the quote line, sentence case fine for the verdict line.",
    examples: [
      `"you're charging $12/mo for an if-statement and a calendar invite. respect."

calendly.com — WEEKEND, 9 hours. https://www.saaspocalypse.dev/r/calendly-com`,
      `"the bug tracker is a weekend. the feel is a month."

linear.app — MONTH, 6 weeks. https://www.saaspocalypse.dev/r/linear-app`,
    ],
  },
  {
    id: "report.score_card",
    kind: "report",
    tweet_count: 1,
    description:
      "One-line score-forward receipt. Format: `<name>: <score>/100. <TIER> tier. <time_estimate> if you hate yourself a little. stack: <2-3 stack items separated by  ·  >. <URL>`. Stack items are concrete (Next.js, Supabase, cmdk), not categories.",
    examples: [
      `notion.so: 78/100. WEEKEND tier. 14 hours if you hate yourself a little. stack: Next.js · TipTap · Postgres. https://www.saaspocalypse.dev/r/notion-so`,
      `figma.com: 8/100. DON'T tier. ∞ if you hate yourself enough. stack: a renderer · a CRDT · a decade. https://www.saaspocalypse.dev/r/figma-com`,
    ],
  },
  {
    id: "report.cost_punchline",
    kind: "report",
    tweet_count: 2,
    description:
      "TWO TWEETS. Tweet 1: head — punchline that contrasts the product's pricing (current_cost.price + unit) with what running your own would actually cost (est_total). Then the URL on its own line. Tweet 2: reply — single line stack receipt, format `the actual stack: <2-3 stack items separated by  ·  >`. The URL must appear ONLY on tweet 1.",
    examples: [
      `their stripe bill: 2.9% + $0.30 forever. your stripe rebuild: $172,000 in audits and a divorce.

https://www.saaspocalypse.dev/r/stripe-com
---
the actual stack: regulatory attorneys · a bank · SOC 2 · your remaining tears.`,
      `their pitch: $12 per user per month. your build: $46/mo and three weekends.

https://www.saaspocalypse.dev/r/calendly-com
---
the actual stack: Next.js · Google Calendar API · Resend.`,
    ],
  },
  {
    id: "report.weekend_pitch",
    kind: "report",
    tweet_count: 1,
    description:
      "WEEKEND-tier only. Direct challenge tone: '<name> is a weekend.' followed by one parenthetical or sentence about what the actual hard part is (and why it's smaller than people think). Then the URL.",
    tier: "WEEKEND",
    examples: [
      `notion.so is a weekend. there, i said it. (the bar is "the editing loop", not "the parser".) https://www.saaspocalypse.dev/r/notion-so`,
      `calendly.com is a saturday morning. honestly. (the hard part is timezone math, and you can buy that off Luxon.) https://www.saaspocalypse.dev/r/calendly-com`,
    ],
  },
  {
    id: "report.dont_riff",
    kind: "report",
    tweet_count: 2,
    description:
      "DON'T-tier only. TWO TWEETS. Tweet 1: head — sincere 'don't' line + score on its own line + URL on its own line. No snark, just respect. Tweet 2: reply — one short concrete reason it's actually impossible (a regulator, a research problem, a network effect). Always includes a real concrete name when possible (e.g. 'patrick started in 2010', 'PCI DSS Level 1', 'Visa interchange'). The URL must appear ONLY on tweet 1.",
    tier: "DON'T",
    examples: [
      `we ran the numbers on figma. don't.
score: 8.

https://www.saaspocalypse.dev/r/figma-com
---
their renderer is a research project, not a feature. evan started in 2012 and is still at it.`,
      `we ran the numbers on stripe. don't.
score: 6.

https://www.saaspocalypse.dev/r/stripe-com
---
PCI DSS Level 1 is an on-site audit. acquiring banks won't return your call. patrick started in 2010.`,
    ],
  },
];

/* ──────────────── Original templates ──────────────── */

export const ORIGINAL_TEMPLATES: OriginalTemplate[] = [
  {
    id: "original.aphorism",
    kind: "original",
    tweet_count: 1,
    description:
      "PG-style one-liner observation about indie hacking, SaaS, or building software. No link. Lowercase-deadpan, ends with a period. One concrete number or product name when possible — the specifics are the joke.",
    examples: [
      `most "AI startups" are a regex with a marketing budget.`,
      `the bar for a v1 saas is "does the editing loop feel right" — not "is your auth perfect".`,
      `every $9/mo subscription is a $7/mo problem and a $2/mo ego.`,
    ],
  },
  {
    id: "original.scope_creep",
    kind: "original",
    tweet_count: 1,
    description:
      "Indie-hacker confession in two beats. Beat 1: a small intention ('monday: i'll add auth on saturday.'). Beat 2: the absurd reality ('saturday: writing a 600-line zod schema for the auth state machine.'). Lowercase, deadpan, no link.",
    examples: [
      `monday: "i'll add auth on saturday." saturday: writing a 600-line zod schema for the auth state machine.`,
      `started: 11am, "small refactor". noticed the time: 4pm, rewriting the file system.`,
      `told myself it was an MVP. opened the codebase six months later. it has feature flags.`,
    ],
  },
  {
    id: "original.cost_anchor",
    kind: "original",
    tweet_count: 1,
    description:
      "Joke that riffs on the standard cost reference table the scanner uses (Vercel hobby = 0, Domain = $1/mo, Stripe = 2.9% + $0.30, etc.). Lowercase, no link. Should land for someone who has shipped one Next.js + Supabase project.",
    examples: [
      `your ai saas is $14/mo of vercel and $9000/mo of "scales with usage".`,
      `your $99/mo competitor's actual run-rate is $46/mo. the rest is patience and a salesforce.`,
      `the only line items that aren't a free tier are domain ($1) and your therapist (out of scope).`,
    ],
  },
  {
    id: "original.directory_riff",
    kind: "original",
    tweet_count: 1,
    links_to_directory: true,
    description:
      "Soft directory plug. Lead with a real-feeling stat about the directory (median tier, total scanned, cheapest run-rate, etc.) — the LLM is given the actual count and can riff. End with the URL. Format: `<observation>. → <URL>`. URL is `https://www.saaspocalypse.dev/directory`.",
    examples: [
      `we've now scanned 47 saas products. 31 are weekend tier. the median founder is, statistically, you. → https://www.saaspocalypse.dev/directory`,
      `the saaspocalypse leaderboard's cheapest-to-clone tier averages $4/mo run-rate. cheaper than the founder's coffee. → https://www.saaspocalypse.dev/directory`,
    ],
  },
];

const TEMPLATE_BY_ID: Record<TemplateId, Template> = {
  ...Object.fromEntries(REPORT_TEMPLATES.map((t) => [t.id, t])),
  ...Object.fromEntries(ORIGINAL_TEMPLATES.map((t) => [t.id, t])),
} as Record<TemplateId, Template>;

export function getTemplate(id: TemplateId): Template {
  const t = TEMPLATE_BY_ID[id];
  if (!t) throw new Error(`unknown template id: ${id}`);
  return t;
}

/** Templates eligible for a given tier. Filters tier-specific templates. */
export function reportTemplatesForTier(tier: Tier): ReportTemplate[] {
  return REPORT_TEMPLATES.filter((t) => !t.tier || t.tier === tier);
}

/** Pick uniformly at random from a non-empty list. */
export function pickRandom<T>(items: readonly T[]): T {
  if (items.length === 0) throw new Error("pickRandom: empty list");
  return items[Math.floor(Math.random() * items.length)];
}
