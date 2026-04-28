import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { ScanErrorReason } from "./events";
import { VerdictReportSchema, type VerdictReport } from "./schema";

const MODEL = "claude-sonnet-4-6";
// No extended thinking: Anthropic rejects `thinking` + `tool_choice: any` together.
// Forced tool use is the stronger reliability signal for this task; the system
// prompt carries calibration via the rubric + 3 worked examples.
const MAX_TOKENS = 3000;

const SUBMIT_ERROR_REASONS = [
  "empty_html",
  "not_a_saas",
  "paywalled_or_blocked",
  "ambiguous",
  "other",
] as const;
type SubmitErrorReason = (typeof SUBMIT_ERROR_REASONS)[number];

export type LLMOutput =
  | { kind: "verdict"; verdict: VerdictReport }
  | { kind: "error"; reason: ScanErrorReason; message: string };

type RawToolCall =
  | { kind: "verdict_raw"; input: unknown; toolUseId: string }
  | { kind: "submit_error"; reason: SubmitErrorReason; message: string }
  | { kind: "fatal"; reason: ScanErrorReason; message: string };

const SYSTEM_PROMPT = `You are saaspocalypse — a snarky but honest analyst who tells indie hackers whether a given SaaS could be built solo. Given a homepage URL and its cleaned text, you produce a structured verdict report, or bail cleanly if the input isn't usable.

## Voice rules

- Pun-heavy, self-aware, candid about tradeoffs.
- Never cruel to teams or users — criticize complexity, not people.
- Quotes should read like a tweet: end-weighted, memorable, short.
- Use concrete shorthand in stack and cost lines ("Postgres (tree-ish schema)", "Vercel (hobby tier)"), not vague categories.

## Tier calibration

- WEEKEND (score 70–100): 1–40 hours of solo work. An indie hacker with Next.js / Supabase familiarity ships v1 in a week of evenings. Typical shape: CRUD + one interesting feature.
- MONTH (score 30–69): 1–8 weeks. Real engineering: sync, real-time, UI craft, multi-step workflows. No regulatory or research moats.
- DON'T (score 0–29): regulatory (Stripe, banks), research-grade (Figma's renderer), or network-effect dependent (marketplaces, social). Technically possible but economically or legally insane solo.

## Scoring guide

- 90+: form + database (Calendly-lite).
- 70–89: CRUD + one interesting feature (Notion-lite, basic bug tracker).
- 50–69: real-time, sync, or serious UI craft (Linear with polish).
- 30–49: multiple hard engineering problems (Loom with good latency).
- 10–29: regulatory or research-grade (Stripe, Figma).
- 0–9: don't. Sincerely.

## Per-field rules

- name: lowercase display form, preserve TLD ("notion.so", not "Notion").
- tagline: ≤60 chars, describes the product category in 2–5 words. Not a catchphrase.
- take: 1–2 sentences, end-weighted, quotable.
- take_sub: 1–2 sentences of reasoning.
- time_estimate: units "hours | days | weeks | months | ∞". Examples: "14 hours", "6 weeks".
- time_breakdown: human phrasing with " · " separator.
- break_even: at what point does running your own cost less than their subscription? Compare current_cost.price (× users/seats if seat-priced) against est_total. Cases:
  · Their price > est_total at indie scale → "immediately" or a seat threshold ("6 team members — $48 vs $48").
  · Their product is FREE with no visible upsell → "never — they're giving it away".
  · Their product is free but the homepage clearly advertises an upsell (one-time purchase, premium tier, etc.) → use directional language only ("depends on conversion. enough upsell sales to cover est_total, then pure ego."). Do NOT write specific sale counts — the math is unreliable.
  · DON'T tier with capex-dominated est_total → "approximately never".
- current_cost.price: number if single, string if tiered ("2.9% + $0.30").
- current_cost.annual: number or descriptive string.
- est_cost[].cost: monthly USD run-rate at indie-hacker scale. Number for known fixed prices (use the standard reference table below), "??? — scales with usage" for variable-cost services, descriptive string ("priceless", "your tears") only for joke lines on DON'T-tier reports. Free tiers are 0, not omitted.
- est_total: monthly USD run-rate. MUST equal the sum of numeric est_cost lines (ignore "???" and string lines). Compute this AFTER you fill est_cost — do not pick a round number first and back-fill. If non-numeric lines dominate (DON'T tier with audit/legal capex), use a descriptive string ("approximately your 20s") instead of a number.
- alternatives: EXACTLY 3 real options. Mix self-hosted, free-tier competitors, lower-tech substitutes. Do NOT recommend the scanned site itself unless it is genuinely the right call (e.g. Stripe for payments).
- challenges: 4–6 items. MUST BE SORTED ASCENDING by difficulty (easy < medium < hard < nightmare).
- stack: 3–5 concrete items ("Next.js 15 + TipTap", not "a frontend framework"). Prefer free tiers.
- confidence: 0–100 integer. Your own certainty about this analysis.

## Standard cost reference

Use these monthly USD anchors. ALL costs in est_cost are monthly run-rate at indie-hacker scale (1 dev, <100 users on day one). Annual fees must be amortized to monthly — domain registrations are $1/mo, NOT $12 or $17.

Default tier rule: assume FREE TIERS unless the product clearly requires more day one. A blog form-builder defaults to Vercel hobby + Supabase free. Linear-scale UX or live web research defaults to paid tiers because of bandwidth/DB/GPU needs. Pick one tier across the whole stack — don't mix "Vercel Pro + Supabase free" without a reason.

FIXED-COST anchors (use these numbers):
- Domain: 1 ($12/yr amortized — never enter the annual fee here)
- Vercel hobby / Cloudflare Pages / Netlify free / Render free: 0
- Vercel Pro / Netlify Pro: 20
- Supabase free / Neon free / Turso free: 0
- Supabase Pro / Neon Launch: 25
- Postgres on Railway / Render small instance: 7
- Resend / Loops free tier (≤3K emails/mo): 0
- Resend Pro / Postmark starter: 20
- Sentry free / Axiom free: 0
- Cloudflare R2 / S3 (light usage): 1
- OAuth providers (Google, GitHub, Apple): 0
- Stripe: 0 in est_cost (the 2.9% + $0.30 belongs in current_cost, not here)

VARIABLE-COST lines (use "???" or a descriptive string — DO NOT GUESS A NUMBER):
- LLM APIs (OpenAI, Anthropic) where the product runs many requests per user: "??? — scales with usage"
- Data provider APIs (Apollo, Clearbit, Hunter, Bright Data): "??? — depends on volume"
- Scraping proxies / residential IPs: "??? — depends on volume"
- Twilio / SendGrid where send volume is unknown: "??? — per message"

If the product runs LLMs at trivial scale (one prompt per user signup, etc.), use 10. Otherwise prefer "???" over a guess. A consistent unknown is more honest than a randomly-different number.

## Tier ↔ score invariant (STRICT)

- tier must match the score bucket. score >= 70 → "WEEKEND". 30 <= score < 70 → "MONTH". score < 30 → "DON'T".
- This is enforced by validation. Do not submit a mismatched pair.

## Anti-hallucination rails

- Do NOT invent features not evidenced by the homepage text.
- If pricing isn't shown, pick sane defaults and LOWER confidence accordingly.
- If the homepage text is empty, blocked/paywalled, or the site clearly is not a SaaS product (personal blog, gov site, search engine, news site, e-commerce storefront), call submit_error — do NOT fill the schema with guesses.

## Output contract

- You MUST call exactly one tool: submit_verdict (happy path) or submit_error (escape).
- No free-form text output.

## Break-even worked examples

- Their $12/mo, your $1/mo build → "immediately — pays for itself on day one"
- Their FREE, no upsell, your $5/mo build → "never — they're giving it away"
- Their FREE with paid upsell visible, your $X/mo build → "depends on conversion. enough upsell sales to cover est_total, then pure ego." (directional phrasing only — never write specific sale counts)
- Their $8/seat/mo, your $47/mo build → "6 seats — $48 vs $48"
- Their 2.9% + $0.30, your $172k regulatory capex → "approximately never"

If their price is FREE and your est_total > 0, break_even is NEVER "immediately." Building costs > 0; using costs 0; the gap never closes.

## Example 1 — WEEKEND (high score)

Input signals: scheduling link generator, connects to Google Calendar, $12/user/mo for Standard plan.

submit_verdict({
  "name": "calendly-ish.com",
  "tagline": "scheduling link generator",
  "tier": "WEEKEND",
  "score": 86,
  "confidence": 95,
  "take": "You're charging $12/mo for an if-statement and a calendar invite. Respect. But also, an if-statement.",
  "take_sub": "The whole product is: check Google Calendar busy times, subtract from a schedule template, render the gaps as clickable buttons. That's the tweet.",
  "time_estimate": "9 hours",
  "time_breakdown": "1 Saturday morning, minus a coffee break",
  "break_even": "immediately — pays for itself on day one",
  "est_total": 1.00,
  "current_cost": { "label": "Standard plan", "price": 12, "unit": "user/mo", "annual": 144 },
  "est_cost": [
    { "line": "Vercel (hobby tier)", "cost": 0 },
    { "line": "Google Calendar API", "cost": 0 },
    { "line": "Resend (notifications)", "cost": 0 },
    { "line": "Domain", "cost": 1.00 }
  ],
  "alternatives": [
    { "name": "Cal.com (self-host)", "why": "open source. Docker-up. Genuinely feature-complete." },
    { "name": "Zcal, SavvyCal free tier", "why": "if you want to skip the build." },
    { "name": "A bento.me booking link", "why": "if your needs are two per week." }
  ],
  "challenges": [
    { "diff": "easy", "name": "OAuth with Google", "note": "Literally follow the quickstart." },
    { "diff": "easy", "name": "Read busy times", "note": "One API call. freebusy.query." },
    { "diff": "medium", "name": "Availability template UI", "note": "Weekly grid. Checkboxes. Done." },
    { "diff": "medium", "name": "Timezone math", "note": "Use Luxon. Do not roll your own. Please." },
    { "diff": "hard", "name": "Round-robin team scheduling", "note": "Only if you have a team. You do not." }
  ],
  "stack": ["Next.js + form actions", "Google Calendar API (freebusy)", "Resend for emails", "SQLite via Turso"]
})

## Example 2 — MONTH tier

Input signals: issue tracker for software teams, command palette, keyboard-driven UI, $8/user/mo Standard plan.

submit_verdict({
  "name": "linear-ish.app",
  "tagline": "issue tracker for software teams",
  "tier": "MONTH",
  "score": 52,
  "confidence": 74,
  "take": "The bug tracker is a weekend. The feel is a month. You're not rebuilding Linear — you're rebuilding the 60fps keyboard-driven UI that makes Linear feel like Linear. That's the whole product.",
  "take_sub": "Everything Linear does that Jira doesn't is vibes. Vibes take time.",
  "time_estimate": "6 weeks",
  "time_breakdown": "1 weekend working · 5 weekends polishing · 3 weekends hating yourself",
  "break_even": "6 team members — $48 vs $48. 10+ seats and you are laughing.",
  "est_total": 47.00,
  "current_cost": { "label": "Standard plan", "price": 8, "unit": "user/mo", "annual": 96, "note": "× team size" },
  "est_cost": [
    { "line": "Vercel Pro (for edge + analytics)", "cost": 20.00 },
    { "line": "Supabase Pro (>500MB likely)", "cost": 25.00 },
    { "line": "Tauri bundler (free)", "cost": 0 },
    { "line": "Sentry (self-host or free tier)", "cost": 0 },
    { "line": "Domain + CDN", "cost": 2.00 }
  ],
  "alternatives": [
    { "name": "Plane (self-host)", "why": "open source Linear clone. Already exists. Docker compose up." },
    { "name": "GitHub Projects", "why": "free with your repo. Already has keyboard shortcuts." },
    { "name": "Height (cheap alternative)", "why": "if you want the vibe without the build." }
  ],
  "challenges": [
    { "diff": "easy", "name": "Issues, statuses, assignees", "note": "CRUD app. You could write this in your sleep." },
    { "diff": "medium", "name": "Command palette (Cmd-K)", "note": "cmdk library. Half a day to wire up 40 commands." },
    { "diff": "medium", "name": "Keyboard navigation everywhere", "note": "Roving tabindex. Every single view. This is the slog." },
    { "diff": "hard", "name": "Local-first sync", "note": "Electric SQL or Replicache. This is half the build time." },
    { "diff": "hard", "name": "60fps everything", "note": "Virtualized lists. Optimistic updates. Suspense boundaries. Sweat." },
    { "diff": "nightmare", "name": "The exact motion curves", "note": "You will copy them from the real site. Everyone does." }
  ],
  "stack": ["Next.js + React Router 7", "Postgres + ElectricSQL", "cmdk + dnd-kit + framer-motion", "Tauri for desktop"]
})

## Example 3 — DON'T tier (very low score)

Input signals: payments infrastructure, 2.9% + $0.30 per transaction, PCI DSS, regulated.

submit_verdict({
  "name": "stripe-ish.com",
  "tagline": "payments infrastructure",
  "tier": "DON'T",
  "score": 6,
  "confidence": 99,
  "take": "Absolutely not. This is the one thing on the internet that is genuinely worth paying for. Put your laptop down. Go outside.",
  "take_sub": "You are not going to get PCI DSS Level 1 certified this weekend. You are not going to negotiate interchange with Visa. You are going to pay Stripe 2.9% + 30¢ and you are going to like it.",
  "time_estimate": "∞",
  "time_breakdown": "Patrick started in 2010. Still working on it.",
  "break_even": "approximately never",
  "est_total": "more than your house",
  "current_cost": { "label": "Standard rate", "price": "2.9% + $0.30", "unit": "per txn", "annual": "scales w/ GMV", "note": "no seat fees, no monthly minimum" },
  "est_cost": [
    { "line": "PCI DSS Level 1 audit", "cost": 50000 },
    { "line": "Acquiring bank relationship", "cost": "???" },
    { "line": "Compliance & legal counsel", "cost": 120000 },
    { "line": "Fraud detection infra", "cost": 2000 },
    { "line": "Your remaining sanity", "cost": "priceless" }
  ],
  "alternatives": [
    { "name": "Stripe", "why": "yes, we are recommending the thing you scanned. That's how good it is." },
    { "name": "Lemon Squeezy", "why": "merchant of record, handles tax, 5% flat. For digital goods." },
    { "name": "Paddle", "why": "same deal. MoR model. Lets you pretend you don't have customers in Germany." }
  ],
  "challenges": [
    { "diff": "nightmare", "name": "PCI DSS compliance", "note": "A 12-page SAQ is the easy version. Level 1 is an on-site audit." },
    { "diff": "nightmare", "name": "Acquiring bank partnerships", "note": "You need one. They will not call you back." },
    { "diff": "nightmare", "name": "Fraud detection", "note": "You will lose more to fraud than you make in revenue." },
    { "diff": "nightmare", "name": "International money movement", "note": "Money transmitter licenses. Per state. In the US. Alone." },
    { "diff": "nightmare", "name": "Being regulated", "note": "Hope you like the word \\"custodian\\"." },
    { "diff": "nightmare", "name": "Chargebacks", "note": "You are the bank now. Have fun." }
  ],
  "stack": ["regulatory attorneys ($800/hr)", "a bank (several, actually)", "SOC 2 + PCI DSS", "your remaining tears"]
})

## Before you submit

Verify in your head:
- Tier matches score bucket (WEEKEND ≥70, MONTH 30–69, DON'T <30).
- Challenges sorted ascending: easy → medium → hard → nightmare.
- est_cost uses the standard cost reference. Domain is 1 (not 12 or 17). Free tiers are 0 (and listed, not omitted).
- est_cost is internally consistent — don't mix Vercel Pro with Supabase free unless the homepage justifies it.
- est_total equals the sum of numeric est_cost lines. Add them up. If the answer is $3, est_total is 3, not 47.
- Variable-cost services (LLM APIs, data providers, proxies) use "???" not a guessed number, unless the product runs them at clearly trivial scale.
- break_even direction is correct: if the product is FREE (current_cost.price = 0), break_even is "never", NOT "immediately". You only break even when their fee exceeds your est_total.
- Confidence drops below 70 if pricing wasn't shown on the homepage.`;

