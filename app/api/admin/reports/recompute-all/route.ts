import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getAllReports } from "@/lib/db/reports";
import { loadEngineContextFromDb } from "@/lib/db/taxonomy_loader";
import { logError } from "@/lib/error_log";
import { recomputeReportScoring } from "@/lib/normalization/recompute";
import { getCachedScoringConfig } from "@/lib/normalization/scoring_loader";
import { logScoringAudit } from "@/lib/db/scoring_config";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Bulk-recompute every report's projection + moat score against the *DB*
 * taxonomy (not the TS-bundled one), so live admin edits to capabilities /
 * components take effect on the next click without a redeploy. Production
 * scans still use the TS-bundled defaults via runScan; that's intentional —
 * deploys remain reproducible from git.
 *
 * Sequential — Vercel function timeout is 60s. With ~30 reports, average
 * run is well under 5s; if the corpus ever grows past ~300 we'd need to
 * paginate or push to a job queue.
 */
export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  const { context, capabilities: catalog } = await loadEngineContextFromDb();
  const config = await getCachedScoringConfig(true);
  const reports = await getAllReports(10_000);
  let processed = 0;
  let failed = 0;
  let tierMoves = 0;
  const failures: string[] = [];

  for (const r of reports) {
    try {
      const result = await recomputeReportScoring(r, {
        context,
        catalog,
        config,
      });
      if (r.tier !== result.after.tier) tierMoves += 1;
      processed += 1;
    } catch (e) {
      failed += 1;
      failures.push(r.slug);
      await logError({
        scope: "scan",
        reason: "admin_recompute_failed",
        refId: r.id,
        refSlug: r.slug,
        message: e instanceof Error ? e.message : String(e),
      });
    }
  }

  await logScoringAudit({
    actor: "admin",
    scope: "recompute",
    change_kind: "recompute_all",
    reports_moved: tierMoves,
    after_value: { total: reports.length, processed, failed, failures },
    reason: "Admin score workbench recompute-all",
  });

  return NextResponse.json({ ok: true, processed, failed, failures, tierMoves });
}
