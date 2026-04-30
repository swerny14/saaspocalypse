import { getSupabaseAdmin } from "./supabase";
import { wrapDbError } from "./errors";
import type {
  CapabilityCategory,
  MoatTag,
} from "@/lib/normalization/taxonomy/types";

/**
 * DAL for the capabilities canonical table. Mirrors the stack-components
 * pattern: TS file is the seed-and-canonical-record-in-git, DB is the live
 * working copy edited via /admin/moat-anomalies, dump_taxonomy regenerates
 * the TS file from the DB so changes can be reviewed and committed.
 *
 * `match_patterns` and `moat_tags` are jsonb arrays in Postgres. We read
 * them as plain string[] in TS — Supabase's jsonb→JS coercion handles it.
 */

export type CapabilityRow = {
  slug: string;
  display_name: string;
  category: string;
  match_patterns: string[];
  moat_tags: string[];
  is_descriptor: boolean;
};

const SELECT_COLUMNS = "slug, display_name, category, match_patterns, moat_tags, is_descriptor";

export async function getAllCapabilities(): Promise<CapabilityRow[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("capabilities")
    .select(SELECT_COLUMNS)
    .order("category")
    .order("slug");
  if (error) throw wrapDbError(error, "capabilities list");
  return ((data ?? []) as CapabilityRow[]).map(normalizeRow);
}

export async function getCapability(slug: string): Promise<CapabilityRow | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("capabilities")
    .select(SELECT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw wrapDbError(error, "capabilities get");
  if (!data) return null;
  return normalizeRow(data as CapabilityRow);
}

/**
 * Append a match pattern to an existing capability. Idempotent — re-adding
 * the same pattern is a no-op. Patterns are always stored lowercased and
 * trimmed; the engine's matcher lowercases haystack + alias before testing,
 * so casing in the DB doesn't affect matches but consistency keeps the
 * data clean for the admin UI to display.
 */
export async function addPatternToCapability(
  slug: string,
  pattern: string,
): Promise<{ added: boolean }> {
  const norm = pattern.trim().toLowerCase();
  if (!norm) throw new Error("pattern cannot be empty");
  const cap = await getCapability(slug);
  if (!cap) throw new Error(`capability "${slug}" does not exist`);
  if (cap.match_patterns.includes(norm)) {
    return { added: false };
  }
  const next = [...cap.match_patterns, norm];
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("capabilities")
    .update({ match_patterns: next })
    .eq("slug", slug);
  if (error) throw wrapDbError(error, "capabilities addPattern update");
  return { added: true };
}

export async function insertCapability(input: {
  slug: string;
  display_name: string;
  category: CapabilityCategory;
  match_patterns: string[];
  moat_tags: MoatTag[];
  is_descriptor?: boolean;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  const row = {
    slug: input.slug,
    display_name: input.display_name,
    category: input.category,
    match_patterns: input.match_patterns
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean),
    moat_tags: input.moat_tags,
    is_descriptor: input.is_descriptor ?? false,
  };
  const { error } = await admin.from("capabilities").insert(row);
  if (error) throw wrapDbError(error, "capabilities insert");
}

function normalizeRow(row: CapabilityRow): CapabilityRow {
  return {
    slug: row.slug,
    display_name: row.display_name,
    category: row.category,
    match_patterns: Array.isArray(row.match_patterns) ? row.match_patterns : [],
    moat_tags: Array.isArray(row.moat_tags) ? row.moat_tags : [],
    is_descriptor: row.is_descriptor === true,
  };
}
