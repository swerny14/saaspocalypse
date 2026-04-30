import { getSupabaseAdmin } from "./supabase";
import { wrapDbError } from "./errors";
import type { DescriptorSuggestion } from "@/lib/normalization/descriptor_suggestion_llm";

/**
 * DAL for the similarity_gaps queue. Admin-only. Pairs are stored canonical-
 * ordered (report_a_id < report_b_id) so the unique constraint dedupes
 * regardless of which side was the source when the gap was detected.
 */

export type SimilarityGapStatus = "open" | "applied" | "dismissed";

export type SimilarityGapRow = {
  id: string;
  report_a_id: string;
  report_b_id: string;
  text_similarity: number;
  engine_score: number;
  status: SimilarityGapStatus;
  /** DB column is text, narrowed elsewhere via `llm_payload` discriminant. */
  llm_action: string | null;
  llm_payload: DescriptorSuggestion | null;
  llm_note: string | null;
  llm_suggested_at: string | null;
  applied_at: string | null;
  dismissed_at: string | null;
  detected_at: string;
};

const SELECT_COLUMNS =
  "id, report_a_id, report_b_id, text_similarity, engine_score, status, llm_action, llm_payload, llm_note, llm_suggested_at, applied_at, dismissed_at, detected_at";

/**
 * Insert a batch of newly-detected gaps. Skips pairs that already have an
 * `applied`, `dismissed`, or `open` row — the unique (report_a_id,
 * report_b_id) constraint enforces dedupe at the DB level. We do an
 * `upsert` with `onConflict: 'report_a_id,report_b_id'` and `ignoreDuplicates`
 * so re-running detection is idempotent.
 */
export async function upsertGaps(
  gaps: Array<{
    report_a_id: string;
    report_b_id: string;
    text_similarity: number;
    engine_score: number;
  }>,
): Promise<{ inserted: number }> {
  if (gaps.length === 0) return { inserted: 0 };
  const admin = getSupabaseAdmin();
  const rows = gaps.map((g) => ({
    report_a_id: g.report_a_id,
    report_b_id: g.report_b_id,
    text_similarity: g.text_similarity,
    engine_score: g.engine_score,
  }));
  const { data, error } = await admin
    .from("similarity_gaps")
    .upsert(rows, { onConflict: "report_a_id,report_b_id", ignoreDuplicates: true })
    .select("id");
  if (error) throw wrapDbError(error, "similarity_gaps upsert");
  return { inserted: (data ?? []).length };
}

export async function getOpenGaps(limit = 200): Promise<SimilarityGapRow[]> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("similarity_gaps")
    .select(SELECT_COLUMNS)
    .eq("status", "open")
    .order("text_similarity", { ascending: false })
    .limit(limit);
  if (error) throw wrapDbError(error, "similarity_gaps list open");
  return (data ?? []) as SimilarityGapRow[];
}

export async function getGap(id: string): Promise<SimilarityGapRow | null> {
  const admin = getSupabaseAdmin();
  const { data, error } = await admin
    .from("similarity_gaps")
    .select(SELECT_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw wrapDbError(error, "similarity_gaps get");
  return (data as SimilarityGapRow | null) ?? null;
}

export async function persistSuggestion(
  id: string,
  suggestion: DescriptorSuggestion,
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("similarity_gaps")
    .update({
      llm_action: suggestion.kind,
      llm_payload: suggestion,
      llm_note: suggestion.reasoning,
      llm_suggested_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw wrapDbError(error, "similarity_gaps persistSuggestion");
}

export async function markApplied(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("similarity_gaps")
    .update({ status: "applied", applied_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw wrapDbError(error, "similarity_gaps markApplied");
}

export async function markDismissed(id: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("similarity_gaps")
    .update({ status: "dismissed", dismissed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw wrapDbError(error, "similarity_gaps markDismissed");
}
