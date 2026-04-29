import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getReportBySlug } from "@/lib/db/reports";
import { projectReport } from "@/lib/normalization/engine";
import { persistProjection } from "@/lib/db/projections";
import { scoreMoat } from "@/lib/normalization/moat";
import { persistMoatScore } from "@/lib/db/moat_scores";
import { loadEngineContextFromDb } from "@/lib/db/taxonomy_loader";
import { logError } from "@/lib/error_log";

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
    const projection = projectReport(report, report.detected_stack, context);
    await persistProjection(report.id, projection);
    const moat = scoreMoat({
      verdict: report,
      capabilities: projection.capabilities,
      catalog,
    });
    await persistMoatScore(report.id, moat);
    return NextResponse.json({
      ok: true,
      slug: report.slug,
      moat: {
        aggregate: moat.aggregate,
        capital: moat.capital,
        technical: moat.technical,
        network: moat.network,
        switching: moat.switching,
        data_moat: moat.data_moat,
        regulatory: moat.regulatory,
      },
      capability_count: projection.capabilities.length,
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
