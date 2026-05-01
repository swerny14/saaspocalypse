import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { StoredReport } from "@/lib/db/reports";
import { BuildGuideSchema, type BuildGuide } from "./schema";

// We tried Haiku 4.5 for the speed/cost win, but it returned catastrophically
// incomplete tool_use payloads (missing top-level fields like `steps`,
// `stack_specifics`, `pitfalls`) on nested schemas. Sonnet 4.6 is slower and
// costlier but reliable end-to-end. With the tight schema caps below, Sonnet
// finishes in ~35-50s at ~4K output tokens — acceptable for a paid product.
const MODEL = "claude-sonnet-4-6";
// Schema caps worst-case output at ~4900 tokens; 6000 gives reasonable margin
// without letting Sonnet sprawl. If stop_reason=max_tokens fires here,
// something is wrong with the prompt, not the budget.
const MAX_TOKENS = 6000;

const SYSTEM_PROMPT = `You are a senior indie-hacker mentor writing a WEDGE ATTACK PLAN for a solo developer. The buyer just read a saaspocalypse verdict on an incumbent SaaS and paid for HOW to attack the wedge — the weakest defensible axis named in the verdict — not how to clone the full product.

This is a wedge plan, not a clone guide. Successful entrants against defensible incumbents duck the moat instead of meeting it head-on. Your job: turn \`weakest_moat_axis\` and \`wedge_thesis\` into a concrete, shippable plan a motivated solo dev can execute over a few weekends.

## How this differs from a normal "build guide"

- You are NOT writing "how to clone X". You are writing "how to attack X where they're weakest".
- Steps target the WEDGE — a stripped scope, a specific niche, or a portable/data-light angle that exploits the weakest axis.
- Pitfalls call out the moats the buyer should NOT try to attack (the strongest axes).
- Every plan opens by naming what the buyer IS and ISN'T building.

## How to read the input

- \`wedge_thesis\` — one sentence naming "the door". Treat as the verdict's authoritative call on where the wall is thinnest.
- \`weakest_moat_axis\` — \`capital | technical | network | switching | data_moat | regulatory | distribution\`. The axis you're attacking. Tailor the plan to it (see playbooks).
- \`tier\` — \`SOFT | CONTESTED | FORTRESS\`. SOFT = wedge is wide, plan can be ambitious. FORTRESS = wedge is narrow, plan must be ruthlessly scoped.
- \`challenges\` — the verdict's explicit threats. Pitfalls should engage with these, not invent new ones.
- \`stack\` — the incumbent's stack. The buyer is NOT obligated to match it; choose tools that fit the WEDGE.

## Axis playbooks

- **capital** — "they spent millions on infra/research". Wedge: pick a vertical or use case that doesn't need their full infrastructure. Wrap OSS instead of training. Lease compute by the call.
- **technical** — "the tech is genuinely hard". Wedge: a 10× smaller scope where you don't have to solve the hard part. Looser invariants, narrower inputs.
- **network** — "users come for other users". Wedge: target a sub-community the incumbent underserves. Make data portable. Win the niche before they notice.
- **switching** — "users have lock-in". Wedge: target NEW users. Or build the "import from X" tool that makes leaving them painless.
- **data_moat** — "they have proprietary data". Wedge: LLM-native + public sources. Trade a big dataset for a clever prompt + retrieval loop.
- **regulatory** — "regulation is the moat". Wedge: an unregulated geography, an audited sub-niche, or unbundle the regulated piece (let the customer bring their own compliance).
- **distribution** — "the brand IS the moat". Wedge: a community, a content angle, or a channel they ignore. The plan is mostly GTM, not code.

For distribution-axis wedges, steps lean GTM (specific channel, content cadence, audience, post templates) over code. For all other axes, steps lean code-first with a short distribution beat near the end. Both kinds of steps still carry an LLM prompt — content prompts are valuable too.

## Voice

- Direct, warm, zero corporate tone.
- Same dry tone as saaspocalypse verdicts — light, never mean, never cynical.
- Write like a senior friend who has shipped three of these and watched two more get killed by the moat.
- Open the overview by naming what the buyer IS and ISN'T building. Examples:
  - "You're not rebuilding Stripe. You're building a payouts page for one vertical (Substack-style writers) on top of Stripe Connect."
  - "You're not cloning ChatGPT. You're shipping a domain-specific wrapper that beats them on context (uploaded company docs) without trying to beat them on raw model quality."

## Structure rules (HARD LIMITS — validation will reject violations)

| Field | Constraint |
|---|---|
| overview | 1-2 paragraphs naming the wedge angle + the IS/ISN'T frame, **≤800 chars**. |
| prerequisites | 3-5 items, **each ≤100 chars**. |
| steps | **EXACTLY 6-7 steps.** Numbered sequentially from 1, no gaps. |
| step.title | Imperative, **≤80 chars**. |
| step.body | 2-3 sentences, **≤450 chars**. |
| step.est_time | Human phrase ("~45 min"). **≤30 chars**. |
| step.llm_prompts | 1-2 per step. Code prompts OR content prompts both fine. |
| llm_prompt.label | **≤50 chars**. |
| llm_prompt.prompt | Single focused ask. **≤500 chars**. |
| stack_specifics.libraries | 0-6 items. Skip if the wedge is GTM-driven and code is incidental. name ≤60, version ≤30, purpose ≤100. |
| stack_specifics.references | 0-4 items. label ≤80, why ≤120. |
| pitfalls | 1-3 items. title ≤60, body ≤300. **Frame as moats NOT to attack.** |

## Pitfalls voice

Pitfalls are the strongest axes — what the buyer should NOT try to take on. Examples:
- "Don't try to match their data moat. Their dataset took years. Stay LLM-native."
- "Don't pitch enterprise procurement. Their distribution + sales motion will outlast yours by years. Stay self-serve."
- "Don't try to win on raw model quality. You will lose. Your wedge is context, not the underlying weights."

## Brevity bar (load-bearing)

**Total output target: ~4500 tokens.** You will be truncated beyond that. Shorter > longer, always.

Rules:
- Each prompt = ONE focused ask. If a prompt wants two paragraphs, split it OR fold it into the step body.
- Step bodies are map directions, not essays. 2-3 sentences of "here's what you're building / shipping / posting and what's tricky about it". No preamble, no "In this step...".
- Don't explain frameworks the dev already knows (Next.js, Postgres, etc.). They bought the plan.
- Don't restate the incumbent's name on every line. The buyer knows who they're attacking.
- Every sentence earns its tokens.

## LLM prompt quality bar

Each prompt is something the dev/operator can paste into Claude / Cursor / Copilot RIGHT NOW.

Good code prompt: "Generate src/components/editor/Editor.tsx — a React client component using TipTap + StarterKit, debounced 400ms onChange. Tailwind only. Full file, no placeholder comments."

Good content prompt: "Write 10 X (Twitter) posts targeting {niche community}. Voice: dry, technical, no hashtags. Each post is one specific use case my tool solves that {incumbent} doesn't. Output as a numbered list."

Bad prompt: "help me with marketing".

## Output contract

- You MUST call the submit_build_guide tool.
- No free-form text output.
- Every required field in the schema is required.

## Example — one well-formed step (data_moat axis, narrow vertical play)

{
  "n": 2,
  "title": "Build the legal-doc block schema",
  "body": "Define a TipTap schema with five domain blocks: clause, defined-term, citation, redline, signature-block. Skip the full block library — the wedge is depth in legal, not breadth. Persistence comes in step 4.",
  "est_time": "~60 min",
  "llm_prompts": [
    {
      "label": "Domain schema",
      "prompt": "Generate a TipTap schema in TypeScript at src/lib/editor/schema.ts. Custom blocks: clause (heading + body + numbered subclauses), defined-term (highlighted inline), citation (link with footnote anchor), redline (insert + delete marks), signature-block. Use @tiptap/core and @tiptap/extension*. Export \`editorSchema\`. Full file, no placeholders."
    }
  ]
}`;

