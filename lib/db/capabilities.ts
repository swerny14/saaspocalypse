import { getSupabaseAdmin } from "./supabase";
import { wrapDbError } from "./errors";
import type { CapabilityCategory } from "@/lib/normalization/taxonomy/types";

export type CapabilityRow = {
  slug: string;
  display_name: string;
  category: string;
  match_patterns: string[];
  is_descriptor: boolean;
};

const SELECT_COLUMNS = "slug, display_name, category, match_patterns, is_descriptor";

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

export async function addPatternToCapability(
  slug: string,
  pattern: string,
): Promise<{ added: boolean }> {
  const norm = pattern.trim().toLowerCase();
  if (!norm) throw new Error("pattern cannot be empty");
  const cap = await getCapability(slug);
  if (!cap) throw new Error(`capability "${slug}" does not exist`);
  if (cap.match_patterns.includes(norm)) return { added: false };

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("capabilities")
    .update({ match_patterns: [...cap.match_patterns, norm] })
    .eq("slug", slug);
  if (error) throw wrapDbError(error, "capabilities addPattern update");
  return { added: true };
}

export async function removePatternFromCapability(
  slug: string,
  pattern: string,
): Promise<{ removed: boolean }> {
  const norm = pattern.trim().toLowerCase();
  if (!norm) throw new Error("pattern cannot be empty");
  const cap = await getCapability(slug);
  if (!cap) throw new Error(`capability "${slug}" does not exist`);
  if (!cap.match_patterns.includes(norm)) return { removed: false };

  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("capabilities")
    .update({ match_patterns: cap.match_patterns.filter((p) => p !== norm) })
    .eq("slug", slug);
  if (error) throw wrapDbError(error, "capabilities removePattern update");
  return { removed: true };
}

export async function deleteCapability(slug: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("capabilities").delete().eq("slug", slug);
  if (error) throw wrapDbError(error, "capabilities delete");
}

export async function insertCapability(input: {
  slug: string;
  display_name: string;
  category: CapabilityCategory;
  match_patterns: string[];
  is_descriptor?: boolean;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("capabilities").insert({
    slug: input.slug,
    display_name: input.display_name,
    category: input.category,
    match_patterns: input.match_patterns
      .map((p) => p.trim().toLowerCase())
      .filter(Boolean),
    is_descriptor: input.is_descriptor ?? false,
  });
  if (error) throw wrapDbError(error, "capabilities insert");
}

function normalizeRow(row: CapabilityRow): CapabilityRow {
  return {
    slug: row.slug,
    display_name: row.display_name,
    category: row.category,
    match_patterns: Array.isArray(row.match_patterns) ? row.match_patterns : [],
    is_descriptor: row.is_descriptor === true,
  };
}
