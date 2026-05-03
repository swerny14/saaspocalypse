import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getReportBySlug } from "@/lib/db/reports";
import {
  persistDistributionSignals,
} from "@/lib/db/projections";
import { loadEngineContextFromDb } from "@/lib/db/taxonomy_loader";
import { logError } from "@/lib/error_log";
import {
  collectExternalDistributionSignals,
  combineDistributionSignals,
} from "@/lib/scanner/distribution";
import { projectReport } from "@/lib/normalization/engine";
import { recomputeReportScoring } from "@/lib/normalization/recompute";
import type { FetchResult } from "@/lib/scanner/fetch";

export const runtime = "nodejs";
export const maxDuration = 30;

const EMPTY_FETCH: FetchResult = {
  cleaned: "",
  rawHead: "",
  headers: {},
  setCookies: [],
  finalUrl: "",
};

export async function POST(
  req: Request,
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
    const { context } = await loadEngineContextFromDb();
    const external = await collectExternalDistributionSignals(
      report.domain,
      req.signal,
    );
    const projection = projectReport(report, report.detected_stack, context);
    const distribution = combineDistributionSignals(
      external,
      EMPTY_FETCH,
      projection.attributes,
    );
    await persistDistributionSignals(report.id, distribution);
    const result = await recomputeReportScoring(report, {
      context,
    });

    return NextResponse.json({
      ok: true,
      distribution,
      moat: result.moat,
      before: result.before,
      after: result.after,
    });
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "admin_distribution_refresh_failed",
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
