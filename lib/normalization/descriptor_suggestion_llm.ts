import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { CapabilityRow } from "@/lib/db/capabilities";

/**
 * Admin-only descriptor suggestion. For a pair of reports the heuristic
 * thinks should be similar but the engine doesn't, ask Claude to either:
 *  - propose a pattern to add to an EXISTING descriptor capability so it
 *    catches both reports' phrasing, OR
 *  - propose a NEW descriptor capability when the shared product category
 *    isn't represented in the catalog at all, OR
 *  - return no_action when the apparent text overlap is coincidental.
 *
 * Admin-only and human-applied. New capabilities default to
 * is_descriptor: true because this surface exists to fill descriptor gaps.
 */

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2500;

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

export type DescriptorSuggestion =
  | {
      kind: "add_pattern";
      capability_slug: string;
      pattern: string;
      reasoning: string;
    }
  | {
      kind: "new_capability";
      slug: string;
      display_name: string;
      category: (typeof CATEGORIES)[number];
      match_patterns: string[];
      reasoning: string;
    }
  | {
      kind: "no_action";
      reasoning: string;
    };

const AddPatternSchema = z.object({
  kind: z.literal("add_pattern"),
  capability_slug: z.string().min(1).max(80),
  pattern: z.string().min(1).max(120),
  reasoning: z.string().min(1).max(400),
});

const NewCapabilitySchema = z.object({
  kind: z.literal("new_capability"),
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/),
  display_name: z.string().min(1).max(80),
  category: z.enum(CATEGORIES),
  match_patterns: z.array(z.string().min(1).max(120)).min(2).max(15),
  reasoning: z.string().min(1).max(400),
});

const NoActionSchema = z.object({
  kind: z.literal("no_action"),
  reasoning: z.string().min(1).max(400),
});

const SuggestionSchema = z.discriminatedUnion("kind", [
  AddPatternSchema,
  NewCapabilitySchema,
  NoActionSchema,
]);

/** Outer wrapper. Anthropic's tool input_schema requires a top-level
 *  `type: "object"`, which `z.toJSONSchema()` doesn't emit for a bare
 *  discriminated union (it serializes as `{ anyOf: [...] }`). Wrapping in
 *  a one-property object gives us the required object shape; we unwrap
 *  `.suggestion` after parsing. */
const SubmissionSchema = z.object({
  suggestion: SuggestionSchema,
});

export type DescriptorSuggestionResult =
  | { kind: "ok"; suggestion: DescriptorSuggestion }
  | { kind: "error"; message: string };

export type DescriptorSuggestionInput = {
  pair: {
    a: { name: string; slug: string; tagline: string; take: string; take_sub: string };
    b: { name: string; slug: string; tagline: string; take: string; take_sub: string };
  };
  /** Capabilities that DID fire on each report. Helps Claude see what's
   *  already shared (often generic infra) vs what's missing (the descriptor). */
  matched_a_slugs: string[];
  matched_b_slugs: string[];
  /** Full capability catalog so Claude can pick a sensible alias target
   *  (existing descriptor) or know when none fits. */
  capabilities: CapabilityRow[];
  signal?: AbortSignal;
};

function sanitizeInputSchema(schema: unknown): Record<string, unknown> {
  const obj = { ...(schema as Record<string, unknown>) };
  delete obj.$schema;
  delete obj.$id;
  return obj;
}

const SYSTEM_PROMPT = `You are a taxonomy curator for a deterministic similarity engine. The engine ranks "products like X" by a weighted Jaccard over capability sets, with a 2× boost for capabilities flagged as DESCRIPTORS (capabilities that name a product CATEGORY — "form-builder", "appointment-booking", "ai-agent-platform"). Most non-descriptor capabilities are sub-features many products share (rich-text-editor, social-login, integrations).

The admin will hand you a PAIR of reports the heuristic thinks should be similar (high text overlap on tagline + take) but the engine doesn't surface (low capability overlap). Your job is to figure out why they're not converging and propose ONE of three actions.

## What you're looking for

The two reports usually share a product CATEGORY that isn't represented as a descriptor capability in the catalog yet. Your job is to name that category.

A good descriptor:
- Names a category, not a feature. "form-builder" yes; "rich-text-editor" no.
- Patterns are 2–6 words, lowercase, drawn from the actual verdict text. They should match BOTH reports.
- Doesn't overlap with existing descriptors. Scan the catalog before proposing new.

## Three actions

1. **add_pattern** (PREFERRED) — when an EXISTING descriptor capability is the right home but its current patterns don't fire on one or both of these reports. Pick the existing slug, propose ONE pattern, explain which report it fixes.

2. **new_capability** — when no existing descriptor names this product category. Propose a slug, display_name, category, and 3–8 match_patterns drawn from BOTH reports' verdict text. Default \`is_descriptor: true\` is implicit (this surface only creates descriptors).

3. **no_action** — when the text overlap is coincidental and the products genuinely belong to different categories. Examples: both products mention "AI" but one is a chatbot and the other is image generation. Different categories, no descriptor would honestly apply to both.

## Discipline

- Strongly prefer add_pattern. Adding a pattern is elastic — only changes the projection of reports whose text matches. Adding a new capability permanently inflates similarity scores corpus-wide on re-projection.
- Don't propose patterns that would over-fire. "scheduling" alone might match too many things; "appointment scheduling" or "scheduling and booking" is better.
- A "no_action" is a valid and useful outcome. Don't invent categories.
- Never propose a pattern that already exists on the target capability. Read the current patterns before suggesting.
- Output exactly ONE suggestion per call.

## Output

Call submit_suggestion exactly once. Pass your chosen action under the \`suggestion\` field with the appropriate \`kind\` discriminator and fields.`;

