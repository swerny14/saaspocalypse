import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin/auth";
import {
  getOpenUnknowns,
  getUnknownSourceContexts,
  persistSuggestions,
  type SuggestionPatch,
} from "@/lib/db/normalization_unknowns";
import { suggestUnknowns, type Suggestion } from "@/lib/normalization/suggestion_llm";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Batch endpoint: collect every open unknown, attach source-report context,
 * call Claude once for the whole batch, persist suggestions onto the rows.
 *
 * Idempotent — re-running overwrites prior suggestions. Capped at 50
 * unknowns per request (Claude handles more, but we keep input manageable
 * and predictable on cost/latency). The admin UI exposes this as a single
 * "Suggest all" button.
 */
const BATCH_LIMIT = 50;

export async function POST() {
  if (!(await isAdmin())) {
    return NextResponse.json({ ok: false, reason: "unauthorized" }, { status: 401 });
  }

  let rows;
  try {
    rows = await getOpenUnknowns(BATCH_LIMIT);
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "admin_suggest_load_failed",
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }
  if (rows.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  let contexts: Awaited<ReturnType<typeof getUnknownSourceContexts>>;
  try {
    contexts = await getUnknownSourceContexts(
      rows.map((r) => ({ id: r.id, report_id: r.report_id })),
    );
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "admin_suggest_context_failed",
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  const result = await suggestUnknowns({
    unknowns: rows.map((r) => ({
      id: r.id,
      raw_term: r.raw_term,
      occurrences: r.occurrences,
      source_context: contexts[r.id],
    })),
  });

  if (result.kind === "error") {
    await logError({
      scope: "scan",
      reason: "admin_suggest_llm_failed",
      message: result.message,
    });
    return NextResponse.json({ ok: false, message: result.message }, { status: 502 });
  }

  const patches: SuggestionPatch[] = result.suggestions.map((s: Suggestion) => {
    if (s.action === "alias") {
      return {
        id: s.unknown_id,
        llm_action: "alias",
        llm_target_slug: s.target_slug,
        llm_note: s.note,
      };
    }
    if (s.action === "promote") {
      return {
        id: s.unknown_id,
        llm_action: "promote",
        llm_category: s.category,
        llm_commoditization: s.commoditization_level,
        llm_note: s.note,
      };
    }
    return {
      id: s.unknown_id,
      llm_action: "ignore",
      llm_note: s.note,
    };
  });

  try {
    await persistSuggestions(patches);
  } catch (e) {
    await logError({
      scope: "scan",
      reason: "admin_suggest_persist_failed",
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: patches.length });
}
