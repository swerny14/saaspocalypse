import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { StoredReport } from "@/lib/db/reports";
import type { MoatBreakdown, MoatScore } from "./moat";
import type { PatternEntry } from "./scoring_defaults";

/**
 * LLM-assisted scoring pattern suggester. Given a report + its current
 * moat breakdown + the active pattern catalog, proposes new patterns
 * (capex / fortress_thesis / authoritative-domain) that would close
 * coverage gaps the deterministic engine missed.
 *
 * Posture mirrors moat_audit_llm: deterministic engine unchanged, LLM is
 * a curation aid, the human applies (via /admin/score-audit). Suggestions
 * are persisted as disabled rows tagged `added_by='llm:score_audit'` so
 * the curator can enable the ones they want before recomputing.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2000;

const PATTERN_KINDS = [
  "capex",
  "capex_exclude",
  "fortress_thesis",
  "distribution_authoritative_domain",
] as const;

const AXES = [
  "capital",
  "technical",
  "network",
  "switching",
  "data_moat",
  "regulatory",
  "distribution",
] as const;

export type ScoringSuggestion = {
  axis: (typeof AXES)[number];
  kind: (typeof PATTERN_KINDS)[number];
  pattern: string;
  evidence: string;
};

const SuggestionSchema = z.object({
  axis: z.enum(AXES),
  kind: z.enum(PATTERN_KINDS),
  pattern: z.string().min(1).max(400),
  evidence: z.string().min(1).max(800),
});

const BatchSchema = z.object({
  summary: z.string().min(1).max(1200),
  suggestions: z.array(SuggestionSchema).max(8),
});

export type ScoringAuditResult =
  | { kind: "ok"; summary: string; suggestions: ScoringSuggestion[] }
  | { kind: "error"; message: string };

const SYSTEM_PROMPT = `You are an auditor for a deterministic moat-scoring engine. The engine has seven 0–10 axes (capital, technical, network, switching, data_moat, regulatory, distribution). Your job is narrow: when a report's prose contains capital-investment or distribution-strength signals the engine ISN'T capturing, propose specific regex / domain patterns that would fix the gap.

## What you can suggest

Only the four pattern kinds the engine reads:

1. **capex** — regex matched against the verdict's prose (est_cost lines, take, take_sub, wedge_thesis, challenge notes) for the CAPITAL axis. A match adds 1 capex hit (capped per surface). Examples: \`\\\\bgpu\\\\s+clusters?\\\\b\`, \`\\\\bA100s?\\\\b\`, \`\\\\bresearch\\\\s+team\\\\b\`.

2. **capex_exclude** — regex that suppresses a capex match when present in the same surface. Example: \`\\\\bsoc\\\\s?2\\\\b\` excludes "SOC 2" because it's table-stakes for any B2B SaaS.

3. **fortress_thesis** — regex matched against the wedge_thesis only. When ANY pattern matches, capital scoring takes the FORTRESS path (anchor 7 + capex hits). Examples: \`\\\\bno\\\\s+door\\\\b\`, \`\\\\bfortress(?:[- ]grade)?\\\\b\`, \`\\\\bdecade(s)?\\\\s+deep\\\\b\`.

4. **distribution_authoritative_domain** — domain string (suffix-matched, no regex) added to the SERP authoritative-third-party list for the DISTRIBUTION axis. Examples: \`youtube.com\`, \`crunchbase.com\`. Suggest only when the report's prose references a domain that should clearly count as authoritative coverage.

You CANNOT suggest changes to network/switching/data_moat/regulatory axes here — those are capability-driven and edited in the score workbench's capability catalog fixes panel. You CANNOT suggest weight changes here — the scoring weights are tuned by the curator, not the LLM.

## When to suggest

- Capital axis is LOW but the prose mentions GPU/training/research/regulatory/banking signals not captured by existing capex patterns → propose **capex** patterns matching the specific phrasing.
- Capital axis is HIGH but the prose is calling out a niche wedge (LLM thesis says "wedgeable in vertical") → consider whether a **capex_exclude** pattern would suppress over-firing on a generic word.
- Distribution axis is LOW but the report's authoritative coverage shows up in domains not in the current authoritative list → propose **distribution_authoritative_domain** entries with the literal domain.
- Wedge thesis declares a fortress posture in language not yet in the fortress_thesis catalog ("locked-down market", "audit-grade", etc.) → propose a **fortress_thesis** pattern.

## Discipline

- Be conservative. 0 suggestions is the right answer when current scoring is honest.
- Don't propose patterns that match generic English. Patterns should match the specific moat-bearing concept.
- For each suggestion, the \`evidence\` field MUST quote the literal verdict snippet that triggered the suggestion.
- Patterns are case-INSENSITIVE (we always compile with /i). Don't include the /i flag.
- Use \`\\\\b\` word boundaries to avoid partial matches.
- Test your regex mentally against the snippet you cited in evidence — it must match.

## Output

Call submit_scoring_audit exactly once with:
- \`summary\`: 1-2 sentences describing the moat-score health of this report and what (if anything) is worth adding.
- \`suggestions\`: 0-8 items per the rules above.`;

function sanitizeInputSchema(schema: unknown): Record<string, unknown> {
  const obj = { ...(schema as Record<string, unknown>) };
  delete obj.$schema;
  delete obj.$id;
  return obj;
}

/**
 * Same posture as the other LLM call sites in this repo: when the only
 * issues are string-length overages and Claude otherwise completed
 * cleanly, accept the response. Caps are guidance for the model, not
 * data-integrity gates. Structural errors (wrong types, missing fields,
 * bad enums, bad array counts) are still rejected.
 */