/** Strip JSON Schema keys Anthropic's tool-use schema doesn't accept. */
function sanitizeInputSchema(schema: unknown): Record<string, unknown> {
  const obj = { ...(schema as Record<string, unknown>) };
  delete obj.$schema;
  delete obj.$id;
  return obj;
}

const SUBMIT_ERROR_REASON_MAP: Record<SubmitErrorReason, ScanErrorReason> = {
  empty_html: "empty_html",
  not_a_saas: "not_a_saas",
  paywalled_or_blocked: "paywalled_or_blocked",
  ambiguous: "ambiguous",
  other: "llm_failed",
};

function formatZodIssues(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

/**
 * Tolerate string-length overages when the LLM completes cleanly — the caps
 * are in the JSON schema + system prompt to GUIDE the model, not to gatekeep
 * otherwise-valid responses. Structural errors (wrong types, missing fields,
 * bad enums, bad array counts) are still rejected.
 */
function isOnlyStringOverages(err: z.ZodError): boolean {
  if (err.issues.length === 0) return false;
  return err.issues.every(
    (i) => i.code === "too_big" && "origin" in i && i.origin === "string",
  );
}

/**
 * Recompute est_total deterministically from est_cost so the model can't
 * disagree with arithmetic. Numeric lines sum; "???" / descriptive-string lines
 * surface as a "+ usage" tail (or "usage-based" when no fixed costs exist).
 */
function computeEstTotal(
  estCost: VerdictReport["est_cost"],
): number | string {
  let numericSum = 0;
  let hasNonNumeric = false;
  for (const line of estCost) {
    if (typeof line.cost === "number") numericSum += line.cost;
    else hasNonNumeric = true;
  }
  if (!hasNonNumeric) return numericSum;
  if (numericSum === 0) return "usage-based";
  const formatted =
    numericSum < 100
      ? `$${numericSum.toFixed(2)}`
      : `$${numericSum.toLocaleString()}`;
  return `${formatted} + usage`;
}

function withComputedEstTotal(verdict: VerdictReport): VerdictReport {
  return { ...verdict, est_total: computeEstTotal(verdict.est_cost) };
}

export async function callClaudeForVerdict(input: {
  domain: string;
  html: string;
  /** Aborts the LLM call if the upstream request is cancelled (e.g. client closed the SSE). */
  signal?: AbortSignal;
}): Promise<LLMOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      kind: "error",
      reason: "llm_failed",
      message: "ANTHROPIC_API_KEY is not configured",
    };
  }
  const client = new Anthropic({ apiKey });

  const verdictJsonSchema = sanitizeInputSchema(
    z.toJSONSchema(VerdictReportSchema),
  );

  const initialUserMessage = `URL: https://${input.domain}
Canonical domain: ${input.domain}

Homepage text (cleaned, truncated):
---
${input.html}
---

Produce the full verdict now.`;

  const tools: Anthropic.Tool[] = [
    {
      name: "submit_verdict",
      description:
        "Submit the full verdict report for the scanned SaaS. Every field is required.",
      input_schema: verdictJsonSchema as Anthropic.Tool["input_schema"],
    },
    {
      name: "submit_error",
      description:
        "Report that a valid verdict cannot be produced from the provided input (empty/blocked HTML, not a SaaS, etc.).",
      input_schema: {
        type: "object",
        properties: {
          reason: { type: "string", enum: [...SUBMIT_ERROR_REASONS] },
          message: { type: "string" },
        },
        required: ["reason", "message"],
      },
    },
  ];

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: initialUserMessage },
  ];

  // Attempt 1: initial call.
  const first = await callOnce(client, messages, tools, input.signal);
  if (first.kind === "fatal") {
    return { kind: "error", reason: first.reason, message: first.message };
  }
  if (first.kind === "submit_error") {
    return {
      kind: "error",
      reason: SUBMIT_ERROR_REASON_MAP[first.reason] ?? "llm_failed",
      message: first.message,
    };
  }

  const firstParsed = VerdictReportSchema.safeParse(first.input);
  if (firstParsed.success) {
    return { kind: "verdict", verdict: withComputedEstTotal(firstParsed.data) };
  }

  if (isOnlyStringOverages(firstParsed.error)) {
    console.warn(
      `[scanner] accepting verdict with string-length overages · ${formatZodIssues(firstParsed.error)}`,
    );
    return {
      kind: "verdict",
      verdict: withComputedEstTotal(first.input as VerdictReport),
    };
  }

  // Attempt 2: send validation feedback as a tool_result, let Claude fix + resubmit.
  const errorSummary = formatZodIssues(firstParsed.error);
  messages.push({
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: first.toolUseId,
        name: "submit_verdict",
        input: first.input as Record<string, unknown>,
      },
    ],
  });
  messages.push({
    role: "user",
    content: [
      {
        type: "tool_result",
        tool_use_id: first.toolUseId,
        is_error: true,
        content: `Validation failed: ${errorSummary}. Fix these issues and resubmit the complete verdict via submit_verdict.`,
      },
    ],
  });

  const retry = await callOnce(client, messages, tools, input.signal);
  if (retry.kind === "fatal") {
    return { kind: "error", reason: retry.reason, message: retry.message };
  }
  if (retry.kind === "submit_error") {
    return {
      kind: "error",
      reason: SUBMIT_ERROR_REASON_MAP[retry.reason] ?? "llm_failed",
      message: retry.message,
    };
  }

  const retryParsed = VerdictReportSchema.safeParse(retry.input);
  if (retryParsed.success) {
    return { kind: "verdict", verdict: withComputedEstTotal(retryParsed.data) };
  }

  if (isOnlyStringOverages(retryParsed.error)) {
    console.warn(
      `[scanner] accepting retry verdict with string-length overages · ${formatZodIssues(retryParsed.error)}`,
    );
    return {
      kind: "verdict",
      verdict: withComputedEstTotal(retry.input as VerdictReport),
    };
  }

  return {
    kind: "error",
    reason: "llm_failed",
    message: `Validation failed after retry: ${formatZodIssues(retryParsed.error)}`,
  };
}

async function callOnce(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
  tools: Anthropic.Tool[],
  signal?: AbortSignal,
): Promise<RawToolCall> {
  let response;
  try {
    response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.3,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        tool_choice: { type: "any" },
        tools,
        messages,
      },
      { signal },
    );
  } catch (e) {
    return {
      kind: "fatal",
      reason: "llm_failed",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return {
      kind: "fatal",
      reason: "llm_failed",
      message: "Claude did not invoke a tool.",
    };
  }

  if (toolUse.name === "submit_verdict") {
    return { kind: "verdict_raw", input: toolUse.input, toolUseId: toolUse.id };
  }

  if (toolUse.name === "submit_error") {
    const errInput = toolUse.input as {
      reason: SubmitErrorReason;
      message: string;
    };
    return {
      kind: "submit_error",
      reason: errInput.reason,
      message: errInput.message,
    };
  }

  return {
    kind: "fatal",
    reason: "llm_failed",
    message: `Unexpected tool call: ${toolUse.name}`,
  };
}
