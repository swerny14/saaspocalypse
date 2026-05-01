/**
 * Regenerate the curated TS taxonomy files from the Supabase DB.
 *
 * Today we dump:
 *   - lib/normalization/taxonomy/stack_components.ts (edited via /admin/unknowns)
 *   - lib/normalization/taxonomy/capabilities.ts     (edited via score workbench)
 *
 * market_segments.ts and business_models.ts are still TS-only — no admin
 * write path exists yet, so the DB never holds changes the TS file doesn't.
 *
 * Workflow:
 *   1. Triage at /admin/unknowns or the score workbench — DB updated.
 *   2. `pnpm tsx scripts/dump_taxonomy.ts` — TS files regenerated from DB.
 *   3. Inspect the diff with `git diff lib/normalization/taxonomy/`.
 *   4. Commit.
 *
 * Run with: pnpm tsx scripts/dump_taxonomy.ts
 *
 * Notes:
 *   - File-level JSDoc and any non-array exports (FINGERPRINT_NAME_OVERRIDES)
 *     are re-emitted verbatim from the constants below. If you edit those
 *     by hand, also update the constants here.
 *   - Categories are emitted in a stable order. Within a category, entries
 *     are sorted alphabetically by slug.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { getSupabaseAdmin } from "../lib/db/supabase";

const STACK_TARGET = resolve(__dirname, "../lib/normalization/taxonomy/stack_components.ts");
const CAPS_TARGET = resolve(__dirname, "../lib/normalization/taxonomy/capabilities.ts");

const STACK_CATEGORY_ORDER = [
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
] as const;

const CAP_CATEGORY_ORDER = [
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

type StackRow = {
  slug: string;
  display_name: string;
  category: string;
  commoditization_level: number;
  aliases: string[] | null;
};

type CapRow = {
  slug: string;
  display_name: string;
  category: string;
  match_patterns: string[] | null;
  moat_tags: string[] | null;
  is_descriptor: boolean | null;
};

/* ──────────────────────────── stack components ───────────────────────────── */

const STACK_HEADER = `import type { StackComponent } from "./types";

/**
 * Canonical stack components. THIS FILE IS REGENERATED FROM SUPABASE.
 *
 * Source of truth flow:
 *   1. The TS file is the seed (initial set + manual edits by hand).
 *   2. /admin/unknowns writes new aliases + new components to the DB.
 *   3. \`pnpm tsx scripts/dump_taxonomy.ts\` rewrites this file from DB rows.
 *   4. \`pnpm tsx scripts/sync_taxonomy.ts\` pushes TS back to DB (idempotent).
 *
 * To add a component by hand: edit this file directly, run sync_taxonomy.
 * To add via the admin UI: triage at /admin/unknowns, then dump_taxonomy.
 *
 * \`commoditization_level\` rationale:
 *   - 5 = ubiquitous, trivial-to-swap (Vercel, GA, Cloudflare)
 *   - 4 = ubiquitous but more involved (Postgres, S3, Stripe)
 *   - 3 = commodity but with category-specific lock-in (Auth0, Algolia)
 *   - 2 = managed, niche
 *   - 1 = OSS self-hosted
 *   - 0 = bespoke / built-from-scratch
 */
export const STACK_COMPONENTS: StackComponent[] = [
`;

const STACK_FOOTER = `];

/**
 * Map fingerprinter display names → canonical slugs. The fingerprinter writes
 * \`Vercel\`/\`Stripe\`/etc. into \`detected_stack\`; the engine reads those and
 * attaches the canonical slug. Any name added to STACK_COMPONENTS above with
 * a matching \`display_name\` is automatically wired up; this map only needs
 * entries when the fingerprinter and the canonical taxonomy disagree.
 */
export const FINGERPRINT_NAME_OVERRIDES: Record<string, string> = {
  // (none today — keep here for when fingerprinter labels diverge)
};
`;

function emitStackRow(c: StackRow): string {
  const aliases = (c.aliases ?? []).map(jsString).join(", ");
  return `  { slug: ${jsString(c.slug)}, display_name: ${jsString(c.display_name)}, category: ${jsString(c.category)}, commoditization_level: ${c.commoditization_level}, aliases: [${aliases}] },`;
}

/* ──────────────────────────── capabilities ──────────────────────────────── */

