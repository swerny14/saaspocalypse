import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import {
  getReportBySlug,
} from "@/lib/db/reports";
import { recomputeReportScoring } from "@/lib/normalization/recompute";
import { loadEngineContextFromDb } from "@/lib/db/taxonomy_loader";

const Body = z.object({
  slug: z.string().min(1).max(200),
});

/**
 * Recompute a single report's projection, LLM moat score, and wedge fields.
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
    const { context } = await loadEngineContextFromDb();
    const result = await recomputeReportScoring(report, {
      context,
    });

    return NextResponse.json({
      ok: true,
      before: result.before,
      after: result.after,
      tier_moved: report.tier !== result.after.tier,
      moat: result.moat,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "recompute failed" },
      { status: 500 },
    );
  }
}
