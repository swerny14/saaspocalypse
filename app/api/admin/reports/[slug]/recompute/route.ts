import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getReportBySlug } from "@/lib/db/reports";
import { loadEngineContextFromDb } from "@/lib/db/taxonomy_loader";
import { logError } from "@/lib/error_log";
import { recomputeReportScoring } from "@/lib/normalization/recompute";
import { getCachedScoringConfig } from "@/lib/normalization/scoring_loader";

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * Single-report recompute. Used by the moat-anomalies admin page when a
 * curator wants to verify that a pattern fix produced the expected score
 * change for a specific report without re-scoring the entire corpus.
 *
 * Reads taxonomy fresh from the DB (same posture as the bulk endpoint)
 * so admin edits affect the result immediately.
 */
export async function POST(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const { slug } = await params;

  const report = await getReportBySlug(slug);
  if (!report) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }

  try {
    const { context, capabilities: catalog } = await loadEngineContextFromDb();
    const config = await getCachedScoringConfig(true);
    const result = await recomputeReportScoring(report, {
      context,
      catalog,
      config,
    });
    return NextResponse.json({
      ok: true,
      slug: report.slug,
      moat: {
        aggregate: result.moat.aggregate,
        capital: result.moat.capital,
        technical: result.moat.technical,
        network: result.moat.network,
        switching: result.moat.switching,
        data_moat: result.moat.data_moat,
        regulatory: result.moat.regulatory,
        distribution: result.moat.distribution,
      },
      before: result.before,
      after: result.after,
      capability_count: result.capability_count,
    });
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "admin_recompute_one_failed",
      refId: report.id,
      refSlug: report.slug,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
