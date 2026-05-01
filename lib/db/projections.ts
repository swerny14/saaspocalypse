import { getSupabaseAdmin, getSupabaseAnon } from "./supabase";
import { wrapDbError } from "./errors";
import type { ReportProjection } from "@/lib/normalization/engine";
import type { SimilarityCandidate } from "@/lib/normalization/similarity";
import type { DistributionSignals } from "@/lib/scanner/distribution";

/**
 * Persist a normalization projection. Admin-only — the projection writer is
 * server-side and uses the service-role client so it bypasses RLS. Idempotent
 * by design: deletes the existing junction rows for `report_id` and replaces
 * them, so calling this from `runScan` (first-time insert) and from the
 * `recompute_projections` script (rebuild) both work.
 *
 * The four writes happen sequentially because Supabase doesn't expose a
 * cross-table transaction over PostgREST. If any step fails the prior writes
 * are committed — caller-side recompute script will overwrite next run.
 * For the in-flight scan path, projection failure is non-fatal (logged via
 * caller), the report itself still shipped successfully.
 */
export async function persistProjection(
  reportId: string,
  projection: ReportProjection,
): Promise<void> {
  const admin = getSupabaseAdmin();

  // Replace components.
  {
    const { error: delErr } = await admin
      .from("report_components")
      .delete()
      .eq("report_id", reportId);
    if (delErr) throw wrapDbError(delErr, "report_components delete");
    if (projection.components.length > 0) {
      const rows = projection.components.map((c) => ({
        report_id: reportId,
        component_slug: c.component_slug,
        source: c.source,
      }));
      const { error } = await admin.from("report_components").insert(rows);
      if (error) throw wrapDbError(error, "report_components insert");
    }
  }

  // Replace capabilities.
  {
    const { error: delErr } = await admin
      .from("report_capabilities")
      .delete()
      .eq("report_id", reportId);
    if (delErr) throw wrapDbError(delErr, "report_capabilities delete");
    if (projection.capabilities.length > 0) {
      const rows = projection.capabilities.map((c) => ({
        report_id: reportId,
        capability_slug: c.capability_slug,
        confidence: c.confidence,
        evidence_field: c.evidence_field,
      }));
      const { error } = await admin.from("report_capabilities").insert(rows);
      if (error) throw wrapDbError(error, "report_capabilities insert");
    }
  }

  // Upsert attributes (one row per report).
  {
    const { error } = await admin
      .from("report_attributes")
      .upsert(
        {
          report_id: reportId,
          ...projection.attributes,
          projected_at: new Date().toISOString(),
        },
        { onConflict: "report_id" },
      );
    if (error) throw wrapDbError(error, "report_attributes upsert");
  }

  // Upsert unknowns. Increment occurrences when the term reappears across
  // reports — gives the review queue a popularity sort. We can't use upsert
  // for "increment", so do a select-then-insert/update per term. Tiny lists
  // (≤ ~5 unknowns/report typical), no batching needed.
  for (const u of projection.unknowns) {
    const { data: existing, error: selErr } = await admin
      .from("normalization_unknowns")
      .select("id, occurrences, status")
      .eq("normalized_term", u.normalized_term)
      .maybeSingle();
    if (selErr) throw wrapDbError(selErr, "normalization_unknowns select");
    if (!existing) {
      const { error } = await admin.from("normalization_unknowns").insert({
        report_id: reportId,
        raw_term: u.raw_term,
        normalized_term: u.normalized_term,
        suggested_category: u.suggested_category,
      });
      if (error) throw wrapDbError(error, "normalization_unknowns insert");
    } else if (existing.status === "open") {
      // Only bump occurrences for open rows — once a term is resolved
      // (aliased/added/ignored) we leave it alone.
      const occ = (existing.occurrences ?? 1) + 1;
      const { error } = await admin
        .from("normalization_unknowns")
        .update({
          occurrences: occ,
          last_seen_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
      if (error) throw wrapDbError(error, "normalization_unknowns update");
    }
  }
}

/**
 * Lookup helpers for the read-side surfaces (Phase B/C will add more). Anon
 * client OK — RLS allows public reads of report_components/capabilities/attributes.
 */
export type ReportComponentRow = {
  component_slug: string;
  source: "fingerprint" | "text_match" | "both";
};

export type ReportCapabilityRow = {
  capability_slug: string;
  confidence: number;
  evidence_field: string;
};

export type ReportAttributeRow = {
  segment_slug: string | null;
  business_model_slug: string | null;
  monthly_floor_usd: number | null;
  is_usage_based: boolean;
  capital_intensity_bucket: "low" | "mid" | "high" | null;
  projection_version: number;
  projected_at: string;
};

/**
 * Bulk-read the projection slice the similarity engine needs: capability set
 * + segment + business model per report. Two anon SELECTs (capabilities,
 * attributes), zipped in JS by report_id.
 *
 * Two anon calls instead of one nested embed because Supabase's PostgREST
 * embed payloads at this scale ship a row-per-capability with the parent
 * report fields duplicated; the flat shape we'd build here is identical
 * either way and easier to reason about.
 *
 * Returns a Map keyed by report_id. Reports without a `report_attributes`
 * row (legacy / projection-failed) still appear if they have capabilities,
 * with `segment_slug` / `business_model_slug` null. Reports with neither
 * are absent — they can't contribute to similarity rankings.
 */
export async function getAllSimilarityCandidates(): Promise<
  Map<string, SimilarityCandidate>
> {
  const sb = getSupabaseAnon();
  if (!sb) return new Map();

  // Explicit ranges so we don't hit the PostgREST default 1000-row cap once
  // the corpus crosses ~150 reports (5 capabilities × 200 reports = 1000 rows).
  // 50K is comfortably above when we'd swap to a materialized `report_neighbors`
  // table anyway. Reach for streaming/pagination if/when this becomes false.
  const [capsRes, attrsRes] = await Promise.all([
    sb.from("report_capabilities").select("report_id, capability_slug").range(0, 49_999),
    sb
      .from("report_attributes")
      .select("report_id, segment_slug, business_model_slug")
      .range(0, 49_999),
  ]);

  if (capsRes.error) {
    console.error("[projections] getAllSimilarityCandidates capabilities", capsRes.error);
    return new Map();
  }
  if (attrsRes.error) {
    console.error("[projections] getAllSimilarityCandidates attributes", attrsRes.error);
    return new Map();
  }

  const out = new Map<string, SimilarityCandidate>();
  for (const row of (capsRes.data ?? []) as Array<{
    report_id: string;
    capability_slug: string;
  }>) {
    let entry = out.get(row.report_id);
    if (!entry) {
      entry = {
        report_id: row.report_id,
        capabilities: new Set(),
        segment_slug: null,
        business_model_slug: null,
      };
      out.set(row.report_id, entry);
    }
    entry.capabilities.add(row.capability_slug);
  }
  for (const row of (attrsRes.data ?? []) as Array<{
    report_id: string;
    segment_slug: string | null;
    business_model_slug: string | null;
  }>) {
    let entry = out.get(row.report_id);
    if (!entry) {
      entry = {
        report_id: row.report_id,
        capabilities: new Set(),
        segment_slug: row.segment_slug,
        business_model_slug: row.business_model_slug,
      };
      out.set(row.report_id, entry);
    } else {
      entry.segment_slug = row.segment_slug;
      entry.business_model_slug = row.business_model_slug;
    }
  }
  return out;
}

/**
 * Persist distribution signals onto the existing `report_attributes` row.
 * Called from `runScan` after `persistProjection` (which created the row)
 * and from the backfill script. Updates only the distribution-axis
 * columns; the projection's own attribute columns (segment_slug,
 * business_model_slug, monthly_floor_usd, ...) are left intact.
 *
 * Pre-condition: the report_attributes row already exists. The pipeline
 * guarantees this by running persistProjection first; the backfill script
 * does too. If the row doesn't exist, the update is a no-op (Supabase
 * returns no error for zero-row updates).
 *
 * Old/dead columns (last_blog_post_at, community_channels, domain_
 * registered_at) are explicitly nulled on each write so a recompute
 * after the v8 signal-set change doesn't leave stale data confusingly
 * mixed with fresh data.
 */
export async function persistDistributionSignals(
  reportId: string,
  signals: DistributionSignals,
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("report_attributes")
    .update({
      pricing_gate: signals.pricing_gate,
      serp_own_domain_count: signals.serp_own_domain_count,
      organic_count: signals.organic_count,
      knowledge_graph_present: signals.knowledge_graph_present,
      has_wikipedia: signals.has_wikipedia,
      authoritative_third_party_count: signals.authoritative_third_party_count,
      top_organic_owned: signals.top_organic_owned,
      has_sitelinks: signals.has_sitelinks,
      paa_present: signals.paa_present,
      related_searches_present: signals.related_searches_present,
      total_results: signals.total_results,
      has_news: signals.has_news,
      // Dead columns from prior calibrations — null out so stale data
      // from earlier backfills doesn't confuse the diagnose script.
      last_blog_post_at: null,
      community_channels: [],
      domain_registered_at: null,
    })
    .eq("report_id", reportId);
  if (error) throw wrapDbError(error, "report_attributes distribution update");
}

/**
 * Load previously-persisted distribution signals for a report. Returns
 * null when no signals have ever been collected (pre-Phase-1 row, or
 * backfill never run for this slug). Used by `scripts/recompute_projections.ts`
 * so calibration iterations on `scoreDistribution` can be tested without
 * re-fetching every homepage.
 *
 * `pricing_gate` being null is the sentinel: it's deterministically derived
 * from `monthly_floor_usd` and gets written every time `combineDistribution
 * Signals` runs, so a null pricing_gate means signals were never collected.
 */
export async function loadDistributionSignals(
  reportId: string,
): Promise<DistributionSignals | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("report_attributes")
    .select(
      "pricing_gate, serp_own_domain_count, organic_count, knowledge_graph_present, has_wikipedia, authoritative_third_party_count, top_organic_owned, has_sitelinks, paa_present, related_searches_present, total_results, has_news",
    )
    .eq("report_id", reportId)
    .maybeSingle();
  if (error) throw wrapDbError(error, "report_attributes load distribution");
  if (!data) return null;
  if (data.pricing_gate !== "demo" && data.pricing_gate !== "public") return null;
  // total_results is a bigint in the DB; PostgREST returns it as a string
  // when it might overflow JS Number. Parse defensively.
  const totalResults =
    typeof data.total_results === "string"
      ? Number.parseInt(data.total_results, 10)
      : (data.total_results as number | null);
  return {
    pricing_gate: data.pricing_gate,
    serp_own_domain_count: data.serp_own_domain_count ?? null,
    organic_count: data.organic_count ?? null,
    knowledge_graph_present: data.knowledge_graph_present ?? null,
    has_wikipedia: data.has_wikipedia ?? null,
    authoritative_third_party_count: data.authoritative_third_party_count ?? null,
    top_organic_owned: data.top_organic_owned ?? null,
    has_sitelinks: data.has_sitelinks ?? null,
    paa_present: data.paa_present ?? null,
    related_searches_present: data.related_searches_present ?? null,
    total_results: totalResults !== undefined && Number.isFinite(totalResults) ? totalResults : null,
    has_news: data.has_news ?? null,
  };
}