const CAPS_HEADER = `import type { Capability } from "./types";

/**
 * Canonical capabilities. THIS FILE IS REGENERATED FROM SUPABASE.
 *
 * Source of truth flow:
 *   1. The TS file is the seed (initial set + manual edits by hand).
 *   2. Score workbench writes new patterns + new capabilities to the DB.
 *   3. \`pnpm tsx scripts/dump_taxonomy.ts\` rewrites this file from DB rows.
 *   4. \`pnpm tsx scripts/sync_taxonomy.ts\` pushes TS back to DB (idempotent).
 *
 * \`moat_tags\` are the load-bearing field for moat scoring. They map a
 * capability onto the moat axes:
 *   network:    multi_sided | ugc | marketplace | viral_loop
 *   switching:  data_storage | workflow_lock_in | integration_hub
 *   data:       proprietary_dataset | training_data | behavioral
 *   regulatory: hipaa | finra | gdpr_critical | licensed
 *
 * Most capabilities carry zero tags — they exist for product-comparison
 * features (capability overlap, "products like X") rather than moat math.
 * Tag a capability only when its presence genuinely tilts a moat axis.
 */
export const CAPABILITIES: Capability[] = [
`;

const CAPS_FOOTER = `];
`;

function emitCapRow(c: CapRow): string {
  const patterns = (c.match_patterns ?? []).map(jsString).join(", ");
  const tags = (c.moat_tags ?? []).map(jsString).join(", ");
  const descriptor = c.is_descriptor === true ? `, is_descriptor: true` : "";
  return `  { slug: ${jsString(c.slug)}, display_name: ${jsString(c.display_name)}, category: ${jsString(c.category)}, match_patterns: [${patterns}], moat_tags: [${tags}]${descriptor} },`;
}

/* ───────────────────────────── shared helpers ───────────────────────────── */

function jsString(s: string): string {
  // Escape backslashes and double-quotes only — control chars in slugs/names
  // would be a data error worth surfacing, not silently encoded.
  return `"${s.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function dumpGrouped<T extends { category: string; slug: string }>(
  rows: T[],
  order: readonly string[],
  emit: (row: T) => string,
): string[] {
  const byCategory: Record<string, T[]> = {};
  for (const r of rows) {
    (byCategory[r.category] ??= []).push(r);
  }
  const lines: string[] = [];
  for (const cat of order) {
    const items = byCategory[cat];
    if (!items || items.length === 0) continue;
    lines.push(`  // ── ${cat} ──`);
    for (const r of items.sort((a, b) => a.slug.localeCompare(b.slug))) {
      lines.push(emit(r));
    }
  }
  for (const cat of Object.keys(byCategory).sort()) {
    if ((order as readonly string[]).includes(cat)) continue;
    lines.push(`  // ── ${cat} (unrecognized — review) ──`);
    for (const r of byCategory[cat].sort((a, b) => a.slug.localeCompare(b.slug))) {
      lines.push(emit(r));
    }
  }
  return lines;
}

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set it in .env.local before running.",
    );
    process.exit(1);
  }

  const admin = getSupabaseAdmin();

  // Stack components
  {
    const { data, error } = await admin
      .from("stack_components")
      .select("slug, display_name, category, commoditization_level, aliases")
      .order("category")
      .order("slug");
    if (error) {
      console.error("[dump_taxonomy] stack_components DB error:", error);
      process.exit(1);
    }
    const rows = (data ?? []) as StackRow[];
    const lines = [STACK_HEADER, ...dumpGrouped(rows, STACK_CATEGORY_ORDER, emitStackRow), STACK_FOOTER];
    writeFileSync(STACK_TARGET, lines.join("\n"), "utf8");
    console.log(`[dump_taxonomy] wrote ${rows.length} components → ${STACK_TARGET}`);
  }

  // Capabilities
  {
    const { data, error } = await admin
      .from("capabilities")
      .select("slug, display_name, category, match_patterns, moat_tags, is_descriptor")
      .order("category")
      .order("slug");
    if (error) {
      console.error("[dump_taxonomy] capabilities DB error:", error);
      process.exit(1);
    }
    const rows = (data ?? []) as CapRow[];
    const lines = [CAPS_HEADER, ...dumpGrouped(rows, CAP_CATEGORY_ORDER, emitCapRow), CAPS_FOOTER];
    writeFileSync(CAPS_TARGET, lines.join("\n"), "utf8");
    console.log(`[dump_taxonomy] wrote ${rows.length} capabilities → ${CAPS_TARGET}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
