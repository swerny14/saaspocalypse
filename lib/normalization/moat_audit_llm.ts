import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { VerdictReport } from "@/lib/scanner/schema";
import type { StoredMoatScore } from "@/lib/db/moat_scores";
import type { CapabilityRow } from "@/lib/db/capabilities";

/**
 * Admin-only moat-audit. Asks Claude to read a report's verdict text + its
 * current moat score + the existing capability catalog, and propose
 * specific taxonomy changes (add patterns or new capabilities) that would
 * better capture the moat-bearing signals actually present in the verdict.
 *
 * Same posture as the unknowns-suggestion flow: defensible LLM use because
 * (1) it's admin-only curation, (2) the deterministic scoring engine is
 * unchanged, (3) the human still applies each suggestion explicitly.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 4000;

const MOAT_TAGS = [
  "multi_sided",
  "ugc",
  "marketplace",
  "viral_loop",
  "data_storage",
  "workflow_lock_in",
  "integration_hub",
  "proprietary_dataset",
  "training_data",
  "behavioral",
  "hipaa",
  "finra",
  "gdpr_critical",
  "licensed",
] as const;

const CATEGORIES = [
  "collab",
  "content",
  "commerce",
  "comm",
  "ai",
  "infra",
  "data",
  "workflow",
  "identity",
] as const;

export type MoatAuditSuggestion =
  | {
      kind: "add_pattern";
      capability_slug: string;
      pattern: string;
      evidence: string;
    }
  | {
      kind: "new_capability";
      slug: string;
      display_name: string;
      category: (typeof CATEGORIES)[number];
      match_patterns: string[];
      moat_tags: (typeof MOAT_TAGS)[number][];
      evidence: string;
    };

const AddPatternSchema = z.object({
  kind: z.literal("add_pattern"),
  capability_slug: z.string().min(1).max(80),
  pattern: z.string().min(1).max(120),
  evidence: z.string().min(1).max(300),
});

const NewCapabilitySchema = z.object({
  kind: z.literal("new_capability"),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  display_name: z.string().min(1).max(80),
  category: z.enum(CATEGORIES),
  match_patterns: z.array(z.string().min(1).max(120)).min(1).max(15),
  moat_tags: z.array(z.enum(MOAT_TAGS)).max(8),
  evidence: z.string().min(1).max(300),
});

const SuggestionSchema = z.discriminatedUnion("kind", [
  AddPatternSchema,
  NewCapabilitySchema,
]);

const BatchSchema = z.object({
  verdict_summary: z.string().min(1).max(400),
  suggestions: z.array(SuggestionSchema).max(20),
});

export type MoatAuditResult =
  | { kind: "ok"; verdict_summary: string; suggestions: MoatAuditSuggestion[] }
  | { kind: "error"; message: string };

export type MoatAuditInput = {
  report: {
    name: string;
    tagline: string;
    slug: string;
  };
  verdict: VerdictReport;
  moat: StoredMoatScore;
  /** All current capabilities — Claude needs the catalog to know what
   *  patterns to extend vs. when a brand-new capability is warranted. */
  capabilities: CapabilityRow[];
  /** Slugs of capabilities that fired on this report's projection. */
  matched_capability_slugs: string[];
  signal?: AbortSignal;
};

function sanitizeInputSchema(schema: unknown): Record<string, unknown> {
  const obj = { ...(schema as Record<string, unknown>) };
  delete obj.$schema;
  delete obj.$id;
  return obj;
}

function isOnlyStringOverages(err: z.ZodError): boolean {
  if (err.issues.length === 0) return false;
  return err.issues.every(
    (i) => i.code === "too_big" && "origin" in i && i.origin === "string",
  );
}

