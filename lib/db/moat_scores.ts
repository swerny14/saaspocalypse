import { getSupabaseAdmin } from "./supabase";
import { wrapDbError } from "./errors";
import type { MoatScore } from "@/lib/normalization/moat";
import type { MoatAuditSuggestion } from "@/lib/normalization/moat_audit_llm";

/**
 * Persist a moat score row, replacing any prior row for this report.
 * Idempotent — both `runScan` (first-time write) and the recompute script
 * (rebuild) call this. Admin-only; the row is server-authored.
 *
 * Clears any persisted audit suggestions, since the audit was generated
 * against the previous score + capability matches; once the score moves,
 * the suggestions are stale.
 */
export async function persistMoatScore(
  reportId: string,
  score: MoatScore,
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("report_moat_scores")
    .upsert(
      {
        report_id: reportId,
        rubric_version: score.rubric_version,
        capital: score.capital,
        technical: score.technical,
        network: score.network,
        switching: score.switching,
        data_moat: score.data_moat,
        regulatory: score.regulatory,
        distribution: score.distribution,
        aggregate: score.aggregate,
        computed_at: new Date().toISOString(),
        audit_summary: null,
        audit_suggestions: null,
        audited_at: null,
      },
      { onConflict: "report_id" },
    );
  if (error) throw wrapDbError(error, "report_moat_scores upsert");
}

export type MoatReviewStatus = "pending" | "verified";

/**
 * Stored representation — same shape as `MoatScore` plus the timestamp +
 * curator review state. `review_status` is sticky across recomputes; once
 * a curator marks a score as `verified` it stays out of the anomaly UI
 * until they manually flip it back. Used by `getReportBySlug` and similar
 * read paths to attach the score onto the StoredReport object.
 */
export type StoredMoatScore = MoatScore & {
  computed_at: string;
  review_status: MoatReviewStatus;
  reviewed_at: string | null;
  /** Persisted LLM audit summary (1–2 sentence moat shape). Null until an
   *  audit has been run against this row's current score. Cleared on
   *  recompute since the score it was generated against is gone. */
  audit_summary: string | null;
  /** Persisted LLM audit suggestions (add_pattern / new_capability items).
   *  Null until an audit has run; empty array means "audit ran, found
   *  nothing to suggest." */
  audit_suggestions: MoatAuditSuggestion[] | null;
  audited_at: string | null;
};

/**
 * Mark a moat score as verified (or pending). Sticky — does not auto-reset
 * when scores recompute. Curator can re-verify after material taxonomy
 * changes if desired.
 */
export async function setMoatReviewStatus(
  reportId: string,
  status: MoatReviewStatus,
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("report_moat_scores")
    .update({
      review_status: status,
      reviewed_at: status === "verified" ? new Date().toISOString() : null,
    })
    .eq("report_id", reportId);
  if (error) throw wrapDbError(error, "report_moat_scores setReviewStatus");
}

/**
 * Persist an LLM moat-audit result onto an existing score row. Called by
 * both the per-row audit endpoint and the bulk-audit endpoint. Empty
 * `suggestions` is a meaningful state ("audit ran, no suggestions") and is
 * stored as `[]`, not null.
 */
export async function persistMoatAudit(
  reportId: string,
  audit: { summary: string; suggestions: MoatAuditSuggestion[] },
): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin
    .from("report_moat_scores")
    .update({
      audit_summary: audit.summary,
      audit_suggestions: audit.suggestions,
      audited_at: new Date().toISOString(),
    })
    .eq("report_id", reportId);
  if (error) throw wrapDbError(error, "report_moat_scores persistMoatAudit");
}
