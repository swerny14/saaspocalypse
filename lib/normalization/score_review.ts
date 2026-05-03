import type { StoredReport } from "@/lib/db/reports";
import { loadDistributionSignals } from "@/lib/db/projections";
import { scoreDistributionWithBreakdown, type DistributionBreakdown } from "./moat";

export type ScoreReviewResult = {
  breakdown: {
    distribution: DistributionBreakdown;
  };
};

export async function computeScoreReview(
  report: StoredReport,
): Promise<ScoreReviewResult> {
  const distribution = await loadDistributionSignals(report.id);
  return {
    breakdown: {
      distribution: scoreDistributionWithBreakdown(distribution).breakdown,
    },
  };
}
