import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { getReportBySlug } from "@/lib/db/reports";
import { getAllCapabilities } from "@/lib/db/capabilities";
import { auditMoat } from "@/lib/normalization/moat_audit_llm";
import { persistMoatAudit } from "@/lib/db/moat_scores";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";
export const maxDuration = 60;

const BATCH_LIMIT = 5;

const Body = z.object({
  slugs: z.array(z.string().min(1).max(120)).min(1).max(BATCH_LIMIT),
});

/**
 * Bulk moat-audit. Caller passes up to 5 slugs; we audit each one and
 * persist the result onto report_moat_scores. Mirrors the per-row
 * /api/admin/reports/[slug]/audit endpoint logic but processes a batch
 * with shared catalog + capability lookups.
 *
 * Cap is 5 because each audit is a full Claude call (~5–10s) and we have
 * a 60s function budget. The triage UI chunks longer queues into
 * sequential 5-slug requests so the user can clear arbitrarily large
 * queues without bumping into the per-request ceiling.
 */
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, reason: "bad_json" }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, reason: "validation", message: parsed.error.message },
      { status: 400 },
    );
  }

  // Shared lookups so we don't re-fetch the catalog per row.
  const capabilities = await getAllCapabilities();
  const admin = getSupabaseAdmin();

  type Outcome = {
    slug: string;
    status: "ok" | "skipped" | "error";
    suggestion_count?: number;
    message?: string;
  };
  const outcomes: Outcome[] = [];

  // Sequential — concurrent fan-out would race the 60s budget more
  // aggressively for marginal speedup, since each call is the long pole.
  for (const slug of parsed.data.slugs) {
    const report = await getReportBySlug(slug);
    if (!report) {
      outcomes.push({ slug, status: "skipped", message: "not_found" });
      continue;
    }
    if (!report.moat) {
      outcomes.push({ slug, status: "skipped", message: "no_moat_score" });
      continue;
    }

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
      outcomes.push({ slug, status: "error", message: "matched_load_failed" });
      continue;
    }
    const matchedSlugs = (matchedRows ?? []).map(
      (r) => (r as { capability_slug: string }).capability_slug,
    );

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
      outcomes.push({ slug, status: "error", message: result.message });
      continue;
    }

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
      outcomes.push({ slug, status: "error", message: "persist_failed" });
      continue;
    }

    outcomes.push({
      slug,
      status: "ok",
      suggestion_count: result.suggestions.length,
    });
  }

  const counts = {
    ok: outcomes.filter((o) => o.status === "ok").length,
    skipped: outcomes.filter((o) => o.status === "skipped").length,
    error: outcomes.filter((o) => o.status === "error").length,
  };
  return NextResponse.json({ ok: true, counts, outcomes });
}
