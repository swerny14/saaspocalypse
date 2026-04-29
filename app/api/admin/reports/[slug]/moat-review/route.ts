import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { getReportBySlug } from "@/lib/db/reports";
import { setMoatReviewStatus } from "@/lib/db/moat_scores";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";

const Body = z.object({
  status: z.enum(["pending", "verified"]),
});

/**
 * Mark a report's moat score as verified (curator confirmed it's honest)
 * or pending (re-flag for review). Used by the /admin/moat-anomalies UI to
 * dismiss rows after manual review without affecting the underlying score.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const { slug } = await params;

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const report = await getReportBySlug(slug);
  if (!report) {
    return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
  }
  if (!report.moat) {
    return NextResponse.json(
      { ok: false, reason: "no_moat_score", message: "Report has no moat score yet — recompute first." },
      { status: 400 },
    );
  }

  try {
    await setMoatReviewStatus(report.id, parsed.data.status);
    return NextResponse.json({ ok: true, status: parsed.data.status });
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "admin_moat_review_failed",
      refId: report.id,
      refSlug: report.slug,
      message: e instanceof Error ? e.message : String(e),
      detail: { status: parsed.data.status },
    });
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
