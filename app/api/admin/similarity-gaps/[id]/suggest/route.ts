import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import { getGap, persistSuggestion } from "@/lib/db/similarity_gaps";
import { getReportsByIds } from "@/lib/db/reports";
import { getAllCapabilities } from "@/lib/db/capabilities";
import { getAllSimilarityCandidates } from "@/lib/db/projections";
import { suggestDescriptor } from "@/lib/normalization/descriptor_suggestion_llm";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Per-row LLM suggestion. Reads the gap's pair, asks Claude for one of
 * add_pattern | new_capability | no_action, persists the result onto the
 * row so the UI can render the suggestion + apply button.
 *
 * Idempotent — re-running overwrites the prior suggestion.
 */
export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  try {
    const gap = await getGap(id);
    if (!gap) {
      return NextResponse.json({ ok: false, reason: "not_found" }, { status: 404 });
    }
    const [reports, capabilities, candidates] = await Promise.all([
      getReportsByIds([gap.report_a_id, gap.report_b_id]),
      getAllCapabilities(),
      getAllSimilarityCandidates(),
    ]);
    const a = reports.find((r) => r.id === gap.report_a_id);
    const b = reports.find((r) => r.id === gap.report_b_id);
    if (!a || !b) {
      return NextResponse.json({ ok: false, reason: "report_missing" }, { status: 404 });
    }
    const candA = candidates.get(a.id);
    const candB = candidates.get(b.id);
    const matched_a_slugs = candA ? Array.from(candA.capabilities) : [];
    const matched_b_slugs = candB ? Array.from(candB.capabilities) : [];

    const result = await suggestDescriptor({
      pair: {
        a: {
          name: a.name,
          slug: a.slug,
          tagline: a.tagline,
          take: a.take,
          take_sub: a.take_sub ?? "",
        },
        b: {
          name: b.name,
          slug: b.slug,
          tagline: b.tagline,
          take: b.take,
          take_sub: b.take_sub ?? "",
        },
      },
      matched_a_slugs,
      matched_b_slugs,
      capabilities,
    });

    if (result.kind === "error") {
      return NextResponse.json(
        { ok: false, reason: "llm_failed", message: result.message },
        { status: 502 },
      );
    }

    await persistSuggestion(id, result.suggestion);
    return NextResponse.json({ ok: true, suggestion: result.suggestion });
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "similarity_gap_suggest_failed",
      refId: id,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { ok: false, message: e instanceof Error ? e.message : "internal" },
      { status: 500 },
    );
  }
}
