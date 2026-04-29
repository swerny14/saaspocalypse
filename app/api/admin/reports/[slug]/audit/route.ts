import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getReportBySlug } from "@/lib/db/reports";
import { getAllCapabilities } from "@/lib/db/capabilities";
import { auditMoat } from "@/lib/normalization/moat_audit_llm";
import { persistMoatAudit } from "@/lib/db/moat_scores";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Per-report moat audit via Claude. Loads the report + its current moat
 * score + the full capability catalog + which capabilities fired on this
 * report's projection, then asks Claude to suggest specific taxonomy
 * changes (add_pattern / new_capability) that would close gaps.
 *
 * Read-only — produces suggestions, doesn't apply them. The admin clicks
 * "Apply" on each suggestion individually.
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
  if (!report.moat) {
    return NextResponse.json(
      { ok: false, reason: "no_moat_score", message: "Report has no moat score yet — recompute first." },
      { status: 400 },
    );
  }

  // Fetch the projection's capability matches for this report so Claude
  // sees exactly which ones fired vs. which ones didn't.
  const admin = getSupabaseAdmin();
  const { data: matchedRows, error: matchErr } = await admin
    .from("report_capabilities")
    .select("capability_slug")
    .eq("report_id", report.id);
  if (matchErr) {
    await logError({
      scope: "scan",
      reason: "admin_audit_load_failed",
      refSlug: slug,
      message: matchErr.message ?? String(matchErr),
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  const matchedSlugs = (matchedRows ?? []).map(
    (r) => (r as { capability_slug: string }).capability_slug,
  );

  const capabilities = await getAllCapabilities();

  const result = await auditMoat({
    report: { name: report.name, tagline: report.tagline, slug: report.slug },
    verdict: report,
    moat: report.moat,
    capabilities,
    matched_capability_slugs: matchedSlugs,
  });

  if (result.kind === "error") {
    await logError({
      scope: "scan",
      reason: "admin_audit_llm_failed",
      refSlug: slug,
      message: result.message,
    });
    return NextResponse.json({ ok: false, message: result.message }, { status: 502 });
  }

  // Persist for the bulk-audit / refresh-from-page workflow. Soft-fail —
  // returning the suggestions to the caller is the primary contract; the
  // persistence is a convenience for the queue UI.
  try {
    await persistMoatAudit(report.id, {
      summary: result.verdict_summary,
      suggestions: result.suggestions,
    });
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "admin_audit_persist_failed",
      refId: report.id,
      refSlug: slug,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  return NextResponse.json({
    ok: true,
    verdict_summary: result.verdict_summary,
    suggestions: result.suggestions,
  });
}
