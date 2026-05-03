import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { DetectedStack } from "@/lib/scanner/fingerprint";
import type { DistributionSignals } from "@/lib/scanner/distribution";
import {
  aggregateMoatScore,
  RUBRIC_VERSION,
  scoreDistributionWithBreakdown,
  type MoatScore,
} from "./moat";
import type { LLMVerdict } from "@/lib/scanner/schema";

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2800;
const RATIONALE_WARN_CHARS = 280;
const EVIDENCE_WARN_CHARS = 220;

const AxisJudgmentSchema = z.object({
  score: z.number().min(0).max(10),
  confidence: z.enum(["low", "medium", "high"]),
  rationale: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
});

const MoatJudgmentSchema = z.object({
  axes: z.object({
    capital: AxisJudgmentSchema,
    technical: AxisJudgmentSchema,
    network: AxisJudgmentSchema,
    switching: AxisJudgmentSchema,
    data_moat: AxisJudgmentSchema,
    regulatory: AxisJudgmentSchema,
  }),
});

export type MoatJudgment = z.infer<typeof MoatJudgmentSchema>;

export type LLMMoatScoreResult =
  | { kind: "ok"; score: MoatScore; judgment: MoatJudgment }
  | { kind: "error"; message: string };

export type LLMMoatScoreInput = {
  verdict: LLMVerdict;
  distribution?: DistributionSignals | null;
  detectedStack?: DetectedStack | null;
  signal?: AbortSignal;
};

const SYSTEM_PROMPT = `You are the moat-scoring judge for saaspocalypse.

Score six SaaS moat axes from 0 to 10. Higher means the incumbent is harder for an AI-assisted indie builder to attack. Lower means the wall is thin.

You are NOT scoring whether the product is good. You are scoring defensibility.

Axes:
- capital: non-software spend, compliance teams, legal/audit cost, proprietary infra, inventory, payments risk, enterprise implementation.
- technical: engineering depth, realtime/collab complexity, security-sensitive systems, algorithms, AI/data pipelines, hard integrations.
- network: marketplaces, UGC, social graph, partner/app ecosystem, viral loops, multi-sided liquidity.
- switching: customer data/state trapped in product, workflow lock-in, migration pain, approval chains, deep integrations.
- data_moat: proprietary corpus, behavioral data flywheel, training data, fraud/risk model data, accumulated non-exportable dataset.
- regulatory: licenses or regulated duties such as HIPAA, FINRA, KYC/AML, money transmission, clinical/EHR data, PCI/payment obligations. SOC 2 alone is low.

Rubric:
- 0-2: no meaningful moat evidence; easy for a small team to route around.
- 3-5: some friction, but mostly product execution or normal SaaS work.
- 6-8: real moat; entrant needs unusual effort, trust, data, integrations, or market access.
- 9-10: fortress; licenses, liquidity, proprietary data, capital, or trust are the product.

Rules:
- Cite evidence for every axis. If evidence is weak or absent, score low with low/medium confidence.
- Negated evidence is not positive evidence: "no data moat", "users can export", "no network effect", "SOC 2 only" should lower scores.
- Do not reward generic SaaS features. Auth, dashboards, CRUD, email, and basic analytics are not moats.
- Be strict. Honest low scores are valuable; inflated scores waste users' time.
- Distribution is scored deterministically elsewhere. Treat the distribution signals as context, but do not score distribution.

Call submit_moat_scores exactly once.`;

function sanitizeInputSchema(schema: unknown): Record<string, unknown> {
  const obj = { ...(schema as Record<string, unknown>) };
  delete obj.$schema;
  delete obj.$id;
  return obj;
}

function formatStack(stack: DetectedStack | null | undefined): string {
  if (!stack) return "(none detected)";
  const lines: string[] = [];
  if (stack.hosting) lines.push(`hosting: ${stack.hosting}`);
  if (stack.framework) lines.push(`framework: ${stack.framework}`);
  if (stack.cms) lines.push(`cms: ${stack.cms}`);
  if (stack.cdn?.length) lines.push(`cdn: ${stack.cdn.join(", ")}`);
  if (stack.payments?.length) lines.push(`payments: ${stack.payments.join(", ")}`);
  if (stack.auth?.length) lines.push(`auth: ${stack.auth.join(", ")}`);
  if (stack.analytics?.length) lines.push(`analytics: ${stack.analytics.join(", ")}`);
  if (stack.support?.length) lines.push(`support: ${stack.support.join(", ")}`);
  if (stack.email?.length) lines.push(`email: ${stack.email.join(", ")}`);
  return lines.length ? lines.join("\n") : "(none detected)";
}

