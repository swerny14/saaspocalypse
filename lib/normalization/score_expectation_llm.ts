import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { MOAT_AXES, type MoatAxis, type VerdictReport } from "@/lib/scanner/schema";
import type { StoredMoatScore } from "@/lib/db/moat_scores";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1800;

export const AXIS_BANDS = ["low", "medium", "high", "unknown"] as const;
export type AxisBand = (typeof AXIS_BANDS)[number];

export type ScoreExpectationFlag = {
  axis: MoatAxis;
  kind: "overfire" | "underfire";
  expected: Exclude<AxisBand, "unknown">;
  actual: Exclude<AxisBand, "unknown">;
  score: number;
  rationale: string;
};

export type ScoreExpectation = {
  rubric_version: number;
  verdict_hash: string;
  bands: Record<MoatAxis, AxisBand>;
  rationale: Partial<Record<MoatAxis, string>>;
  flags: ScoreExpectationFlag[];
};

export type ScoreExpectationResult =
  | { kind: "ok"; expectation: ScoreExpectation }
  | { kind: "error"; message: string };

const AxisBandSchema = z.enum(AXIS_BANDS);
const ToolSchema = z.object({
  bands: z.object({
    capital: AxisBandSchema,
    technical: AxisBandSchema,
    network: AxisBandSchema,
    switching: AxisBandSchema,
    data_moat: AxisBandSchema,
    regulatory: AxisBandSchema,
    distribution: AxisBandSchema,
  }),
  rationale: z.object({
    capital: z.string().max(240).optional(),
    technical: z.string().max(240).optional(),
    network: z.string().max(240).optional(),
    switching: z.string().max(240).optional(),
    data_moat: z.string().max(240).optional(),
    regulatory: z.string().max(240).optional(),
    distribution: z.string().max(240).optional(),
  }),
});

function sanitizeInputSchema(schema: unknown): Record<string, unknown> {
  const obj = { ...(schema as Record<string, unknown>) };
  delete obj.$schema;
  delete obj.$id;
  return obj;
}

function simpleHash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, "0");
}

export function scoreExpectationHash(verdict: VerdictReport): string {
  return simpleHash(
    JSON.stringify({
      name: verdict.name,
      tagline: verdict.tagline,
      wedge_thesis: verdict.wedge_thesis,
      take: verdict.take,
      take_sub: verdict.take_sub,
      challenges: verdict.challenges,
      est_cost: verdict.est_cost,
      moat_axis: verdict.weakest_moat_axis,
    }),
  );
}

function numericBand(score: number | null): Exclude<AxisBand, "unknown"> | "unknown" {
  if (score === null || !Number.isFinite(score)) return "unknown";
  if (score <= 2.9) return "low";
  if (score >= 7) return "high";
  return "medium";
}

export function compareExpectationToScore(
  bands: Record<MoatAxis, AxisBand>,
  rationale: Partial<Record<MoatAxis, string>>,
  moat: StoredMoatScore,
): ScoreExpectationFlag[] {
  const flags: ScoreExpectationFlag[] = [];
  for (const axis of MOAT_AXES) {
    const expected = bands[axis];
    const score = moat[axis];
    const actual = numericBand(score);
    if (expected === "unknown" || actual === "unknown" || score === null) continue;
    if (expected === "low" && score >= 7) {
      flags.push({
        axis,
        kind: "overfire",
        expected,
        actual,
        score,
        rationale: rationale[axis] ?? "",
      });
    } else if (expected === "high" && score <= 2.9) {
      flags.push({
        axis,
        kind: "underfire",
        expected,
        actual,
        score,
        rationale: rationale[axis] ?? "",
      });
    }
  }
  return flags;
}

