import { getSupabaseAdmin } from "./supabase";
import { wrapDbError } from "./errors";
import type { ReportProjection } from "@/lib/normalization/engine";

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