function formatCatalog(capabilities: CapabilityRow[]): string {
  // Show descriptors first (most relevant), then everything else compact.
  const descriptors = capabilities.filter((c) => c.is_descriptor);
  const others = capabilities.filter((c) => !c.is_descriptor);
  const lines: string[] = [];
  lines.push("### Existing descriptors (preferred add_pattern targets)");
  for (const c of descriptors.sort((a, b) => a.slug.localeCompare(b.slug))) {
    const patterns = c.match_patterns.slice(0, 6).join(", ");
    const more = c.match_patterns.length > 6 ? ` … +${c.match_patterns.length - 6}` : "";
    lines.push(`  · ${c.slug} — "${c.display_name}" — patterns: ${patterns}${more}`);
  }
  lines.push("");
  lines.push("### Non-descriptor capabilities (do NOT propose adding patterns here)");
  for (const c of others.sort((a, b) => a.slug.localeCompare(b.slug))) {
    lines.push(`  · ${c.slug} — "${c.display_name}"`);
  }
  return lines.join("\n");
}

function reportBlock(label: string, r: DescriptorSuggestionInput["pair"]["a"], matched: string[]): string {
  return `### Report ${label}: ${r.slug}
name: ${r.name}
tagline: ${r.tagline}

take: ${r.take.replace(/\s+/g, " ").trim()}

take_sub: ${r.take_sub.replace(/\s+/g, " ").trim()}

capabilities currently firing: ${matched.length > 0 ? matched.join(", ") : "(none)"}`;
}

function buildUserMessage(input: DescriptorSuggestionInput): string {
  return `## Pair under review

${reportBlock("A", input.pair.a, input.matched_a_slugs)}

${reportBlock("B", input.pair.b, input.matched_b_slugs)}

## Capability catalog

${formatCatalog(input.capabilities)}

These two reports share enough text overlap that the heuristic flagged them, but the engine isn't clustering them. Decide whether they belong to the same product category, and if so, propose the minimal taxonomy change to make them converge. Call submit_suggestion.`;
}

function isOnlyStringOverages(err: z.ZodError): boolean {
  if (err.issues.length === 0) return false;
  return err.issues.every(
    (i) => i.code === "too_big" && "origin" in i && i.origin === "string",
  );
}

export async function suggestDescriptor(
  input: DescriptorSuggestionInput,
): Promise<DescriptorSuggestionResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { kind: "error", message: "ANTHROPIC_API_KEY is not configured" };
  }
  const client = new Anthropic({ apiKey });

  const toolSchema = z.toJSONSchema(SubmissionSchema);

  try {
    const resp = await client.messages.create(
      {
        model: MODEL,
        max_tokens: MAX_TOKENS,
        temperature: 0.2,
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
        ],
        tools: [
          {
            name: "submit_suggestion",
            description: "Submit one suggestion (add_pattern | new_capability | no_action) for the pair under review.",
            input_schema: sanitizeInputSchema(toolSchema) as Anthropic.Tool.InputSchema,
          },
        ],
        tool_choice: { type: "tool", name: "submit_suggestion" },
        messages: [{ role: "user", content: buildUserMessage(input) }],
      },
      { signal: input.signal },
    );

    const toolUse = resp.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use",
    );
    if (!toolUse) {
      return { kind: "error", message: "model did not call submit_suggestion" };
    }
    const parsed = SubmissionSchema.safeParse(toolUse.input);
    if (!parsed.success) {
      if (isOnlyStringOverages(parsed.error)) {
        const raw = toolUse.input as { suggestion?: DescriptorSuggestion };
        if (raw.suggestion) {
          return { kind: "ok", suggestion: raw.suggestion };
        }
      }
      return {
        kind: "error",
        message: `validation failed: ${parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ")}`,
      };
    }
    return { kind: "ok", suggestion: parsed.data.suggestion };
  } catch (err) {
    return {
      kind: "error",
      message: err instanceof Error ? err.message : String(err),
    };
  }
}