function sanitizeInputSchema(schema: unknown): Record<string, unknown> {
  const obj = { ...(schema as Record<string, unknown>) };
  delete obj.$schema;
  delete obj.$id;
  return obj;
}

function formatZodIssues(err: z.ZodError): string {
  return err.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
}

/**
 * True if every issue is just a string exceeding its max-length cap — a
 * cosmetic concern we can accept when Claude completed cleanly. Wrong types,
 * missing fields, or array-count violations are NOT tolerated.
 *
 * The caps still serve their purpose: they're in the JSON schema sent to
 * Claude and in the system prompt, so Claude targets them. If Claude
 * overshoots by a bit, we'd rather ship the paid product than retry.
 */
function isOnlyStringOverages(err: z.ZodError): boolean {
  if (err.issues.length === 0) return false;
  return err.issues.every(
    (i) => i.code === "too_big" && "origin" in i && i.origin === "string",
  );
}

export type LLMGuideOutput =
  | {
      kind: "guide";
      guide: BuildGuide;
      usage: {
        input_tokens: number;
        output_tokens: number;
      };
    }
  | { kind: "error"; message: string };

type RawCall =
  | {
      kind: "raw";
      input: unknown;
      toolUseId: string;
      inputTokens: number;
      outputTokens: number;
      truncated: boolean;
    }
  | { kind: "fatal"; message: string };

