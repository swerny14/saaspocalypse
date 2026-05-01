import { getSupabaseAdmin } from "./supabase";
import { wrapDbError } from "./errors";
import type {
  AxisBand,
  ScoreExpectation,
  ScoreExpectationFlag,
} from "@/lib/normalization/score_expectation_llm";
import type { MoatAxis } from "@/lib/scanner/schema";

export type StoredScoreExpectation = ScoreExpectation & {
  report_id: string;
  generated_at: string;
};

type Row = {
  report_id: string;
  rubric_version: number;
  verdict_hash: string;
  bands: Record<MoatAxis, AxisBand>;
  rationale: Partial<Record<MoatAxis, string>>;
  flags: ScoreExpectationFlag[];
  generated_at: string;
};

function isMissingTable(error: { code?: string; message?: string }): boolean {
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    (error.message ?? "").includes("report_score_expectations")
  );
}

export async function getScoreExpectationMap(
  reportIds: string[],
): Promise<Map<string, StoredScoreExpectation>> {
  const out = new Map<string, StoredScoreExpectation>();
  if (reportIds.length === 0) return out;

  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("report_score_expectations")
    .select("report_id,rubric_version,verdict_hash,bands,rationale,flags,generated_at")
    .in("report_id", reportIds);

  if (error) {
    if (isMissingTable(error)) return out;
    throw wrapDbError(error, "report_score_expectations select");
  }

  for (const row of (data ?? []) as Row[]) {
    out.set(row.report_id, row);
  }
  return out;
}

export async function upsertScoreExpectation(
  reportId: string,
  expectation: ScoreExpectation,
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.from("report_score_expectations").upsert(
    {
      report_id: reportId,
      rubric_version: expectation.rubric_version,
      verdict_hash: expectation.verdict_hash,
      bands: expectation.bands,
      rationale: expectation.rationale,
      flags: expectation.flags,
      generated_at: new Date().toISOString(),
    },
    { onConflict: "report_id" },
  );
  if (error) throw wrapDbError(error, "report_score_expectations upsert");
}