const SYSTEM_PROMPT = `You are an auditor for a deterministic moat-scoring engine. Each report has seven 0–10 axes (capital, technical, network, switching, data, regulatory, distribution). The capital + technical axes are derived from raw verdict signals (capex flags, est_total magnitude, per-challenge difficulty distribution) and need no input from you. The distribution axis is derived from a Serper SERP call and also needs no input. The other four (network / switching / data / regulatory) are derived from how many "moat-tagged" capabilities match the verdict text via lowercase whole-word phrase patterns.

When an admin asks you to audit a report, your job is to spot moat-bearing signals in the verdict text that AREN'T currently being captured by the capability catalog, then propose minimal targeted taxonomy changes.

## What counts as a moat-bearing signal

- Network: multi-sided dynamics, UGC, marketplace mechanics, viral loops, social graph, app ecosystem.
- Switching: data lives in the product (chat history, design assets, billing state, custom records), workflow lock-in, deep API integration, enterprise SLA dependence.
- Data: proprietary dataset accumulated over time, ML training data the company owns, behavioral data from user actions, fraud / risk models trained on years of records.
- Regulatory: HIPAA / FINRA / GDPR-critical exposure, money transmitter / acquiring bank licensing, payment processor licenses, KYC / AML duties, clinical / EHR data handling. SOC 2 alone does NOT count — it's table-stakes.

Capital + technical axes are out of scope; do not try to influence them.

## Two action types — strongly prefer add_pattern

1. **add_pattern** — DEFAULT. Use this whenever ANY existing capability already carries the moat_tags you want to fire for the missing signal. Pick the closest existing capability_slug, propose ONE pattern (2–6 words, lowercase, the actual phrase from the verdict).

2. **new_capability** — LAST RESORT. Only allowed when NO existing capability in the catalog has the moat_tags combination you need to fire for this signal. Before proposing one, mentally scan the full catalog above for any capability tagged with the relevant axis (network/switching/data/regulatory) and confirm none is a fit even loosely. If even one existing capability carries the right tag, you MUST add_pattern to that one instead — even if the display_name doesn't perfectly describe the new phrasing. Provide slug, display_name, category, 3–8 match_patterns (drawn from the verdict text + close variants), and the appropriate moat_tags.

**Why this matters:** the scoring engine counts capability hits flatly. Every new capability you create permanently inflates aggregate scores across the corpus on re-projection. Pattern additions are elastic — they only change scores on reports that match the new phrasing. When in doubt, add_pattern.

For both: the \`evidence\` field is the literal verdict snippet that triggered your suggestion. Quote it directly. For new_capability, you must additionally include in the evidence field a one-clause justification of the form "no existing capability tags X" naming the axis — if you can't write that clause truthfully, the suggestion should be add_pattern instead.

## Discipline

- Be conservative. If an axis is 0 because the report genuinely has no signal in that axis, suggest nothing for that axis. ("Stripe has no UGC" is the correct answer; don't invent UGC where there is none.)
- NEVER use negated or absence evidence as a positive match. Phrases like "no behavioral data flywheel", "no proprietary corpus", "without UGC", "users export and leave", "near-zero switching", "low data moat", or "no network effect" mean the axis should stay low. Do not propose add_pattern/new_capability from those snippets.
- If the current score is too high because a generic capability appears to have over-fired on negated/absence prose, say that in verdict_summary and return zero additive suggestions. The admin can remove or narrow the overfiring pattern from the evidence UI.
- Don't propose patterns that would over-fire. Patterns should match the specific moat-bearing concept, not generic English.
- Don't propose capabilities that overlap with existing ones — extend the existing one with add_pattern instead.
- Aim for 0–4 suggestions per audit. An audit returning only add_pattern items (or zero items, when the score is correct) is a good audit. A new_capability suggestion should be rare and load-bearing.

## Output

Call submit_audit exactly once with:
- verdict_summary: 1–2 sentence plain summary of the moat shape this report SHOULD have (high in axes X and Y, low in Z because…).
- suggestions: array of add_pattern / new_capability items.`;

