import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import {
  STACK_COMPONENTS,
  type ComponentCategory,
} from "./taxonomy";

/**
 * Admin-only curation aid. Given a batch of open unknowns from the review
 * queue, asks Claude to suggest one of three resolutions per row:
 *   - ALIAS to an existing canonical (when the term is just a different name
 *     for something we already have)
 *   - PROMOTE to a new canonical (when the term is a real component we don't
 *     have yet) — emits category + commoditization_level + 1-line note
 *   - IGNORE (jokes, descriptors, generic concepts, compliance frameworks)
 *
 * NOT user-facing. The deterministic normalization engine is unchanged; this
 * just pre-fills the admin form. Keep that distinction explicit in CLAUDE.md
 * and any copy that mentions it — the "no AI wrapper" stance is about the
 * product, admin internals are different.
 */

const MODEL = "claude-sonnet-4-6";
// Sized for 50-row batches: each suggestion is ~60 output tokens (UUID + action
// + slug-or-category-level + ~40-token note + JSON overhead), so a 50-row run
// is ~3K tokens. 8K leaves headroom for occasional verbose notes and avoids
// the partial-tool-use truncation we'd otherwise hit at the BATCH_LIMIT.
const MAX_TOKENS = 8000;

const COMPONENT_CATEGORIES: ComponentCategory[] = [
  "hosting",
  "framework",
  "ui",
  "cms",
  "db",
  "payments",
  "auth",
  "cdn",
  "analytics",
  "email",
  "support",
  "crm",
  "ml",
  "search",
  "queue",
  "monitoring",
  "devtools",
  "integrations",
  "infra",
];

export type SuggestionInput = {
  unknowns: Array<{
    id: string;
    raw_term: string;
    occurrences: number;
    /** Source report's name + tagline + sibling stack array, when available. */
    source_context?: {
      report_name: string;
      tagline: string;
      tier: string;
      sibling_stack: string[];
    };
  }>;
  signal?: AbortSignal;
};

export type Suggestion =
  | {
      unknown_id: string;
      action: "alias";
      target_slug: string;
      note: string;
    }
  | {
      unknown_id: string;
      action: "promote";
      category: ComponentCategory;
      commoditization_level: number;
      note: string;
    }
  | { unknown_id: string; action: "ignore"; note: string };

export type SuggestionResult =
  | { kind: "ok"; suggestions: Suggestion[] }
  | { kind: "error"; message: string };

const SuggestionSchema = z.discriminatedUnion("action", [
  z.object({
    unknown_id: z.string().min(1),
    action: z.literal("alias"),
    target_slug: z.string().min(1).max(80),
    note: z.string().min(1).max(200),
  }),
  z.object({
    unknown_id: z.string().min(1),
    action: z.literal("promote"),
    category: z.enum(COMPONENT_CATEGORIES as [ComponentCategory, ...ComponentCategory[]]),
    commoditization_level: z.number().int().min(0).max(5),
    note: z.string().min(1).max(200),
  }),
  z.object({
    unknown_id: z.string().min(1),
    action: z.literal("ignore"),
    note: z.string().min(1).max(200),
  }),
]);

const BatchSchema = z.object({
  suggestions: z.array(SuggestionSchema),
});

/**
 * Build the canonical-components reference block for the system prompt.
 * Listing every existing slug grouped by category gives Claude the universe
 * of valid alias targets and anchors its category/commoditization choices.
 */
function formatCatalog(): string {
  const byCat: Record<string, Array<{ slug: string; level: number; name: string }>> = {};
  for (const c of STACK_COMPONENTS) {
    (byCat[c.category] ??= []).push({
      slug: c.slug,
      level: c.commoditization_level,
      name: c.display_name,
    });
  }
  const lines: string[] = [];
  for (const cat of COMPONENT_CATEGORIES) {
    const items = byCat[cat];
    if (!items || items.length === 0) continue;
    items.sort((a, b) => a.slug.localeCompare(b.slug));
    lines.push(`- ${cat}:`);
    for (const it of items) {
      lines.push(`    · ${it.slug} (L${it.level}, "${it.name}")`);
    }
  }
  return lines.join("\n");
}

