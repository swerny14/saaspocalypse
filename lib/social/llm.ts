import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { StoredReport } from "@/lib/db/reports";
import { SocialPostOutputSchema, TWEET_MAX } from "./schema";
import type { Template, ReportTemplate, OriginalTemplate } from "./templates";

const MODEL = "claude-sonnet-4-6";
// Tweets are short — 800 leaves margin for a 2-tweet thread plus the
// JSON wrapping the tool_use payload.
const MAX_TOKENS = 800;
// Higher than the scanner's 0.3 — voice variability is a feature here.
const TEMPERATURE = 0.7;

const SYSTEM_PROMPT = `You are saaspocalypse on X (Twitter) — the daily content voice for a tool that scores SaaS wedge opportunity for indie hackers (where the walls are thin and the niche is open). Your job is to write ONE post per call: either a single tweet, or a 2-tweet thread (head + one reply). The post will be auto-posted to X within seconds.

Every call specifies which template to write. The template defines the shape, the length, and whether it threads. Match it.

## Voice rules

- Pun-heavy, deadpan, witty. Never mean to teams or users — criticize complexity, not people.
- Lowercase-first deadpan for the joke / observation lines. Periods or "?" are fine; no "!" marks.
- Sentence case is fine for earnest UI-style lines (verdict cards, "score: 78").
- One concrete number per tweet when possible — score, hours, dollars, percentages. The numbers are the joke.
- Short, end-weighted, quotable. Read each line aloud — if it lands flat, rewrite it.
- The brand is "saaspocalypse" — always lowercase. The pill form "SAASPOCALYPSE" doesn't appear in tweets.
- Preserve proper-noun caps inside any voice: Postgres, Next.js, Supabase, Stripe, Resend, SaaS, CRUD, URL, API, GitHub, Vercel.
- Tier tokens are ALL CAPS when quoted as labels: SOFT, CONTESTED, FORTRESS. Never ALL-CAPS a sentence.

## Hard length rule

Each tweet ≤ ${TWEET_MAX} characters, INCLUDING any URL it contains. Count it. Going one character over fails validation and burns the slot.

## Hard composition rules (if the template threads)

- The URL appears ONLY in the head tweet (\`body\`). Never in a reply.
- If the template's tweet_count is 1, do not produce any \`thread_bodies\`. Leave the array empty / omit it.
- If the template's tweet_count is 2, produce exactly one entry in \`thread_bodies\`.
- Replies must stand on their own as readable lines, but they should make the head tweet better — not just repeat it.

## What NOT to do

- No emojis.
- No hashtags. (No "#indiehacking", no "#buildinpublic", none of it.)
- No @mentions.
- No em-dashes (—). Use a regular hyphen ( - ) or a middle dot ( · ) for separators.
- No smart quotes (" " ' '). Straight quotes only.
- No ellipsis character (…). Use three periods (...) if you need one.
- No marketing-speak: discover, unlock, game-changer, revolutionary, the future of.
- No "thread 🧵" affordance. The post is auto-formatted as a thread by the platform — don't announce it.
- No revenue / sale-count claims ("8 sales/mo", "$10K MRR by Christmas"). The math is unreliable.
- No \`snake_case\` field names leaking into prose. "9 hours", not "time_estimate: 9 hours".
- ASCII only. If the schema cap pushes you against this, shorten the line — don't sneak in fancy unicode.
- Do not echo any tweet from the "do not echo" list verbatim or near-verbatim if one is provided.

## Output contract

You MUST call the \`submit_post\` tool. No free-form text output.

Set \`includes_link\` to true if the head tweet body contains an https:// URL. Set it to false otherwise. The \`includes_link\` flag is for self-check; the post is rejected if it claims true but the body has no URL.

## Calibration

Each call provides a \`template\` block with the template's id, tweet_count, description, and 2-3 example tweets. Match the example examples' shape and length, not their wording. The examples define the voice; your job is to apply it to the specific input.`;

/** Strip JSON Schema keys Anthropic's tool-use schema doesn't accept. */
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

export type GenerateInput =
  | {
      kind: "report";
      template: ReportTemplate;
      report: StoredReport;
      link_url: string;
    }
  | {
      kind: "original";
      template: OriginalTemplate;
      recent_originals: string[];
      directory_url: string;
      directory_count?: number;
    };

export type GenerateOutput =
  | {
      kind: "post";
      body: string;
      thread_bodies: string[];
      link_url: string | null;
    }
  | {
      kind: "error";
      reason: "llm_failed" | "validation_failed";
      message: string;
    };