function formatCatalog(capabilities: CapabilityRow[]): string {
  const byCategory: Record<string, CapabilityRow[]> = {};
  for (const c of capabilities) {
    (byCategory[c.category] ??= []).push(c);
  }
  const lines: string[] = [];
  for (const cat of Object.keys(byCategory).sort()) {
    lines.push(`- ${cat}:`);
    for (const c of byCategory[cat].sort((a, b) => a.slug.localeCompare(b.slug))) {
      const tags = c.moat_tags.length > 0 ? c.moat_tags.join(", ") : "(no moat tags)";
      lines.push(`    · ${c.slug} — "${c.display_name}" — tags: ${tags}`);
    }
  }
  return lines.join("\n");
}

function buildUserMessage(input: MoatAuditInput): string {
  const v = input.verdict;
  const m = input.moat;
  const matchedSet = new Set(input.matched_capability_slugs);
  const matchedNames = input.capabilities
    .filter((c) => matchedSet.has(c.slug))
    .map((c) => `${c.slug}${c.moat_tags.length > 0 ? ` [${c.moat_tags.join(",")}]` : ""}`)
    .join(", ");
  const challenges = v.challenges
    .map((c) => `(${c.diff}) ${c.name}: ${c.note}`)
    .join("\n");
  const estCost = v.est_cost.map((l) => `- ${l.line}: ${l.cost}`).join("\n");

  return `## Report

slug: ${input.report.slug}
name: ${v.name}
tier: ${v.tier} (wedge score ${v.wedge_score})
tagline: ${v.tagline}

### wedge thesis
${v.wedge_thesis}

### take
${v.take}

### take_sub
${v.take_sub}

### challenges
${challenges}

### est_cost lines
${estCost}

## Current moat score

aggregate: ${m.aggregate.toFixed(1)} / 10
- capital:    ${m.capital.toFixed(1)}
- technical:  ${m.technical.toFixed(1)}
- network:    ${m.network.toFixed(1)}
- switching:  ${m.switching.toFixed(1)}
- data:       ${m.data_moat.toFixed(1)}
- regulatory: ${m.regulatory.toFixed(1)}

## Capabilities currently firing on this report

${matchedNames || "(none with moat tags fired)"}

## Full capability catalog (for alias-target context)

${formatCatalog(input.capabilities)}

Audit and call submit_audit.`;
}

export async function auditMoat(input: MoatAuditInput): Promise<MoatAuditResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { kind: "error", message: "ANTHROPIC_API_KEY is not configured" };
  }
  const client = new Anthropic({ apiKey });

  const batchJsonSchema = sanitizeInputSchema(z.toJSONSchema(BatchSchema));

  const tools: Anthropic.Tool[] = [
    {
      name: "submit_audit",
      description:
        "Submit the moat audit: a 1–2 sentence summary of the moat shape this report should have, plus 0–4 specific taxonomy suggestions. Strongly prefer add_pattern over new_capability — only propose new_capability when no existing capability carries the moat_tags you need.",
      input_schema: batchJsonSchema as Anthropic.Tool["input_schema"],
    },
  ];

  let response;
  try {
    response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.2,
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        tool_choice: { type: "tool", name: "submit_audit" },
        tools,
        messages: [{ role: "user", content: buildUserMessage(input) }],
      },
      { signal: input.signal },
    );
  } catch (e) {
    return {
      kind: "error",
      message: e instanceof Error ? e.message : String(e),
    };
  }

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return {
      kind: "error",
      message: `Claude did not invoke a tool. stop_reason=${response.stop_reason ?? "unknown"}`,
    };
  }

  const parsed = BatchSchema.safeParse(toolUse.input);
  if (parsed.success) {
    return {
      kind: "ok",
      verdict_summary: parsed.data.verdict_summary,
      suggestions: parsed.data.suggestions as MoatAuditSuggestion[],
    };
  }

  if (isOnlyStringOverages(parsed.error)) {
    const lenient = toolUse.input as {
      verdict_summary: string;
      suggestions: MoatAuditSuggestion[];
    };
    return {
      kind: "ok",
      verdict_summary: lenient.verdict_summary,
      suggestions: lenient.suggestions ?? [],
    };
  }

  const issues = parsed.error.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
  return { kind: "error", message: `Validation failed: ${issues}` };
}
