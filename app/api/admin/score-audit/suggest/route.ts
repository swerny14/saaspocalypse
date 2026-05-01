import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import { getReportBySlug } from "@/lib/db/reports";
import { computeScoreAudit } from "@/lib/normalization/score_audit";
import { suggestScoringPatterns } from "@/lib/normalization/scoring_audit_llm";
import { getCachedScoringConfig } from "@/lib/normalization/scoring_loader";
import {
  insertScoringPattern,
  logScoringAudit,
  type ScoringAxis,
  type PatternKind,
} from "@/lib/db/scoring_config";
import { loadEngineContextFromDb } from "@/lib/db/taxonomy_loader";

export const maxDuration = 60;

const Body = z.object({
  slug: z.string().min(1).max(200),
});

/**
 * Run the scoring-audit LLM on a single report. Persists each suggestion as
 * a disabled row in `scoring_patterns` tagged `added_by='llm:score_audit'`.
 * The drilldown's pattern table surfaces these inline; the curator must
 * explicitly enable a suggestion before it affects scoring.
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
  const report = await getReportBySlug(parsed.data.slug);
  if (!report) {
    return NextResponse.json({ error: "report not found" }, { status: 404 });
  }

  const config = await getCachedScoringConfig(true);
  const { context, capabilities } = await loadEngineContextFromDb();
  const audit = await computeScoreAudit(report, {
    config,
    context,
    catalog: capabilities,
  });

  const llm = await suggestScoringPatterns({
    report,
    moat: audit.score,
    breakdown: audit.breakdown,
    patterns: config.patterns,
  });

  if (llm.kind === "error") {
    return NextResponse.json(
      { error: `audit failed: ${llm.message}` },
      { status: 500 },
    );
  }

  let added = 0;
  const failures: string[] = [];
  for (const s of llm.suggestions) {
    try {
      const row = await insertScoringPattern({
        axis: s.axis as ScoringAxis,
        kind: s.kind as PatternKind,
        pattern: s.pattern,
        status: "disabled",
        evidence: s.evidence,
        added_by: "llm:score_audit",
      });
      added += 1;
      await logScoringAudit({
        actor: "llm:score_audit",
        scope: "pattern",
        change_kind: "add",
        axis: row.axis,
        ref_id: row.id,
        ref_key: report.slug,
        after_value: { kind: row.kind, pattern: row.pattern },
        reason: s.evidence,
      });
    } catch (e) {
      // Most likely cause: duplicate (axis, kind, pattern) row already exists.
      failures.push(s.pattern);
      console.warn("[score-audit/suggest] insert failed:", e);
    }
  }
  const skipped = llm.suggestions.length - added;
  const message =
    `${llm.summary} ` +
    (added > 0
      ? `Queued ${added} disabled pattern${added === 1 ? "" : "s"} for review. Enable the ones you want, then recompute.`
      : llm.suggestions.length === 0
        ? `No suggestions — current scoring looks honest.`
        : `Skipped ${skipped} (likely duplicates).`);

  return NextResponse.json({
    ok: true,
    message,
    summary: llm.summary,
    suggestions: llm.suggestions,
    added,
    skipped,
    failures,
  });
}