const SYSTEM_PROMPT = `You are a curator for a stack-taxonomy database used to normalize indie-hacker SaaS scan reports. For each unknown term I send, decide one of three actions:

1. ALIAS — the term is just a different name (alternate spelling, version suffix, marketing variant) for an existing canonical component. Output \`target_slug\` matching one of the known slugs below. Example: "PostgreSQL" → alias to \`postgres\`.

2. PROMOTE — the term is a real software component not yet in the catalog and worth tracking. Output \`category\` (one of the 16 below) plus \`commoditization_level\` (0–5). Output a brief 1-line \`note\` explaining what the tool is.

3. IGNORE — the term is NOT a real component. Common cases: jokes/descriptors from DON'T-tier reports ("your remaining tears", "regulatory attorneys"), generic concepts ("a database", "ML model"), compliance frameworks (SOC 2, ISO 27001), or trivial UI utility libs that don't move any moat axis (one-line npm dependencies). Output a 1-line \`note\` explaining why.

## Categories

- **hosting** — where the app runs (Vercel, AWS, Heroku)
- **framework** — application framework / app structure (Next.js, Rails, Phoenix, NestJS)
- **ui** — headless UI primitives + interaction libs, NOT app frameworks (Tiptap, ProseMirror, Lexical, Radix UI, shadcn/ui, dnd-kit, framer-motion, cmdk, TanStack Query/Table)
- **cms** — content management / website builders (WordPress, Webflow, Sanity, Contentful, Framer)
- **db** — data persistence (Postgres, Supabase, MongoDB, Redis, ClickHouse)
- **payments** — money movement (Stripe, Paddle, Lemon Squeezy)
- **auth** — identity (Clerk, Auth0, NextAuth, Lucia)
- **cdn** — edge caching (Cloudflare, CloudFront, Fastly)
- **analytics** — user/product behavior tracking (PostHog, GA4, Mixpanel, Segment, rrweb)
- **email** — sending email (Resend, Postmark, SendGrid, React Email)
- **support** — help/chat (Intercom, Crisp, Plain, Zendesk)
- **crm** — CRM / sales / marketing-automation platforms (HubSpot, Salesforce, Pipedrive, Attio, Folk, Close)
- **ml** — model APIs and ML infrastructure (OpenAI, Anthropic, Replicate, Pinecone, Weaviate)
- **search** — full-text/vector search (Algolia, Meilisearch, Typesense)
- **queue** — job queues / workflows (Trigger.dev, Inngest, Temporal)
- **monitoring** — errors/uptime/observability (Sentry, Datadog, Axiom)
- **devtools** — engineer tools incl. testing/automation (GitHub, Linear, Playwright, Puppeteer, Vitest, Vanta, Drata)
- **integrations** — named third-party APIs the product wraps (Google Calendar API, Slack API, Notion API, X API, Reddit API, Stripe Connect, Spotify API). Distinct from \`infra\`: these tie to a specific product's data, not generic utility.
- **infra** — generic platform infrastructure that doesn't tie to a specific product (S3, R2, Twilio, UploadThing)

## Commoditization scale (lower = more moat for the incumbent that uses it)

The number answers ONE question: how long would it take an indie hacker to rip this out and replace it? **Ecosystem size and tool popularity do NOT matter** — only swap effort. A small-ecosystem OSS framework is as commodity as a large-ecosystem one because the swap to a peer framework is the same kind of rewrite either way.

### Category defaults (use these unless something specific lowers the number)

- **OSS libraries you \`npm install\` / \`pip install\` / \`mix install\`** → **5**. Almost always. Includes UI libs, data-fetching libs, validation libs, parsers, headless component libs. Examples: TanStack Query, Zod, Prisma, React Hook Form, Tiptap, Lexical.
- **Application frameworks** → **4 or 5**. Use **5** for thin meta-frameworks that don't impose a data layer or auth convention (Next.js, Remix, Astro, Nuxt, SvelteKit, Gatsby). Use **4** for full-stack frameworks that ship conventions, data-layer integration, and an opinionated workflow (Rails, Django, Laravel, **Phoenix**, NestJS, Spring Boot). Phoenix → 4. The framework's ecosystem size is irrelevant — what matters is whether a swap also forces a data/auth/convention migration.
- **Hosted services with portable data formats** → **4**. Postgres-as-a-service (Supabase, Neon, PlanetScale), object storage (S3, R2), payment processing (Stripe), email APIs (Resend, Postmark), error monitoring (Sentry, Axiom). The data exports cleanly; the swap is a week of migration plumbing.
- **Hosted services with proprietary schemas/APIs** → **3**. Lock-in lives in the data format itself: Auth0 (proprietary user model), Algolia (proprietary index format), Pinecone/Weaviate (proprietary vector index), Snowflake/BigQuery (warehouse-specific SQL dialects).
- **Cloud platforms** → **3**. AWS, GCP, Azure — leaving requires re-architecting around different primitives, not just changing a config.

### When to reach BELOW 3 (rare — only when genuinely true)

- **2** — Managed niche service with no obvious peer alternative (specialized vertical SaaS, narrow-domain ML platforms, regulated finance/health-specific tools).
- **1** — OSS self-hosted requiring real ops investment to run reliably (in-house Kubernetes, custom Postgres-on-bare-metal, self-managed Kafka cluster).
- **0** — Built from scratch / proprietary research-grade systems (fraud models trained on years of data, custom payment infra, in-house ML pipelines, regulated banking infra).

If you're considering 0–2, ask: **"is this genuinely hard to replicate, or just niche?"** Niche is not moat. The vast majority of taxonomy components live in 3–5. When unsure, err **higher** — over-rating a tool's commoditization is a much smaller error than under-rating it, because the moat-scoring math is driven by rare 0–2 outliers, not by gradations among 3–5.

## When to IGNORE rather than PROMOTE

- Compliance frameworks (SOC 2, ISO 27001, GDPR-as-a-list-item) — these are audits, not tools. HIPAA / FINRA / PCI DSS are also IGNORE here; they're tracked as capabilities elsewhere.
- Single-purpose UI libraries with zero moat impact (react-qr-code, react-intersection-observer, classnames). One-line dependencies that nobody would compare products on.
- Joke/descriptor entries from DON'T-tier reports ("a war chest", "your remaining sanity", "regulatory attorneys").
- Generic concepts ("a database", "user data", "the bank now").
- Plan/tier suffixes that survived the harvester ("Pro", "Enterprise"). These are price-tier descriptors, not components.

## Existing canonical components (alias targets)

${formatCatalog()}

## Output contract

- Call exactly one tool: \`submit_suggestions\`.
- Emit one suggestion per unknown id provided. Do not invent ids.
- For \`alias\`, target_slug MUST match one of the slugs above.
- For \`promote\`, category MUST be one of the 16 listed.`;

