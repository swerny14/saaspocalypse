import { getSupabaseAdmin, getSupabaseAnon } from "./supabase";
import { wrapDbError } from "./errors";
import type { ReportProjection } from "@/lib/normalization/engine";
import type { SimilarityCandidate } from "@/lib/normalization/similarity";

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
