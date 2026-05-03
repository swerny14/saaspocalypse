import { getSupabaseAdmin } from "./supabase";
import { wrapDbError } from "./errors";
import type { MoatScore } from "@/lib/normalization/moat";
import type { MoatJudgment } from "@/lib/normalization/moat_llm";

export async function persistMoatScore(
  reportId: string,
  score: MoatScore,
  judgment: MoatJudgment | null = null,
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
        score_judgment: judgment,
        computed_at: new Date().toISOString(),
      },
      { onConflict: "report_id" },
    );
  if (error) throw wrapDbError(error, "report_moat_scores upsert");
}

export type MoatReviewStatus = "pending" | "verified";

export type StoredMoatScore = MoatScore & {
  computed_at: string;
  review_status: MoatReviewStatus;
  reviewed_at: string | null;
  score_judgment: MoatJudgment | null;
};

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