function sanitizeInputSchema(schema: unknown): Record<string, unknown> {
  const obj = { ...(schema as Record<string, unknown>) };
  delete obj.$schema;
  delete obj.$id;
  return obj;
}

/**
 * Mirrors `isOnlyStringOverages` in lib/scanner/llm.ts: when the only Zod
 * issues are string-length overages, accept the response anyway. The caps
 * are there to keep notes terse-ish — when Claude goes over, the content is
 * still usable. Structural failures (wrong types, missing fields, bad enums)
 * are still rejected.
 */
function isOnlyStringOverages(err: z.ZodError): boolean {
  if (err.issues.length === 0) return false;
  return err.issues.every(
    (i) => i.code === "too_big" && "origin" in i && i.origin === "string",
  );
}

function buildUserMessage(unknowns: SuggestionInput["unknowns"]): string {
  const lines: string[] = [
    `${unknowns.length} unknown${unknowns.length === 1 ? "" : "s"} to triage:`,
    "",
  ];
  for (const u of unknowns) {
    lines.push(`### id: ${u.id}`);
    lines.push(`raw_term: "${u.raw_term}"`);
    lines.push(`seen: ${u.occurrences}×`);
    if (u.source_context) {
      const sc = u.source_context;
      lines.push(
        `source: ${sc.report_name} (${sc.tier}) — ${sc.tagline}`,
      );
      const stackList = sc.sibling_stack.length > 0
        ? sc.sibling_stack.map((s) => `"${s}"`).join(", ")
        : "(empty)";
      lines.push(`sibling stack: [${stackList}]`);
    }
    lines.push("");
  }
  lines.push(
    "Return one suggestion per id via submit_suggestions.",
  );
  return lines.join("\n");
}

