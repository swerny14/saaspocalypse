import { getSupabaseAdmin } from "./supabase";
import { wrapDbError } from "./errors";
import type { ComponentCategory, CommoditizationLevel } from "@/lib/normalization/taxonomy/types";

/**
 * DAL for the normalization unknowns review queue. Admin-only — every query
 * here uses the service-role client and is meant to be called from server
 * routes gated by `isAdmin()`.
 */

export type UnknownStatus = "open" | "aliased" | "added" | "ignored";

export type UnknownRow = {
  id: string;
  report_id: string | null;
  raw_term: string;
  normalized_term: string;
  suggested_category: string | null;
  occurrences: number;
  status: UnknownStatus;
  resolution_slug: string | null;
  first_seen_at: string;
  last_seen_at: string;
  /** LLM-generated curation suggestion — admin batch only, optional. */
  llm_action: "alias" | "promote" | "ignore" | null;
  llm_target_slug: string | null;
  llm_category: string | null;
  llm_commoditization: number | null;
  llm_note: string | null;
  llm_suggested_at: string | null;
};

/** Open unknowns, popularity-sorted. The default view of the admin queue. */
export async function getOpenUnknowns(limit = 500): Promise<UnknownRow[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("normalization_unknowns")
    .select("*")
    .eq("status", "open")
    .order("occurrences", { ascending: false })
    .order("last_seen_at", { ascending: false })
    .limit(limit);
  if (error) throw wrapDbError(error, "normalization_unknowns getOpen");
  return (data as UnknownRow[]) ?? [];
}

/**
 * Fetch the source-report context (name, tagline, tier, sibling stack) for
 * a batch of unknowns. Used to build the LLM suggestion prompt — Claude
 * categorizes unfamiliar terms much more accurately when it sees what kind
 * of product surfaced them. Returns a map keyed by unknown.id; entries
 * missing report_id or whose report was deleted are simply absent.
 */
export type UnknownSourceContext = {
  report_name: string;
  tagline: string;
  tier: string;
  sibling_stack: string[];
};

export async function getUnknownSourceContexts(
  unknowns: Array<{ id: string; report_id: string | null }>,
): Promise<Record<string, UnknownSourceContext>> {
  const admin = getSupabaseAdmin();
  const reportIds = Array.from(
    new Set(unknowns.map((u) => u.report_id).filter((id): id is string => Boolean(id))),
  );
  if (reportIds.length === 0) return {};

  const { data, error } = await admin
    .from("reports")
    .select("id, name, tagline, tier, stack")
    .in("id", reportIds);
  if (error) throw wrapDbError(error, "reports source-context lookup");

  const byReportId: Record<string, UnknownSourceContext> = {};
  for (const r of (data ?? []) as Array<{
    id: string;
    name: string;
    tagline: string;
    tier: string;
    stack: string[] | null;
  }>) {
    byReportId[r.id] = {
      report_name: r.name,
      tagline: r.tagline,
      tier: r.tier,
      sibling_stack: Array.isArray(r.stack) ? r.stack : [],
    };
  }

  const out: Record<string, UnknownSourceContext> = {};
  for (const u of unknowns) {
    if (u.report_id && byReportId[u.report_id]) {
      out[u.id] = byReportId[u.report_id];
    }
  }
  return out;
}

/**
 * Persist a batch of LLM curation suggestions onto the unknowns rows. Idempotent:
 * re-running overwrites prior suggestions. Failures bubble — the caller logs.
 */
export type SuggestionPatch = {
  id: string;
  llm_action: "alias" | "promote" | "ignore";
  llm_target_slug?: string | null;
  llm_category?: string | null;
  llm_commoditization?: number | null;
  llm_note: string;
};

export async function persistSuggestions(patches: SuggestionPatch[]): Promise<void> {
  if (patches.length === 0) return;
  const admin = getSupabaseAdmin();
  const now = new Date().toISOString();
  // No bulk update via PostgREST; serial rows are fine for the queue size we
  // expect (~tens). If this ever grows past a few hundred, switch to a
  // single SQL function.
  for (const p of patches) {
    const { error } = await admin
      .from("normalization_unknowns")
      .update({
        llm_action: p.llm_action,
        llm_target_slug: p.llm_target_slug ?? null,
        llm_category: p.llm_category ?? null,
        llm_commoditization: p.llm_commoditization ?? null,
        llm_note: p.llm_note,
        llm_suggested_at: now,
      })
      .eq("id", p.id);
    if (error) throw wrapDbError(error, "normalization_unknowns persistSuggestions");
  }
}