function isOnlyStringOverages(err: z.ZodError): boolean {
  if (err.issues.length === 0) return false;
  return err.issues.every(
    (i) => i.code === "too_big" && "origin" in i && i.origin === "string",
  );
}

function formatZodIssues(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

function formatPatternCatalog(patterns: PatternEntry[]): string {
  const byKind: Record<string, string[]> = {};
  for (const p of patterns) {
    if (p.status !== "active") continue;
    const key = `${p.axis}/${p.kind}`;
    (byKind[key] ??= []).push(p.pattern);
  }
  const lines: string[] = [];
  for (const k of Object.keys(byKind).sort()) {
    lines.push(`- ${k} (${byKind[k].length}):`);
    for (const pattern of byKind[k].slice(0, 30)) {
      lines.push(`    · ${pattern}`);
    }
    if (byKind[k].length > 30) {
      lines.push(`    · … and ${byKind[k].length - 30} more`);
    }
  }
  return lines.join("\n");
}

function formatBreakdown(moat: MoatScore, breakdown: MoatBreakdown): string {
  const lines: string[] = [];
  lines.push(
    `aggregate ${moat.aggregate.toFixed(1)} / capital ${moat.capital.toFixed(1)} / technical ${moat.technical.toFixed(1)} / network ${moat.network.toFixed(1)} / switching ${moat.switching.toFixed(1)} / data ${moat.data_moat.toFixed(1)} / regulatory ${moat.regulatory.toFixed(1)} / distribution ${moat.distribution?.toFixed(1) ?? "—"}`,
  );
  lines.push("");
  lines.push(`capital path: ${breakdown.capital.path}`);
  lines.push(`capital capex hits (${breakdown.capital.capex_hits.length}):`);
  for (const h of breakdown.capital.capex_hits.slice(0, 12)) {
    lines.push(`  · ${h.surface}: "${h.matched_text}" (pattern: ${h.pattern})`);
  }
  if (breakdown.capital.fortress_thesis_match) {
    lines.push(
      `fortress-thesis match: "${breakdown.capital.fortress_thesis_match.matched_text}" (pattern: ${breakdown.capital.fortress_thesis_match.pattern})`,
    );
  }
  if (breakdown.distribution) {
    lines.push("");
    lines.push("distribution sub-signals:");
    for (const s of breakdown.distribution.sub_signals) {
      lines.push(
        `  · ${s.name}: raw=${String(s.raw_value)} weight=${s.weight} score=${s.score}`,
      );
    }
  }
  return lines.join("\n");
}

export type ScoringAuditInput = {
  report: StoredReport;
  moat: MoatScore;
  breakdown: MoatBreakdown;
  patterns: PatternEntry[];
  signal?: AbortSignal;
};

export async function suggestScoringPatterns(
  input: ScoringAuditInput,
): Promise<ScoringAuditResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { kind: "error", message: "ANTHROPIC_API_KEY is not configured" };
  }
  const client = new Anthropic({ apiKey });

  const batchJsonSchema = sanitizeInputSchema(z.toJSONSchema(BatchSchema));

  const r = input.report;
  const userMessage = `## Report

slug: ${r.slug}
name: ${r.name}
tagline: ${r.tagline}
tier: ${r.tier} (wedge score ${r.wedge_score})

### wedge thesis
${r.wedge_thesis}

### take
${r.take}

### take_sub
${r.take_sub}

### challenges
${r.challenges.map((c) => `(${c.diff}) ${c.name}: ${c.note}`).join("\n")}

### est_cost lines
${r.est_cost.map((l) => `- ${l.line}: ${l.cost}`).join("\n")}

## Current moat score + breakdown

${formatBreakdown(input.moat, input.breakdown)}

## Active scoring patterns (don't duplicate)

${formatPatternCatalog(input.patterns)}

Audit and call submit_scoring_audit.`;

  const tools: Anthropic.Tool[] = [
    {
      name: "submit_scoring_audit",
      description:
        "Submit a scoring-pattern audit: 1-2 sentence summary + 0-8 suggested patterns. Strongly prefer 0 suggestions when scoring is honest.",
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
        tool_choice: { type: "tool", name: "submit_scoring_audit" },
        tools,
        messages: [{ role: "user", content: userMessage }],
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
    return { kind: "error", message: "Claude did not invoke the audit tool." };
  }
  const parsed = BatchSchema.safeParse(toolUse.input);
  if (parsed.success) {
    return finalize(parsed.data.summary, parsed.data.suggestions);
  }

  // Tolerate string-length overages — caps are guidance for the model,
  // not gatekeeping for otherwise-valid responses. Mirrors the pattern in
  // lib/scanner/llm.ts and lib/build_guide/llm.ts.
  if (isOnlyStringOverages(parsed.error)) {
    console.warn(
      `[scoring_audit] accepting response with string-length overages · ${formatZodIssues(parsed.error)}`,
    );
    const lenient = toolUse.input as {
      summary: string;
      suggestions: ScoringSuggestion[];
    };
    return finalize(lenient.summary, lenient.suggestions ?? []);
  }

  return {
    kind: "error",
    message: "Validation failed: " + formatZodIssues(parsed.error),
  };
}

/**
 * Final assembly: validate each suggestion's regex eagerly so we never
 * persist a pattern the loader will choke on. Domain entries skip the
 * regex check.
 */
function finalize(
  summary: string,
  suggestions: ScoringSuggestion[],
): ScoringAuditResult {
  const valid: ScoringSuggestion[] = [];
  for (const s of suggestions) {
    if (s.kind !== "distribution_authoritative_domain") {
      try {
        new RegExp(s.pattern, "i");
      } catch {
        continue;
      }
    }
    valid.push(s);
  }
  return { kind: "ok", summary, suggestions: valid };
}
