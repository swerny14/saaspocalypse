import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getAllReports } from "@/lib/db/reports";
import { getAllSimilarityCandidates } from "@/lib/db/projections";
import { detectSimilarityGaps } from "@/lib/normalization/similarity_gaps";
import { upsertGaps } from "@/lib/db/similarity_gaps";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Run the similarity-gap detector over the corpus and persist any newly-found
 * pairs. Idempotent — pairs already present in the table (open, applied, or
 * dismissed) are skipped via the unique constraint.
 *
 * Returns a summary so the UI can show "found N gaps, M new" feedback.
 */
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  try {
    const [reports, candidates] = await Promise.all([
      getAllReports(5000),
      getAllSimilarityCandidates(),
    ]);

    const gaps = detectSimilarityGaps(reports, candidates, { debug: true });

    console.info(
      `[gaps] detector returned ${gaps.length} flagged pairs; sample:`,
      gaps.slice(0, 5).map((g) => ({
        pair: `${g.report_a_slug} ↔ ${g.report_b_slug}`,
        text: g.text_similarity,
        engine: g.engine_score,
      })),
    );

    const { inserted } = await upsertGaps(
      gaps.map((g) => ({
        report_a_id: g.report_a_id,
        report_b_id: g.report_b_id,
        text_similarity: g.text_similarity,
        engine_score: g.engine_score,
      })),
    );

    console.info(
      `[gaps] persisted: detected=${gaps.length} inserted=${inserted} already_known=${gaps.length - inserted}`,
    );

    return NextResponse.json({
      ok: true,
      detected: gaps.length,
      inserted,
      already_known: gaps.length - inserted,
    });
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "similarity_gap_detect_failed",
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
