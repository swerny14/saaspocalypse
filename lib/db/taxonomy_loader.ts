import { getSupabaseAdmin } from "./supabase";
import { wrapDbError } from "./errors";
import {
  buildEngineContext,
  type EngineContext,
} from "@/lib/normalization/engine";
import type {
  StackComponent,
  Capability,
  MarketSegment,
  BusinessModel,
  ComponentCategory,
  CapabilityCategory,
  CommoditizationLevel,
} from "@/lib/normalization/taxonomy/types";
import { FINGERPRINT_NAME_OVERRIDES } from "@/lib/normalization/taxonomy/stack_components";

/**
 * Read the four taxonomy tables from Supabase and assemble an EngineContext
 * that scoring functions can use instead of the TS-bundled defaults. The
 * point: admin-side taxonomy edits (new patterns, new capabilities) take
 * effect on the next recompute and fresh scan without a redeploy.
 *
 * `FINGERPRINT_NAME_OVERRIDES` is intentionally TS-only (it's a tiny static
 * map, not a row store) and is bundled into every loaded context.
 */

type StackRow = {
  slug: string;
  display_name: string;
  category: string;
  commoditization_level: number;
  aliases: unknown;
};

type CapabilityRow = {
  slug: string;
  display_name: string;
  category: string;
  match_patterns: unknown;
  is_descriptor: unknown;
};

type SegmentOrModelRow = {
  slug: string;
  display_name: string;
  match_patterns: unknown;
};

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export async function loadTaxonomyFromDb(): Promise<{
  stack_components: StackComponent[];
  capabilities: Capability[];
  market_segments: MarketSegment[];
  business_models: BusinessModel[];
}> {
  const admin = getSupabaseAdmin();
  const [stack, caps, segs, models] = await Promise.all([
    admin
      .from("stack_components")
      .select("slug, display_name, category, commoditization_level, aliases"),
    admin
      .from("capabilities")
      .select("slug, display_name, category, match_patterns, is_descriptor"),
    admin
      .from("market_segments")
      .select("slug, display_name, match_patterns"),
    admin
      .from("business_models")
      .select("slug, display_name, match_patterns"),
  ]);

  if (stack.error) throw wrapDbError(stack.error, "taxonomy_loader stack_components");
  if (caps.error) throw wrapDbError(caps.error, "taxonomy_loader capabilities");
  if (segs.error) throw wrapDbError(segs.error, "taxonomy_loader market_segments");
  if (models.error) throw wrapDbError(models.error, "taxonomy_loader business_models");

  const stack_components: StackComponent[] = (stack.data ?? []).map((r) => {
    const row = r as StackRow;
    return {
      slug: row.slug,
      display_name: row.display_name,
      category: row.category as ComponentCategory,
      commoditization_level: row.commoditization_level as CommoditizationLevel,
      aliases: asStringArray(row.aliases),
    };
  });

  const capabilities: Capability[] = (caps.data ?? []).map((r) => {
    const row = r as CapabilityRow;
    return {
      slug: row.slug,
      display_name: row.display_name,
      category: row.category as CapabilityCategory,
      match_patterns: asStringArray(row.match_patterns),
      is_descriptor: row.is_descriptor === true ? true : undefined,
    };
  });

  const market_segments: MarketSegment[] = (segs.data ?? []).map((r) => {
    const row = r as SegmentOrModelRow;
    return {
      slug: row.slug,
      display_name: row.display_name,
      match_patterns: asStringArray(row.match_patterns),
    };
  });

  const business_models: BusinessModel[] = (models.data ?? []).map((r) => {
    const row = r as SegmentOrModelRow;
    return {
      slug: row.slug,
      display_name: row.display_name,
      match_patterns: asStringArray(row.match_patterns),
    };
  });

  return { stack_components, capabilities, market_segments, business_models };
}

/**
 * Convenience: load taxonomy from DB and assemble an EngineContext + the
 * capabilities array (which scoreMoat needs separately). One round-trip,
 * one returned object the recompute path can reuse across many reports.
 */
export async function loadEngineContextFromDb(): Promise<{
  context: EngineContext;
  capabilities: Capability[];
}> {
  const tax = await loadTaxonomyFromDb();
  const context = buildEngineContext({
    ...tax,
    fingerprint_overrides: FINGERPRINT_NAME_OVERRIDES,
  });
  return { context, capabilities: tax.capabilities };
}
