import type { StoredReport } from "./reports";
import { getReportsByIds, getAllReportIdSlugMap } from "./reports";
import { getAllSimilarityCandidates } from "./projections";
import {
  MIN_SIMILARITY_SCORE,
  scoreAllCandidates,
  type SimilarityResult,
} from "@/lib/normalization/similarity";
import { CAPABILITIES } from "@/lib/normalization/taxonomy";
import { logError } from "@/lib/error_log";

const NEIGHBOR_PAIRS_LIMIT = 6;

const DESCRIPTOR_SLUGS_FOR_WEDGE = new Set(
  CAPABILITIES.filter((c) => c.is_descriptor).map((c) => c.slug),
);

export type SimilarReport = {
  report: StoredReport;
  shared_capabilities: string[];
  same_segment: boolean;
  /** candidate.wedge_score minus source.wedge_score. Positive = candidate
   *  has thinner walls (more wedgeable) than the source. Surface as "+20"
   *  / "-8" on the card. */
  score_delta: number;
  /** Capabilities the candidate has that the source doesn't, ordered by
   *  importance (descriptors first, then alphabetical). The card surfaces
   *  the top 1-2 as the "wedge" — what makes this candidate distinct from
   *  the source. Empty when the candidate is a strict subset of source. */
  wedge_capability_slugs: string[];
};

const MAX_LOG_ROWS = 12;
const MAX_WEDGE_SLUGS = 4;

/**
 * Top-K most-similar reports to `sourceId`. Pure-projection-driven, no LLM.
 *
 * Phase A (this file): lazy — fetch all projections once, score in JS,
 * fetch full StoredReport for the top-K only. Workable to ~1000 reports.
 * When N grows past that or render p95 climbs, swap to a materialized
 * `report_neighbors` table; the public surface (this function's signature
 * + `SimilarReport` shape) stays the same.
 *
 * Each result also carries comparison metadata — `score_delta` and
 * `wedge_capability_slugs` — so the rail can lead with what makes each
 * candidate DIFFERENT from the source rather than what makes them similar.
 *
 * Returns [] when the source has no projection or no candidates clear the
 * minimum score — `<SimilarProducts>` hides itself in that case.
 *
 * Emits diagnostic `[similar]` logs (server-side console.info) so we can
 * tune calibration against real data.
 */
export async function getSimilarReports(
  sourceId: string,
  limit = 6,
): Promise<SimilarReport[]> {
  try {
    const candidates = await getAllSimilarityCandidates();
    const source = candidates.get(sourceId);

    if (!source) {
      console.info(
        `[similar] source ${sourceId} has no projection — corpus=${candidates.size}, returning []`,
      );
      return [];
    }
    if (source.capabilities.size === 0) {
      console.info(
        `[similar] source ${sourceId} has 0 capabilities — corpus=${candidates.size}, returning []`,
      );
      return [];
    }

    const all = scoreAllCandidates(source, Array.from(candidates.values()));
    const ranked = all.filter((s) => s.result.score >= MIN_SIMILARITY_SCORE).slice(0, limit);

    // Diagnostic dump — slug-enriched for readability. Pulled lazily so the
    // happy-path-empty short-circuits above don't pay the cost.
    const slugMap = await getAllReportIdSlugMap();
    const top = all.slice(0, MAX_LOG_ROWS).map((s) => ({
      slug: slugMap.get(s.candidate.report_id) ?? s.candidate.report_id,
      score: Number(s.result.score.toFixed(3)),
      shared: s.result.shared_capabilities,
      same_segment: s.result.same_segment,
      same_business_model: s.result.same_business_model,
    }));
    console.info(
      `[similar] source=${slugMap.get(sourceId) ?? sourceId} caps=${source.capabilities.size} segment=${source.segment_slug ?? "—"} bizmodel=${source.business_model_slug ?? "—"} corpus=${candidates.size} threshold=${MIN_SIMILARITY_SCORE} cleared=${ranked.length}`,
    );
    console.info(`[similar] top${top.length}`, top);

    if (ranked.length === 0) return [];

    // Pull full StoredReport rows for the top-K candidates AND the source —
    // we need source.score to compute score_delta on each card.
    const candidateIds = ranked.map((r) => r.candidate.report_id);
    const reports = await getReportsByIds([sourceId, ...candidateIds]);

    const byId = new Map<string, StoredReport>();
    for (const r of reports) byId.set(r.id, r);
    const sourceReport = byId.get(sourceId);
    if (!sourceReport) {
      console.info(`[similar] source ${sourceId} StoredReport missing — returning []`);
      return [];
    }

    const out: SimilarReport[] = [];
    const resultsById = new Map<string, SimilarityResult>();
    for (const r of ranked) resultsById.set(r.candidate.report_id, r.result);

    for (const id of candidateIds) {
      const report = byId.get(id);
      const result = resultsById.get(id);
      const candidate = candidates.get(id);
      if (!report || !result || !candidate) continue;
      out.push({
        report,
        shared_capabilities: result.shared_capabilities,
        same_segment: result.same_segment,
        score_delta: report.wedge_score - sourceReport.wedge_score,
        wedge_capability_slugs: computeWedge(source.capabilities, candidate.capabilities),
      });
    }
    return out;
  } catch (err) {
    void logError({
      scope: "scan",
      reason: "similar_reports_failed",
      refId: sourceId,
      message: "getSimilarReports threw",
      detail: { error: err instanceof Error ? err.message : String(err) },
    });
    return [];
  }
}

