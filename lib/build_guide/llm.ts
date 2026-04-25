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

const SYSTEM_PROMPT = `You are a senior indie-hacker mentor writing a concrete build guide for a solo developer. The user has already read a saaspocalypse verdict report on a SaaS product and has decided to build a comparable version themselves.

Your job: produce a step-by-step build guide that a motivated solo dev could actually follow this weekend. Concrete > conceptual. Libraries with versions > vague categories. Copy-paste LLM prompts > prose descriptions.

## Voice

- Direct, warm, zero corporate tone.
- Same snark as saaspocalypse verdicts — light, never mean.
- Write like a senior friend who's shipped three of these.

## Structure rules (HARD LIMITS — validation will reject violations)

| Field | Constraint |
|---|---|
| overview | 1-2 paragraphs, **≤800 chars**. |
| prerequisites | 3-5 items, **each ≤100 chars**. |
| steps | **EXACTLY 6-7 steps.** Numbered sequentially from 1, no gaps. |
| step.title | Imperative, **≤80 chars**. |
| step.body | 2-3 sentences, **≤450 chars**. |
| step.est_time | Human phrase ("~45 min"). **≤30 chars**. |
| step.llm_prompts | 1-2 per step. |
| llm_prompt.label | **≤50 chars**. |
| llm_prompt.prompt | Single focused ask. **≤500 chars**. |
| stack_specifics.libraries | 3-6 items. name ≤60, version ≤30, purpose ≤100. |
| stack_specifics.references | 0-4 items. label ≤80, why ≤120. |
| pitfalls | 1-3 items. title ≤60, body ≤300. |

## Brevity bar (this is load-bearing)

**Total output target: ~4500 tokens.** You will be truncated beyond that. Shorter > longer, always.

Rules:
- Each prompt should be ONE focused ask. If you feel the urge to write a second paragraph in a prompt, split it into two prompts OR fold it into the step body.
- Step bodies are map directions, not essays. 2-3 sentences of "here's what you're building and what's tricky about it". No preamble, no "In this step...".
- Don't explain frameworks the dev already knows (Next.js, Postgres, etc.). They bought the guide.
- Don't restate the product name. The buyer knows what they're cloning.
- Every sentence must earn its tokens.

## LLM prompt quality bar

Each prompt block should be something the dev can paste into Claude / Cursor / Copilot RIGHT NOW and get useful output. Good prompts name files ("src/app/api/scan/route.ts"), specify the framework version ("Next.js 15 App Router"), and state the acceptance criteria ("should return SSE with the shape { type: 'step' | 'done', ... }").

Bad prompt (too vague): "help me build the block editor"
Good prompt: "Generate a TipTap schema in TypeScript for a block-based document editor. Requirements: paragraph, heading (h1-h3), bullet/numbered list, inline code. Export a single \`editorSchema\` constant. Assume @tiptap/core and @tiptap/starter-kit are installed. Output the full file at src/lib/editor/schema.ts."

## Output contract

- You MUST call the submit_build_guide tool.
- No free-form text output.
- Every field in the schema is required.

## Example — one well-formed step (note the brevity)

{
  "n": 3,
  "title": "Ship the block editor skeleton",
  "body": "Mount TipTap with StarterKit in a client component at src/components/editor/Editor.tsx. Wire an onUpdate that debounces writes to a server action (400ms). Skip persistence here — prove the editing loop first, add DB in step 5.",
  "est_time": "~45 min",
  "llm_prompts": [
    {
      "label": "Editor scaffold",
      "prompt": "Generate src/components/editor/Editor.tsx — a React client component using TipTap + StarterKit (@tiptap/react, @tiptap/starter-kit). Props: initial content (JSON | undefined), onChange(json) debounced 400ms via useRef timer. Style with Tailwind: prose prose-sm max-w-none, thin border, padding. Override editorProps.attributes.class so the focus ring shows. Full file, no placeholder comments."
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
    score: report.score,
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

  const userMessage = `Produce a build guide for this saaspocalypse verdict:

\`\`\`json
${JSON.stringify(verdictForPrompt, null, 2)}
\`\`\`

Generate the full guide now. The buyer is a solo indie hacker. Assume the stack listed in the verdict unless a challenge implies otherwise.`;

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

  const first = await callOnce(client, messages, tools);
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
    });
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

  const retry = await callOnce(client, messages, tools);
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
    });
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
): Promise<LLMGuideOutput> {
  const brevityMessages: Anthropic.MessageParam[] = [
    {
      role: "user",
      content: `${originalUserMessage}\n\nCRITICAL: keep output compact. Target ~3500 tokens total. Shorter step bodies (2-3 sentences each), tighter prompts (one focused ask each), no preamble or explainer filler. Stay within the schema's max-length constraints — a truncated response fails the contract.`,
    },
  ];

  const call = await callOnce(client, brevityMessages, tools);
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
): Promise<RawCall> {
  const started = Date.now();
  console.log(
    `[build_guide] → POST to Anthropic · model=${MODEL} max_tokens=${MAX_TOKENS}`,
  );

  // Belt-and-suspenders timeout: the SDK's `timeout` option + our own AbortSignal.
  const ac = new AbortController();
  const timer = setTimeout(() => {
    console.warn(
      `[build_guide] local timeout after ${PER_CALL_TIMEOUT_MS}ms — aborting`,
    );
    ac.abort();
  }, PER_CALL_TIMEOUT_MS);
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
  }
}

export const GUIDE_MODEL = MODEL;