export async function generateBuildGuide(
  report: StoredReport,
  signal?: AbortSignal,
): Promise<LLMGuideOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { kind: "error", message: "ANTHROPIC_API_KEY is not configured" };
  }
  const client = new Anthropic({ apiKey });

  const guideJsonSchema = sanitizeInputSchema(z.toJSONSchema(BuildGuideSchema));

  // Strip DB metadata; pass only the substantive verdict shape to Claude.
  const verdictForPrompt = {
    name: report.name,
    tagline: report.tagline,
    tier: report.tier,
    wedge_score: report.wedge_score,
    weakest_moat_axis: report.weakest_moat_axis,
    wedge_thesis: report.wedge_thesis,
    take: report.take,
    take_sub: report.take_sub,
    time_estimate: report.time_estimate,
    time_breakdown: report.time_breakdown,
    break_even: report.break_even,
    est_total: report.est_total,
    current_cost: report.current_cost,
    est_cost: report.est_cost,
    alternatives: report.alternatives,
    challenges: report.challenges,
    stack: report.stack,
  };

  const axisLine = report.weakest_moat_axis
    ? `Weakest axis (the door): **${report.weakest_moat_axis}** — open the axis playbook for this axis and let it shape the plan.`
    : `Weakest axis is unspecified on this verdict. Read the wedge_thesis carefully and infer the axis yourself before applying a playbook.`;

  const fortressScope =
    report.tier === "FORTRESS"
      ? `

FORTRESS-tier scope check: the wedge here is narrow. The plan must be ruthlessly scoped — accept clear gaps and call them out in pitfalls. Do not pretend a head-on clone is feasible.`
      : "";

  const userMessage = `Produce a wedge attack plan for this saaspocalypse verdict.

${axisLine}

\`\`\`json
${JSON.stringify(verdictForPrompt, null, 2)}
\`\`\`${fortressScope}

Generate the plan now. The buyer is a solo indie hacker. Use the axis playbook for the weakest axis to shape the steps; don't blindly mirror the incumbent's stack — choose tools that fit the WEDGE.`;

  const tools: Anthropic.Tool[] = [
    {
      name: "submit_build_guide",
      description:
        "Submit the full build guide. Every field is required. Steps must be numbered sequentially starting at 1.",
      input_schema: guideJsonSchema as Anthropic.Tool["input_schema"],
    },
  ];

  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  const first = await callOnce(client, messages, tools, signal);
  if (first.kind === "fatal") return { kind: "error", message: first.message };

  // If the first call was TRUNCATED (stop_reason=max_tokens), its tool_use
  // input is partial/malformed. Don't feed that back to Claude — retry with
  // a fresh user message that emphasizes brevity. Two fresh attempts still
  // fit within our timeout budget.
  if (first.truncated) {
    console.warn(
      `[build_guide] first attempt truncated at max_tokens · out=${first.outputTokens}; retrying with brevity instruction`,
    );
    return retryWithBrevity(client, userMessage, tools, {
      input_tokens: first.inputTokens,
      output_tokens: first.outputTokens,
    }, signal);
  }

  const firstParsed = BuildGuideSchema.safeParse(first.input);
  if (firstParsed.success) {
    return {
      kind: "guide",
      guide: firstParsed.data,
      usage: { input_tokens: first.inputTokens, output_tokens: first.outputTokens },
    };
  }

  // If the only issues are string-length overages and Claude completed cleanly,
  // accept the response. The caps are guidance, not data integrity rules.
  if (!first.truncated && isOnlyStringOverages(firstParsed.error)) {
    console.warn(
      `[build_guide] accepting response with string-length overages · ${formatZodIssues(firstParsed.error)}`,
    );
    return {
      kind: "guide",
      guide: first.input as BuildGuide,
      usage: { input_tokens: first.inputTokens, output_tokens: first.outputTokens },
    };
  }

  console.warn(
    `[build_guide] first attempt failed Zod validation · ${formatZodIssues(firstParsed.error)}`,
  );
  // Light shape dump so we can see what Claude actually submitted (truncated to keep logs sane).
  try {
    const preview = JSON.stringify(first.input).slice(0, 500);
    console.warn(`[build_guide] first attempt input preview: ${preview}...`);
  } catch {
    // ignore
  }

  // Retry once with validation feedback, keeping the tool_use block as context
  // so Claude sees what it submitted and what was wrong with it.
  messages.push({
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: first.toolUseId,
        name: "submit_build_guide",
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
        content: `Validation failed: ${formatZodIssues(firstParsed.error)}.

Call submit_build_guide AGAIN with the COMPLETE payload — ALL required top-level fields: overview, prerequisites, steps (6-8 items), stack_specifics (with libraries + references), pitfalls. Fix the validation errors above. Do not submit a partial object.`,
      },
    ],
  });

  const retry = await callOnce(client, messages, tools, signal);
  if (retry.kind === "fatal") return { kind: "error", message: retry.message };

  // If the validation-feedback retry ALSO truncates, fall through to the
  // brevity retry — it's our last shot.
  if (retry.truncated) {
    console.warn(
      `[build_guide] validation retry also truncated · retrying with brevity instruction`,
    );
    return retryWithBrevity(client, userMessage, tools, {
      input_tokens: first.inputTokens + retry.inputTokens,
      output_tokens: first.outputTokens + retry.outputTokens,
    }, signal);
  }

  const retryParsed = BuildGuideSchema.safeParse(retry.input);
  if (retryParsed.success) {
    return {
      kind: "guide",
      guide: retryParsed.data,
      usage: { input_tokens: retry.inputTokens, output_tokens: retry.outputTokens },
    };
  }

  if (!retry.truncated && isOnlyStringOverages(retryParsed.error)) {
    console.warn(
      `[build_guide] accepting retry response with string-length overages · ${formatZodIssues(retryParsed.error)}`,
    );
    return {
      kind: "guide",
      guide: retry.input as BuildGuide,
      usage: { input_tokens: retry.inputTokens, output_tokens: retry.outputTokens },
    };
  }

  return {
    kind: "error",
    message: `Validation failed after retry: ${formatZodIssues(retryParsed.error)}`,
  };
}

