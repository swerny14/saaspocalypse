import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import {
  getReportBySlug,
} from "@/lib/db/reports";
import { recomputeReportScoring } from "@/lib/normalization/recompute";
import { getCachedScoringConfig } from "@/lib/normalization/scoring_loader";
import { logScoringAudit } from "@/lib/db/scoring_config";
import { loadEngineContextFromDb } from "@/lib/db/taxonomy_loader";

const Body = z.object({
  slug: z.string().min(1).max(200),
});

/**
 * Recompute a single report's projection + moat + wedge fields against the
 * current DB-backed scoring config. Used by the score-audit drilldown's
 * "↻ recompute this report" button. Forces a fresh config load so just-
 * edited patterns / weights apply on the next click.
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const { slug } = parsed.data;
  const report = await getReportBySlug(slug);
  if (!report) {
    return NextResponse.json({ error: "report not found" }, { status: 404 });
  }

  try {
    const [config, { context, capabilities: catalog }] = await Promise.all([
      getCachedScoringConfig(true),
      loadEngineContextFromDb(),
    ]);
    const result = await recomputeReportScoring(report, {
      config,
      context,
      catalog,
    });

    const moved = report.tier !== result.after.tier;
    await logScoringAudit({
      actor: "admin",
      scope: "recompute",
      change_kind: "recompute_one",
      ref_id: report.id,
      ref_key: report.slug,
      before_value: result.before,
      after_value: result.after,
      reports_moved: moved ? 1 : 0,
    });

    return NextResponse.json({
      ok: true,
      before: result.before,
      after: result.after,
      tier_moved: moved,
      moat: result.moat,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "recompute failed" },
      { status: 500 },
    );
  }
}
