import { getSupabaseAdmin } from "./supabase";
import { wrapDbError } from "./errors";
import {
  STACK_COMPONENTS,
  CAPABILITIES,
  MARKET_SEGMENTS,
  BUSINESS_MODELS,
} from "@/lib/normalization/taxonomy";

/**
 * Mirror the TS taxonomy modules into Supabase. Idempotent — re-running this
 * is the supported way to deploy taxonomy changes. Used by
 * scripts/sync_taxonomy.ts; not called at runtime.
 *
 * What it does NOT do: delete DB rows whose slug is no longer in the TS
 * source. Removing a canonical entity is a real schema change (existing
 * report_components rows reference it by FK) — do that by hand after
 * checking what would break, or add a `prune` flag here later.
 */
export async function syncTaxonomyToDb(): Promise<{
  components: number;
  capabilities: number;
  segments: number;
  models: number;
}> {
  const admin = getSupabaseAdmin();

  const compRows = STACK_COMPONENTS.map((c) => ({
    slug: c.slug,
    display_name: c.display_name,
    category: c.category,
    commoditization_level: c.commoditization_level,
    aliases: c.aliases,
  }));
  {
    const { error } = await admin
      .from("stack_components")
      .upsert(compRows, { onConflict: "slug" });
    if (error) throw wrapDbError(error, "stack_components upsert");
  }

  const capRows = CAPABILITIES.map((c) => ({
    slug: c.slug,
    display_name: c.display_name,
    category: c.category,
    match_patterns: c.match_patterns,
    is_descriptor: c.is_descriptor ?? false,
  }));
  {
    const { error } = await admin
      .from("capabilities")
      .upsert(capRows, { onConflict: "slug" });
    if (error) throw wrapDbError(error, "capabilities upsert");
  }

  const segRows = MARKET_SEGMENTS.map((s) => ({
    slug: s.slug,
    display_name: s.display_name,
    match_patterns: s.match_patterns,
  }));
  {
    const { error } = await admin
      .from("market_segments")
      .upsert(segRows, { onConflict: "slug" });
    if (error) throw wrapDbError(error, "market_segments upsert");
  }

  const modelRows = BUSINESS_MODELS.map((m) => ({
    slug: m.slug,
    display_name: m.display_name,
    match_patterns: m.match_patterns,
  }));
  {
    const { error } = await admin
      .from("business_models")
      .upsert(modelRows, { onConflict: "slug" });
    if (error) throw wrapDbError(error, "business_models upsert");
  }

  return {
    components: compRows.length,
    capabilities: capRows.length,
    segments: segRows.length,
    models: modelRows.length,
  };
}