/**
 * Last-resort retry: start a fresh conversation (no broken tool_use in the
 * history) with an explicit brevity instruction. Used when a prior attempt
 * hit max_tokens.
 */
async function retryWithBrevity(
  client: Anthropic,
  originalUserMessage: string,
  tools: Anthropic.Tool[],
  prevUsage: { input_tokens: number; output_tokens: number },
  signal?: AbortSignal,
): Promise<LLMGuideOutput> {
  const brevityMessages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `${originalUserMessage}\n\nCRITICAL: keep output compact. Target ~3500 tokens total. Shorter step bodies (2-3 sentences each), tighter prompts (one focused ask each), no preamble or explainer filler. Stay within the schema's max-length constraints — a truncated response fails the contract.`,
    },
  ];

  const call = await callOnce(client, brevityMessages, tools, signal);
  if (call.kind === "fatal") return { kind: "error", message: call.message };

  if (call.truncated) {
    return {
      kind: "error",
      message: `Output truncated twice despite brevity instruction (out=${call.outputTokens}). Consider lowering schema max-length caps or raising MAX_TOKENS.`,
    };
  }

  const parsed = BuildGuideSchema.safeParse(call.input);
  if (parsed.success) {
    return {
      kind: "guide",
      guide: parsed.data,
      usage: {
        input_tokens: prevUsage.input_tokens + call.inputTokens,
        output_tokens: prevUsage.output_tokens + call.outputTokens,
      },
    };
  }

  if (!call.truncated && isOnlyStringOverages(parsed.error)) {
    console.warn(
      `[build_guide] accepting brevity-retry response with string-length overages · ${formatZodIssues(parsed.error)}`,
    );
    return {
      kind: "guide",
      guide: call.input as BuildGuide,
      usage: {
        input_tokens: prevUsage.input_tokens + call.inputTokens,
        output_tokens: prevUsage.output_tokens + call.outputTokens,
      },
    };
  }

  return {
    kind: "error",
    message: `Brevity retry failed validation: ${formatZodIssues(parsed.error)}`,
  };
}