/**
 * Batch helper for the compare-page sitemap. Loads projection candidates
 * ONCE, scores every report against the rest in memory, and emits the set
 * of canonical-ordered (slug-A < slug-B) pairs covered by the top-K
 * neighbor surface — i.e. the same pair set the similarity rail's cards
 * link to.
 *
 * Returns deduped pair slugs alongside the most recent of the two reports'
 * `updated_at` timestamps so the sitemap can populate `lastModified` without
 * a second DB pass.
 *
 * Expected cardinality: O(N × limit) before dedup, ≈ half that after. At
 * N=1000 and limit=6 → ~3K pairs. Cheap enough to keep render-time inside
 * the sitemap's existing `revalidate = 3600` budget.
 */
export async function getAllNeighborPairs(
  limit = NEIGHBOR_PAIRS_LIMIT,
): Promise<Array<{ slugA: string; slugB: string; lastModified: string }>> {
  try {
    const candidates = await getAllSimilarityCandidates();
    if (candidates.size === 0) return [];

    const slugMap = await getAllReportIdSlugMap();
    // Need updated_at per report — getAllSimilarityCandidates doesn't carry
    // it. Sitemap call site will already have read getAllReportsForSitemap;
    // we accept a small duplication of work here for a self-contained API.
    const { getAllReportsForSitemap } = await import("./reports");
    const meta = await getAllReportsForSitemap();
    const metaBySlug = new Map(meta.map((r) => [r.slug, r.updated_at]));

    const candidateList = Array.from(candidates.values());
    const seen = new Set<string>();
    const out: Array<{ slugA: string; slugB: string; lastModified: string }> = [];

    for (const source of candidateList) {
      if (source.capabilities.size === 0) continue;
      const ranked = scoreAllCandidates(source, candidateList)
        .filter((r) => r.result.score >= MIN_SIMILARITY_SCORE)
        .slice(0, limit);

      const sourceSlug = slugMap.get(source.report_id);
      if (!sourceSlug) continue;

      for (const r of ranked) {
        const candSlug = slugMap.get(r.candidate.report_id);
        if (!candSlug) continue;
        const [a, b] = sourceSlug < candSlug ? [sourceSlug, candSlug] : [candSlug, sourceSlug];
        const key = `${a}-vs-${b}`;
        if (seen.has(key)) continue;
        seen.add(key);
        const aMod = metaBySlug.get(a);
        const bMod = metaBySlug.get(b);
        const lastModified =
          aMod && bMod ? (aMod > bMod ? aMod : bMod) : (aMod ?? bMod ?? new Date().toISOString());
        out.push({ slugA: a, slugB: b, lastModified });
      }
    }
    return out;
  } catch (err) {
    void logError({
      scope: "scan",
      reason: "neighbor_pairs_failed",
      message: "getAllNeighborPairs threw",
      detail: { error: err instanceof Error ? err.message : String(err) },
    });
    return [];
  }
}

/**
 * Capabilities the candidate has that the source doesn't, ordered:
 *   1. Descriptors first (product-category caps — the most informative wedges)
 *   2. Then alphabetical
 *
 * Capped at MAX_WEDGE_SLUGS so the card has room to render. Card layer
 * decides how many to actually display.
 */
function computeWedge(
  source: ReadonlySet<string>,
  candidate: ReadonlySet<string>,
): string[] {
  const wedge: string[] = [];
  for (const slug of candidate) {
    if (!source.has(slug)) wedge.push(slug);
  }
  wedge.sort((a, b) => {
    const aIsDescriptor = DESCRIPTOR_SLUGS_FOR_WEDGE.has(a);
    const bIsDescriptor = DESCRIPTOR_SLUGS_FOR_WEDGE.has(b);
    if (aIsDescriptor !== bIsDescriptor) return aIsDescriptor ? -1 : 1;
    return a.localeCompare(b);
  });
  return wedge.slice(0, MAX_WEDGE_SLUGS);
}
