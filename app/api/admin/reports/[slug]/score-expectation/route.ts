import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getReportBySlug } from "@/lib/db/reports";
import { upsertScoreExpectation } from "@/lib/db/score_expectations";
import { expectScoreBands } from "@/lib/normalization/score_expectation_llm";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";
export const maxDuration = 60;

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
  if (!report.moat) {
    return NextResponse.json(
      {
        ok: false,
        reason: "no_moat_score",
        message: "Report has no moat score yet — recompute first.",
      },
      { status: 400 },
    );
  }

  const result = await expectScoreBands({ verdict: report, moat: report.moat });
  if (result.kind === "error") {
    await logError({
      scope: "scan",
      reason: "admin_score_expectation_llm_failed",
      refId: report.id,
      refSlug: report.slug,
      message: result.message,
    });
    return NextResponse.json({ ok: false, message: result.message }, { status: 502 });
  }

  try {
    await upsertScoreExpectation(report.id, result.expectation);
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "admin_score_expectation_persist_failed",
      refId: report.id,
      refSlug: report.slug,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, expectation: result.expectation });
}