export async function suggestUnknowns(
  input: SuggestionInput,
): Promise<SuggestionResult> {
  if (input.unknowns.length === 0) {
    return { kind: "ok", suggestions: [] };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { kind: "error", message: "ANTHROPIC_API_KEY is not configured" };
  }
  const client = new Anthropic({ apiKey });

  const batchJsonSchema = sanitizeInputSchema(z.toJSONSchema(BatchSchema));

  const tools: Anthropic.Tool[] = [
    {
      name: "submit_suggestions",
      description:
        "Submit triage suggestions for the batch of unknown terms. Exactly one suggestion per provided id.",
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
        tool_choice: { type: "tool", name: "submit_suggestions" },
        tools,
        messages: [{ role: "user", content: buildUserMessage(input.unknowns) }],
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
    const stop = response.stop_reason ?? "unknown";
    return {
      kind: "error",
      message: `Claude did not invoke a tool. stop_reason=${stop}`,
    };
  }
  if (response.stop_reason === "max_tokens") {
    // Tool input is almost certainly truncated mid-JSON, so a parse will
    // fail confusingly. Surface this directly so the operator can shrink
    // the batch instead of guessing at the schema error.
    return {
      kind: "error",
      message:
        "Claude hit max_tokens mid-response; tool_use payload is truncated. Reduce the batch size or raise MAX_TOKENS.",
    };
  }

  // Tolerate either { suggestions: [...] } or a bare [...] payload — Claude
  // sometimes returns the array at the top level when the schema's only
  // required field is "suggestions". Both shapes are unambiguous.
  const rawInput = toolUse.input as unknown;
  const candidate =
    Array.isArray(rawInput)
      ? { suggestions: rawInput }
      : rawInput;
  const parsed = BatchSchema.safeParse(candidate);
  const inputIds = new Set(input.unknowns.map((u) => u.id));

  if (parsed.success) {
    const filtered = parsed.data.suggestions.filter((s) => inputIds.has(s.unknown_id));
    return { kind: "ok", suggestions: filtered as Suggestion[] };
  }

  if (isOnlyStringOverages(parsed.error)) {
    // Pass-through: the original candidate already has the right shape; only
    // the length caps were violated. We accept and let the UI handle display.
    const lenient = candidate as { suggestions: Suggestion[] };
    const filtered = (lenient.suggestions ?? []).filter((s) =>
      inputIds.has(s.unknown_id),
    );
    return { kind: "ok", suggestions: filtered };
  }

  const issues = parsed.error.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
  let preview: string;
  try {
    preview = JSON.stringify(rawInput).slice(0, 400);
  } catch {
    preview = String(rawInput).slice(0, 400);
  }
  return {
    kind: "error",
    message: `Validation failed: ${issues}. tool_use.input=${preview}`,
  };
}