/** Resolve an unknown by appending its normalized term as an alias on a
 *  canonical component. Both writes happen — alias add + status update —
 *  even on retry, the alias `array_append`-with-dedupe stays idempotent.
 */
export async function aliasUnknown(
  unknownId: string,
  targetSlug: string,
): Promise<void> {
  const admin = getSupabaseAdmin();

  // Look up the unknown so we know what alias to add.
  const { data: u, error: uErr } = await admin
    .from("normalization_unknowns")
    .select("id, normalized_term, status")
    .eq("id", unknownId)
    .single();
  if (uErr) throw wrapDbError(uErr, "normalization_unknowns lookup");

  // Look up the target component to merge aliases (PostgREST has no
  // jsonb append helper; do the merge in memory then write back).
  const { data: c, error: cErr } = await admin
    .from("stack_components")
    .select("slug, aliases")
    .eq("slug", targetSlug)
    .single();
  if (cErr) throw wrapDbError(cErr, "stack_components lookup");

  const existing = Array.isArray(c.aliases) ? (c.aliases as string[]) : [];
  const alias = u.normalized_term;
  const merged = existing.includes(alias) ? existing : [...existing, alias];

  const { error: updateErr } = await admin
    .from("stack_components")
    .update({ aliases: merged })
    .eq("slug", targetSlug);
  if (updateErr) throw wrapDbError(updateErr, "stack_components alias update");

  const { error: statusErr } = await admin
    .from("normalization_unknowns")
    .update({
      status: "aliased",
      resolution_slug: targetSlug,
    })
    .eq("id", unknownId);
  if (statusErr) throw wrapDbError(statusErr, "normalization_unknowns mark aliased");
}

/**
 * Promote an unknown to a brand-new canonical stack component. The unknown's
 * normalized term is added as an alias on the new component automatically,
 * plus any extra aliases supplied by the curator.
 */
export async function promoteUnknown(
  unknownId: string,
  newComponent: {
    slug: string;
    display_name: string;
    category: ComponentCategory;
    commoditization_level: CommoditizationLevel;
    extra_aliases: string[];
  },
): Promise<void> {
  const admin = getSupabaseAdmin();

  const { data: u, error: uErr } = await admin
    .from("normalization_unknowns")
    .select("id, normalized_term")
    .eq("id", unknownId)
    .single();
  if (uErr) throw wrapDbError(uErr, "normalization_unknowns lookup");

  // Build the alias set: normalized term + display_name lower + extras, deduped.
  const seedAliases = new Set<string>([
    u.normalized_term.toLowerCase(),
    newComponent.display_name.toLowerCase(),
    ...newComponent.extra_aliases.map((a) => a.toLowerCase().trim()).filter(Boolean),
  ]);

  const { error: insErr } = await admin.from("stack_components").insert({
    slug: newComponent.slug,
    display_name: newComponent.display_name,
    category: newComponent.category,
    commoditization_level: newComponent.commoditization_level,
    aliases: Array.from(seedAliases),
  });
  if (insErr) throw wrapDbError(insErr, "stack_components insert");

  const { error: statusErr } = await admin
    .from("normalization_unknowns")
    .update({
      status: "added",
      resolution_slug: newComponent.slug,
    })
    .eq("id", unknownId);
  if (statusErr) throw wrapDbError(statusErr, "normalization_unknowns mark added");
}

/** Soft-resolve an unknown as "not a real component" — jokes, descriptors, etc. */
export async function ignoreUnknown(unknownId: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("normalization_unknowns")
    .update({ status: "ignored" })
    .eq("id", unknownId);
  if (error) throw wrapDbError(error, "normalization_unknowns mark ignored");
}

/**
 * Drop every `open` row from the unknowns queue. Used by the recompute
 * script's `--reset-unknowns` flag to clear out stale aggregate rows
 * (e.g. legacy entries written before the harvester atomized multi-tool
 * stack items). Resolved rows — `aliased`, `added`, `ignored` — are
 * preserved so prior curation work isn't lost.
 */
export async function deleteOpenUnknowns(): Promise<number> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("normalization_unknowns")
    .delete()
    .eq("status", "open")
    .select("id");
  if (error) throw wrapDbError(error, "normalization_unknowns deleteOpen");
  return data?.length ?? 0;
}

/** Lookup helper — used by the resolve API to validate target slugs. */
export async function listAllStackComponentSlugs(): Promise<
  Array<{ slug: string; display_name: string; category: string }>
> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("stack_components")
    .select("slug, display_name, category")
    .order("category")
    .order("display_name");
  if (error) throw wrapDbError(error, "stack_components list");
  return (data ?? []) as Array<{ slug: string; display_name: string; category: string }>;
}
