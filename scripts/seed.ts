/**
 * Seed the 4 example verdict reports from the design handoff into Supabase.
 * Run with: pnpm tsx scripts/seed.ts
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local.
 */

import { config as loadEnv } from "dotenv";
import { VerdictReportSchema, type VerdictReport } from "../lib/scanner/schema";
import { upsertReport } from "../lib/db/reports";
import { normalizeUrl } from "../lib/domain";

// Load .env.local first (Next.js convention — secrets), then .env as fallback.
// `dotenv/config` only reads .env, so tsx-run scripts need this explicit loading.
// Safe to call after imports: our lib code reads process.env lazily inside
// function bodies, not at module load.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const SEEDS: Array<{ url: string; report: VerdictReport }> = [
  {
    url: "notion-ish.com",
    report: {
      name: "notion-ish.com",
      tagline: "block-based docs + database",
      tier: "WEEKEND",
      score: 78,
      confidence: 92,
      take: "It's a rich-text editor with a recursive database attached. The magic is the drag-handle and the schema. The rest is a CRUD app in a trenchcoat.",
      take_sub:
        "You will spend 80% of your time on the block editor and 20% on everything else. Plan accordingly.",
      time_estimate: "14 hours",
      time_breakdown:
        "1 eve setting up · 1 weekend hacking · 4 evenings polishing",
      break_even: "never — you save $119/year, forever",
      est_total: 1.0,
      current_cost: { label: "Plus plan", price: 10, unit: "seat/mo", annual: 120 },
      est_cost: [
        { line: "Vercel (hobby tier)", cost: 0 },
        { line: "Supabase (free tier: 500MB)", cost: 0 },
        { line: "Domain (yourself.dev)", cost: 1.0 },
        { line: "Resend (100 emails/day free)", cost: 0 },
      ],
      alternatives: [
        {
          name: "Obsidian",
          why: "local-first, free, plugin-rich. Already has the editor.",
        },
        {
          name: "Outline (self-host)",
          why: "open source, docker-up in 10 min. No blocks but hot-reload docs.",
        },
        {
          name: "SilverBullet.md",
          why: "extensible markdown notebook. Closer to Notion than you think.",
        },
      ],
      challenges: [
        {
          diff: "easy",
          name: "Basic blocks + slash menu",
          note: "TipTap ships with most of this.",
        },
        {
          diff: "medium",
          name: "Recursive page tree",
          note: "Parent_id column. Adjacency list. 40 lines of SQL.",
        },
        {
          diff: "medium",
          name: "Inline databases",
          note: "A block that holds a query. Render as table.",
        },
        {
          diff: "hard",
          name: "Drag-to-reorder across nested lists",
          note: "The only genuinely annoying part. dnd-kit gets you 80%.",
        },
        {
          diff: "nightmare",
          name: "Real-time multiplayer",
          note: "Skip it. You do not need Y.js for your personal wiki.",
        },
      ],
      stack: [
        "Next.js 15 + TipTap",
        "Postgres (Supabase)",
        "Recursive CTE for page trees",
        "Tiptap collaboration (optional)",
      ],
    },
  },
  {
    url: "calendly-ish.com",
    report: {
      name: "calendly-ish.com",
      tagline: "scheduling link generator",
      tier: "WEEKEND",
      score: 86,
      confidence: 95,
      take: "You're charging $12/mo for an if-statement and a calendar invite. Respect. But also, an if-statement.",
      take_sub:
        "The whole product is: check Google Calendar busy times, subtract from a schedule template, render the gaps as clickable buttons. That's the tweet.",
      time_estimate: "9 hours",
      time_breakdown: "1 Saturday morning, minus a coffee break",
      break_even: "immediately — pays for itself on day one",
      est_total: 1.0,
      current_cost: { label: "Standard plan", price: 12, unit: "user/mo", annual: 144 },
      est_cost: [
        { line: "Vercel (hobby tier)", cost: 0 },
        { line: "Google Calendar API", cost: 0 },
        { line: "Resend (notifications)", cost: 0 },
        { line: "Domain", cost: 1.0 },
      ],
      alternatives: [
        {
          name: "Cal.com (self-host)",
          why: "open source. Docker-up. Genuinely feature-complete.",
        },
        { name: "Zcal, SavvyCal free tier", why: "if you want to skip the build." },
        { name: "A bento.me booking link", why: "if your needs are two per week." },
      ],
      challenges: [
        {
          diff: "easy",
          name: "OAuth with Google",
          note: "Literally follow the quickstart.",
        },
        {
          diff: "easy",
          name: "Read busy times",
          note: "One API call. freebusy.query.",
        },
        {
          diff: "medium",
          name: "Availability template UI",
          note: "Weekly grid. Checkboxes. Done.",
        },
        {
          diff: "medium",
          name: "Timezone math",
          note: "Use Luxon. Do not roll your own. Please.",
        },
        {
          diff: "hard",
          name: "Round-robin team scheduling",
          note: "Only if you have a team. You do not.",
        },
      ],
      stack: [
        "Next.js + form actions",
        "Google Calendar API (freebusy)",
        "Resend for emails",
        "SQLite via Turso",
      ],
    },
  },
  {
    url: "linear-ish.app",
    report: {
      name: "linear-ish.app",
      tagline: "issue tracker for software teams",
      tier: "MONTH",
      score: 52,
      confidence: 74,
      take: "The bug tracker is a weekend. The feel is a month. You're not rebuilding Linear — you're rebuilding the 60fps keyboard-driven UI that makes Linear feel like Linear. That's the whole product.",
      take_sub: "Everything Linear does that Jira doesn't is vibes. Vibes take time.",
      time_estimate: "6 weeks",
      time_breakdown:
        "1 weekend working · 5 weekends polishing · 3 weekends hating yourself",
      break_even: "6 team members — $48 vs $48. 10+ seats and you are laughing.",
      est_total: 47.0,
      current_cost: {
        label: "Standard plan",
        price: 8,
        unit: "user/mo",
        annual: 96,
        note: "× team size",
      },
      est_cost: [
        { line: "Vercel Pro (for edge + analytics)", cost: 20.0 },
        { line: "Supabase Pro (>500MB likely)", cost: 25.0 },
        { line: "Tauri bundler (free)", cost: 0 },
        { line: "Sentry (self-host or free tier)", cost: 0 },
        { line: "Domain + CDN", cost: 2.0 },
      ],
      alternatives: [
        {
          name: "Plane (self-host)",
          why: "open source Linear clone. Already exists. Docker compose up.",
        },
        {
          name: "GitHub Projects",
          why: "free with your repo. Already has keyboard shortcuts.",
        },
        {
          name: "Height (cheap alternative)",
          why: "if you want the vibe without the build.",
        },
      ],
      challenges: [
        {
          diff: "easy",
          name: "Issues, statuses, assignees",
          note: "CRUD app. You could write this in your sleep.",
        },
        {
          diff: "medium",
          name: "Command palette (Cmd-K)",
          note: "cmdk library. Half a day to wire up 40 commands.",
        },
        {
          diff: "medium",
          name: "Keyboard navigation everywhere",
          note: "Roving tabindex. Every single view. This is the slog.",
        },
        {
          diff: "hard",
          name: "Local-first sync",
          note: "Electric SQL or Replicache. This is half the build time.",
        },
        {
          diff: "hard",
          name: "60fps everything",
          note: "Virtualized lists. Optimistic updates. Suspense boundaries. Sweat.",
        },
        {
          diff: "nightmare",
          name: "The exact motion curves",
          note: "You will copy them from the real site. Everyone does.",
        },
      ],
      stack: [
        "Next.js + React Router 7",
        "Postgres + ElectricSQL",
        "cmdk + dnd-kit + framer-motion",
        "Tauri for desktop",
      ],
    },
  },
  {
    url: "stripe-ish.com",
    report: {
      name: "stripe-ish.com",
      tagline: "payments infrastructure",
      tier: "DON'T",
      score: 6,
      confidence: 99,
      take: "Absolutely not. This is the one thing on the internet that is genuinely worth paying for. Put your laptop down. Go outside.",
      take_sub:
        "You are not going to get PCI DSS Level 1 certified this weekend. You are not going to negotiate interchange with Visa. You are going to pay Stripe 2.9% + 30¢ and you are going to like it.",
      time_estimate: "∞",
      time_breakdown: "Patrick started in 2010. Still working on it.",
      break_even: "approximately never",
      est_total: 172000,
      current_cost: {
        label: "Standard rate",
        price: "2.9% + $0.30",
        unit: "per txn",
        annual: "scales w/ GMV",
        note: "no seat fees, no monthly minimum",
      },
      est_cost: [
        { line: "PCI DSS Level 1 audit", cost: 50000 },
        { line: "Acquiring bank relationship", cost: "???" },
        { line: "Compliance & legal counsel", cost: 120000 },
        { line: "Fraud detection infra", cost: 2000 },
        { line: "Your remaining sanity", cost: "priceless" },
      ],
      alternatives: [
        {
          name: "Stripe",
          why: "yes, we are recommending the thing you scanned. That's how good it is.",
        },
        {
          name: "Lemon Squeezy",
          why: "merchant of record, handles tax, 5% flat. For digital goods.",
        },
        {
          name: "Paddle",
          why: "same deal. MoR model. Lets you pretend you don't have customers in Germany.",
        },
      ],
      challenges: [
        {
          diff: "nightmare",
          name: "PCI DSS compliance",
          note: "A 12-page SAQ is the easy version. Level 1 is an on-site audit.",
        },
        {
          diff: "nightmare",
          name: "Acquiring bank partnerships",
          note: "You need one. They will not call you back.",
        },
        {
          diff: "nightmare",
          name: "Fraud detection",
          note: "You will lose more to fraud than you make in revenue.",
        },
        {
          diff: "nightmare",
          name: "International money movement",
          note: "Money transmitter licenses. Per state. In the US. Alone.",
        },
        {
          diff: "nightmare",
          name: "Being regulated",
          note: 'Hope you like the word "custodian".',
        },
        {
          diff: "nightmare",
          name: "Chargebacks",
          note: "You are the bank now. Have fun.",
        },
      ],
      stack: [
        "regulatory attorneys ($800/hr)",
        "a bank (several, actually)",
        "SOC 2 + PCI DSS",
        "your remaining tears",
      ],
    },
  },
];

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set it in .env.local before running.",
    );
    process.exit(1);
  }

  for (const seed of SEEDS) {
    const domain = normalizeUrl(seed.url);
    // Validate via the same Zod schema the LLM output goes through.
    const parsed = VerdictReportSchema.safeParse(seed.report);
    if (!parsed.success) {
      console.error(`[seed] ${seed.url} failed validation:`, parsed.error.format());
      process.exit(1);
    }
    try {
      const row = await upsertReport(domain, parsed.data);
      console.log(
        `[seed] upserted ${row.slug} (${row.tier}, ${row.score}/100) · id=${row.id}`,
      );
    } catch (err) {
      console.error(`[seed] failed to upsert ${domain}:`, err);
      process.exit(1);
    }
  }

  console.log(`[seed] done — ${SEEDS.length} reports seeded.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