const PER_CALL_TIMEOUT_MS = 90_000;

async function callOnce(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
  tools: Anthropic.Tool[],
  upstream?: AbortSignal,
): Promise<RawCall> {
  const started = Date.now();
  console.log(
    `[build_guide] → POST to Anthropic · model=${MODEL} max_tokens=${MAX_TOKENS}`,
  );

  // Belt-and-suspenders timeout: the SDK's `timeout` option + our own
  // AbortSignal. We combine three sources of cancellation: local timeout,
  // upstream client disconnect (req.signal), and the SDK's own timeout.
  const ac = new AbortController();
  const timer = setTimeout(() => {
    console.warn(
      `[build_guide] local timeout after ${PER_CALL_TIMEOUT_MS}ms — aborting`,
    );
    ac.abort();
  }, PER_CALL_TIMEOUT_MS);
  let onUpstreamAbort: (() => void) | null = null;
  if (upstream) {
    if (upstream.aborted) {
      ac.abort();
    } else {
      onUpstreamAbort = () => {
        console.warn(`[build_guide] upstream aborted — cancelling Anthropic call`);
        ac.abort();
      };
      upstream.addEventListener("abort", onUpstreamAbort, { once: true });
    }
  }
  // Heartbeat so we can see the call is still alive.
  const pulse = setInterval(() => {
    console.log(
      `[build_guide] …still waiting · ${Math.round((Date.now() - started) / 1000)}s elapsed`,
    );
  }, 10_000);

  try {
    const response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
        tool_choice: { type: "any" },
        tools,
        messages,
      },
      { timeout: PER_CALL_TIMEOUT_MS, signal: ac.signal },
    );

    const elapsed = Date.now() - started;
    console.log(
      `[build_guide] ← Anthropic 200 · ${elapsed}ms · in=${response.usage.input_tokens} out=${response.usage.output_tokens} stop=${response.stop_reason}`,
    );

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      return {
        kind: "fatal",
        message: `Claude did not invoke submit_build_guide (stop_reason=${response.stop_reason}).`,
      };
    }

    return {
      kind: "raw",
      input: toolUse.input,
      toolUseId: toolUse.id,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      truncated: response.stop_reason === "max_tokens",
    };
  } catch (e) {
    const elapsed = Date.now() - started;
    console.error(`[build_guide] ← Anthropic failed · ${elapsed}ms ·`, e);
    return {
      kind: "fatal",
      message: e instanceof Error ? e.message : String(e),
    };
  } finally {
    clearTimeout(timer);
    clearInterval(pulse);
    if (upstream && onUpstreamAbort) {
      upstream.removeEventListener("abort", onUpstreamAbort);
    }
  }
}

export const GUIDE_MODEL = MODEL;
