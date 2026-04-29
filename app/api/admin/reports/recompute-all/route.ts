import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getAllReports } from "@/lib/db/reports";
import { projectReport } from "@/lib/normalization/engine";
import { persistProjection } from "@/lib/db/projections";
import { scoreMoat } from "@/lib/normalization/moat";
import { persistMoatScore } from "@/lib/db/moat_scores";
import { loadEngineContextFromDb } from "@/lib/db/taxonomy_loader";
import { logError } from "@/lib/error_log";

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
  const reports = await getAllReports(10_000);
  let processed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const r of reports) {
    try {
      const projection = projectReport(r, r.detected_stack, context);
      await persistProjection(r.id, projection);
      const moat = scoreMoat({
        verdict: r,
        capabilities: projection.capabilities,
        catalog,
      });
      await persistMoatScore(r.id, moat);
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

  return NextResponse.json({ ok: true, processed, failed, failures });
}