const SYSTEM_PROMPT = `You are a score-expectation reviewer for a deterministic SaaS moat scoring engine.

Read the verdict prose and assign each moat axis an expected qualitative band: low, medium, high, or unknown.

Axes:
- capital: costly non-software spend, operational teams, compliance/audit budgets, inventory, payments risk, enterprise implementation.
- technical: engineering complexity, algorithms, realtime/collab, security-sensitive infrastructure, integrations, AI/data pipelines.
- network: multi-sided marketplaces, UGC, social graph, partner/app ecosystem, viral loops, network effects.
- switching: customer data stored in product, workflow lock-in, integrations, approvals, migration pain, enterprise dependency.
- data_moat: proprietary corpus, behavioral data flywheel, user-generated training data, risk/fraud model data, non-exportable accumulated dataset.
- regulatory: licenses or regulated duties like HIPAA, FINRA, KYC/AML, money transmission, clinical/EHR data. SOC 2 alone is low.
- distribution: brand/search/category ownership, credible public footprint, authority signals, owned demand.

Important:
- This is a reviewer, not a scorer. Do not mirror the numeric score. Infer the band from the verdict prose.
- Negated evidence means low, not high: "no behavioral data", "no proprietary corpus", "users export and leave", "near-zero switching", "no network effect".
- Use unknown when the verdict does not contain enough information.
- Keep rationale short and cite the core reason.

Call submit_expectation once.`;

function buildUserMessage(verdict: VerdictReport, moat: StoredMoatScore): string {
  const challenges = verdict.challenges
    .map((c) => `- (${c.diff}) ${c.name}: ${c.note}`)
    .join("\n");
  const estCost = verdict.est_cost.map((l) => `- ${l.line}: ${l.cost}`).join("\n");

  return `## Report

name: ${verdict.name}
tier: ${verdict.tier}
wedge_score: ${verdict.wedge_score}
tagline: ${verdict.tagline}
weakest_moat_axis from current report: ${verdict.weakest_moat_axis ?? "(none)"}

### wedge thesis
${verdict.wedge_thesis}

### take
${verdict.take}

### take_sub
${verdict.take_sub}

### challenges
${challenges}

### estimated cost lines
${estCost}

## Current deterministic moat score, for disagreement context only

- capital: ${moat.capital.toFixed(1)}
- technical: ${moat.technical.toFixed(1)}
- network: ${moat.network.toFixed(1)}
- switching: ${moat.switching.toFixed(1)}
- data_moat: ${moat.data_moat.toFixed(1)}
- regulatory: ${moat.regulatory.toFixed(1)}
- distribution: ${moat.distribution === null ? "null" : moat.distribution.toFixed(1)}

Return expected qualitative bands from the verdict prose.`;
}

export async function expectScoreBands(input: {
  verdict: VerdictReport;
  moat: StoredMoatScore;
  signal?: AbortSignal;
}): Promise<ScoreExpectationResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return { kind: "error", message: "ANTHROPIC_API_KEY is not configured" };

  const client = new Anthropic({ apiKey });
  const tools: Anthropic.Tool[] = [
    {
      name: "submit_expectation",
      description: "Submit qualitative expected moat bands and short rationales.",
      input_schema: sanitizeInputSchema(
        z.toJSONSchema(ToolSchema),
      ) as Anthropic.Tool["input_schema"],
    },
  ];

  let response;
  try {
    response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.1,
        system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
        tool_choice: { type: "tool", name: "submit_expectation" },
        tools,
        messages: [{ role: "user", content: buildUserMessage(input.verdict, input.moat) }],
      },
      { signal: input.signal },
    );
  } catch (e) {
    return { kind: "error", message: e instanceof Error ? e.message : String(e) };
  }

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return {
      kind: "error",
      message: `Claude did not invoke a tool. stop_reason=${response.stop_reason ?? "unknown"}`,
    };
  }

  const parsed = ToolSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return { kind: "error", message: `Validation failed: ${issues}` };
  }

  const bands = parsed.data.bands;
  const rationale = parsed.data.rationale;
  return {
    kind: "ok",
    expectation: {
      rubric_version: input.moat.rubric_version,
      verdict_hash: scoreExpectationHash(input.verdict),
      bands,
      rationale,
      flags: compareExpectationToScore(bands, rationale, input.moat),
    },
  };
}
