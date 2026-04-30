import { getSupabaseAnon } from "./supabase";
import { getReportBySlug, type StoredReport } from "./reports";
import type { SimilarityCandidate } from "@/lib/normalization/similarity";
import type { ReportComponentRow } from "./projections";

/**
 * DAL for the head-to-head compare page (`/compare/<a>-vs-<b>`). Pulls both
 * reports plus the projection slices needed for the diff sections — capability
 * sets, segment/business-model, components (for stack diff), and attributes
 * (for cost delta) — in parallel.
 *
 * Either side may be missing a projection (legacy / failed). Compare page
 * still renders verdict twin + cost strip in that case; capability and stack
 * diff sections show empty-state copy. We do NOT 404 a pair just because one
 * side hasn't been projected — the verdict-level comparison is still useful.
 */

export type CompareSide = {
  report: StoredReport;
  projection: SimilarityCandidate | null;
  components: ReportComponentRow[];
  monthly_floor_usd: number | null;
  is_usage_based: boolean;
};

export type ComparePair = {
  a: CompareSide;
  b: CompareSide;
};

/**
 * Returns null when either slug doesn't resolve. Same-slug pairs return null
 * — the page-level handler 404s them. Caller is responsible for canonical
 * (alphabetical) ordering of the URL; this helper just resolves what it's
 * given.
 */
export async function getComparePair(
  slugA: string,
  slugB: string,
): Promise<ComparePair | null> {
  if (slugA === slugB) return null;

  const [reportA, reportB] = await Promise.all([
    getReportBySlug(slugA),
    getReportBySlug(slugB),
  ]);
  if (!reportA || !reportB) return null;

  const ids = [reportA.id, reportB.id];
  const sb = getSupabaseAnon();
  if (!sb) {
    return {
      a: emptySide(reportA),
      b: emptySide(reportB),
    };
  }

  const [capsRes, attrsRes, compsRes] = await Promise.all([
    sb.from("report_capabilities").select("report_id, capability_slug").in("report_id", ids),
    sb
      .from("report_attributes")
      .select(
        "report_id, segment_slug, business_model_slug, monthly_floor_usd, is_usage_based",
      )
      .in("report_id", ids),
    sb
      .from("report_components")
      .select("report_id, component_slug, source")
      .in("report_id", ids),
  ]);

  if (capsRes.error) console.error("[compare] capabilities", capsRes.error);
  if (attrsRes.error) console.error("[compare] attributes", attrsRes.error);
  if (compsRes.error) console.error("[compare] components", compsRes.error);

  const capsByReport = new Map<string, Set<string>>();
  for (const row of (capsRes.data ?? []) as Array<{
    report_id: string;
    capability_slug: string;
  }>) {
    let set = capsByReport.get(row.report_id);
    if (!set) {
      set = new Set();
      capsByReport.set(row.report_id, set);
    }
    set.add(row.capability_slug);
  }

  const attrsByReport = new Map<
    string,
    {
      segment_slug: string | null;
      business_model_slug: string | null;
      monthly_floor_usd: number | null;
      is_usage_based: boolean;
    }
  >();
  for (const row of (attrsRes.data ?? []) as Array<{
    report_id: string;
    segment_slug: string | null;
    business_model_slug: string | null;
    monthly_floor_usd: number | null;
    is_usage_based: boolean;
  }>) {
    attrsByReport.set(row.report_id, {
      segment_slug: row.segment_slug,
      business_model_slug: row.business_model_slug,
      monthly_floor_usd: row.monthly_floor_usd,
      is_usage_based: row.is_usage_based,
    });
  }

  const compsByReport = new Map<string, ReportComponentRow[]>();
  for (const row of (compsRes.data ?? []) as Array<{
    report_id: string;
    component_slug: string;
    source: ReportComponentRow["source"];
  }>) {
    let arr = compsByReport.get(row.report_id);
    if (!arr) {
      arr = [];
      compsByReport.set(row.report_id, arr);
    }
    arr.push({ component_slug: row.component_slug, source: row.source });
  }

  return {
    a: buildSide(reportA, capsByReport, attrsByReport, compsByReport),
    b: buildSide(reportB, capsByReport, attrsByReport, compsByReport),
  };
}

function emptySide(report: StoredReport): CompareSide {
  return {
    report,
    projection: null,
    components: [],
    monthly_floor_usd: null,
    is_usage_based: false,
  };
}

function buildSide(
  report: StoredReport,
  caps: Map<string, Set<string>>,
  attrs: Map<
    string,
    {
      segment_slug: string | null;
      business_model_slug: string | null;
      monthly_floor_usd: number | null;
      is_usage_based: boolean;
    }
  >,
  comps: Map<string, ReportComponentRow[]>,
): CompareSide {
  const capSet = caps.get(report.id);
  const attr = attrs.get(report.id);
  const components = comps.get(report.id) ?? [];

  const projection: SimilarityCandidate | null =
    capSet || attr
      ? {
          report_id: report.id,
          capabilities: capSet ?? new Set(),
          segment_slug: attr?.segment_slug ?? null,
          business_model_slug: attr?.business_model_slug ?? null,
        }
      : null;

  return {
    report,
    projection,
    components,
    monthly_floor_usd: attr?.monthly_floor_usd ?? null,
    is_usage_based: attr?.is_usage_based ?? false,
  };
}