export async function generateSocialPost(
  input: GenerateInput,
  signal?: AbortSignal,
): Promise<GenerateOutput> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      kind: "error",
      reason: "llm_failed",
      message: "ANTHROPIC_API_KEY is not configured",
    };
  }
  const client = new Anthropic({ apiKey });

  const tools: Anthropic.Tool[] = [
    {
      name: "submit_post",
      description:
        "Submit one X post: a single tweet (omit thread_bodies) or a 2-tweet thread (one entry in thread_bodies).",
      input_schema: sanitizeInputSchema(
        z.toJSONSchema(SocialPostOutputSchema),
      ) as Anthropic.Tool["input_schema"],
    },
  ];

  const userMessage = buildUserMessage(input);
  const messages: Anthropic.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  // Attempt 1.
  const first = await callOnce(client, messages, tools, signal);
  if (first.kind === "fatal") {
    return { kind: "error", reason: "llm_failed", message: first.message };
  }
  const firstParsed = SocialPostOutputSchema.safeParse(first.input);
  if (firstParsed.success) {
    return toOutput(firstParsed.data, input);
  }

  // Retry with validation feedback.
  messages.push({
    role: "assistant",
    content: [
      {
        type: "tool_use",
        id: first.toolUseId,
        name: "submit_post",
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
        content: `Validation failed: ${formatZodIssues(firstParsed.error)}. Fix and resubmit via submit_post. Remember: each tweet ≤ ${TWEET_MAX} chars including any URL.`,
      },
    ],
  });

  const retry = await callOnce(client, messages, tools, signal);
  if (retry.kind === "fatal") {
    return { kind: "error", reason: "llm_failed", message: retry.message };
  }
  const retryParsed = SocialPostOutputSchema.safeParse(retry.input);
  if (retryParsed.success) {
    return toOutput(retryParsed.data, input);
  }
  return {
    kind: "error",
    reason: "validation_failed",
    message: `validation failed after retry: ${formatZodIssues(retryParsed.error)}`,
  };
}

function toOutput(
  parsed: z.infer<typeof SocialPostOutputSchema>,
  input: GenerateInput,
): GenerateOutput {
  return {
    kind: "post",
    body: parsed.body,
    thread_bodies: parsed.thread_bodies ?? [],
    link_url:
      input.kind === "report"
        ? input.link_url
        : input.template.links_to_directory
          ? input.directory_url
          : null,
  };
}

function buildUserMessage(input: GenerateInput): string {
  const t = input.template as Template;
  const exampleBlock = t.examples
    .map((ex, i) => `### Example ${i + 1}\n${ex}`)
    .join("\n\n");

  const header = `Write ONE post for template \`${t.id}\` (tweet_count = ${t.tweet_count}).

Description:
${t.description}

Examples (match the shape, NOT the wording):

${exampleBlock}`;

  if (input.kind === "report") {
    const r = input.report;
    const stack = Array.isArray(r.stack) ? r.stack.slice(0, 3) : [];
    const reportFacts = JSON.stringify(
      {
        name: r.name,
        tagline: r.tagline,
        tier: r.tier,
        wedge_score: r.wedge_score,
        wedge_thesis: r.wedge_thesis,
        take: r.take,
        time_estimate: r.time_estimate,
        est_total: r.est_total,
        current_cost: {
          price: r.current_cost?.price,
          unit: r.current_cost?.unit,
        },
        stack,
      },
      null,
      2,
    );

    return `${header}

## Report facts

\`\`\`json
${reportFacts}
\`\`\`

## URL to embed

The head tweet (\`body\`) MUST contain this URL verbatim: ${input.link_url}

Do not add UTM parameters, do not shorten, do not change the protocol. The URL must appear ONLY in the head tweet — never in a reply.

Now produce the post via submit_post.`;
  }

  // original
  const recents = input.recent_originals.length
    ? input.recent_originals.map((b, i) => `${i + 1}. ${b}`).join("\n")
    : "(none yet)";

  const directoryLine = input.template.links_to_directory
    ? `\n\n## URL to embed\n\nThe head tweet (\`body\`) MUST contain this URL verbatim: ${input.directory_url}\nDirectory currently lists ${input.directory_count ?? "several"} reports — feel free to riff on the count.`
    : `\n\nThis template does NOT include a link. Set \`includes_link\` to false. Do not include any URL.`;

  return `${header}

## Recent originals (DO NOT echo any of these — every post must be a new joke)

${recents}${directoryLine}

Now produce the post via submit_post.`;
}

type RawCall =
  | { kind: "tool_use"; input: unknown; toolUseId: string }
  | { kind: "fatal"; message: string };

async function callOnce(
  client: Anthropic,
  messages: Anthropic.MessageParam[],
  tools: Anthropic.Tool[],
  signal?: AbortSignal,
): Promise<RawCall> {
  let response;
  try {
    response = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: TEMPERATURE,
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
      message: e instanceof Error ? e.message : String(e),
    };
  }

  const toolUse = response.content.find((b) => b.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    return { kind: "fatal", message: "Claude did not invoke submit_post." };
  }
  if (toolUse.name !== "submit_post") {
    return { kind: "fatal", message: `unexpected tool: ${toolUse.name}` };
  }
  return { kind: "tool_use", input: toolUse.input, toolUseId: toolUse.id };
}