function formatDistribution(signals: DistributionSignals | null | undefined): string {
  if (!signals) return "(not collected)";
  return [
    `knowledge_graph_present: ${String(signals.knowledge_graph_present)}`,
    `has_sitelinks: ${String(signals.has_sitelinks)}`,
    `top_organic_owned: ${String(signals.top_organic_owned)}`,
    `serp_own_domain_count: ${String(signals.serp_own_domain_count)}`,
    `organic_count: ${String(signals.organic_count)}`,
    `authoritative_third_party_count: ${String(signals.authoritative_third_party_count)}`,
    `pricing_gate: ${String(signals.pricing_gate)}`,
  ].join("\n");
}

function buildUserMessage(input: LLMMoatScoreInput): string {
  const v = input.verdict;
  const challenges = v.challenges
    .map((c) => `- (${c.diff}) ${c.name}: ${c.note}`)
    .join("\n");
  const estCost = v.est_cost.map((l) => `- ${l.line}: ${l.cost}`).join("\n");

  return `## Report

name: ${v.name}
tagline: ${v.tagline}
wedge thesis: ${v.wedge_thesis}

### take
${v.take}

### take_sub
${v.take_sub}

### challenges
${challenges}

### estimated competing cost
est_total: ${v.est_total}
${estCost}

### current cost
${v.current_cost.label}: ${v.current_cost.price} / ${v.current_cost.unit}

### LLM-proposed stack
${v.stack.join(", ")}

### detected stack signals
${formatStack(input.detectedStack)}

### deterministic distribution signals
${formatDistribution(input.distribution)}

Score the six non-distribution axes now.`;
}

function roundTo1(n: number): number {
  return Math.round(n * 10) / 10;
}

function warnOnVerboseJudgment(judgment: MoatJudgment, reportName: string): void {
  const warnings: string[] = [];
  for (const [axis, value] of Object.entries(judgment.axes)) {
    if (value.rationale.length > RATIONALE_WARN_CHARS) {
      warnings.push(
        `${axis}.rationale=${value.rationale.length}/${RATIONALE_WARN_CHARS}`,
      );
    }
    value.evidence.forEach((item, index) => {
      if (item.length > EVIDENCE_WARN_CHARS) {
        warnings.push(
          `${axis}.evidence[${index}]=${item.length}/${EVIDENCE_WARN_CHARS}`,
        );
      }
    });
  }
  if (warnings.length > 0) {
    console.warn(
      `[moat_llm] verbose score judgment accepted for ${reportName}: ${warnings.join("; ")}`,
    );
  }
}

export async function scoreMoatWithLLM(
  input: LLMMoatScoreInput,
): Promise<LLMMoatScoreResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      kind: "error",
      message: "ANTHROPIC_API_KEY is not configured",
    };
  }

  const client = new Anthropic({ apiKey });
  const tools: Anthropic.Tool[] = [
    {
      name: "submit_moat_scores",
      description: "Submit evidence-bound moat scores for the six non-distribution axes.",
      input_schema: sanitizeInputSchema(
        z.toJSONSchema(MoatJudgmentSchema),
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
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
        ],
        tool_choice: { type: "tool", name: "submit_moat_scores" },
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
      message: `Claude did not invoke the score tool. stop_reason=${response.stop_reason ?? "unknown"}`,
    };
  }

  const parsed = MoatJudgmentSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    return { kind: "error", message: `Validation failed: ${issues}` };
  }

  warnOnVerboseJudgment(parsed.data, input.verdict.name);

  const distribution = scoreDistributionWithBreakdown(input.distribution).score;
  const parts = {
    capital: roundTo1(parsed.data.axes.capital.score),
    technical: roundTo1(parsed.data.axes.technical.score),
    network: roundTo1(parsed.data.axes.network.score),
    switching: roundTo1(parsed.data.axes.switching.score),
    data_moat: roundTo1(parsed.data.axes.data_moat.score),
    regulatory: roundTo1(parsed.data.axes.regulatory.score),
    distribution,
  };
  const score: MoatScore = {
    rubric_version: RUBRIC_VERSION,
    ...parts,
    aggregate: aggregateMoatScore(parts),
  };

  return { kind: "ok", score, judgment: parsed.data };
}
