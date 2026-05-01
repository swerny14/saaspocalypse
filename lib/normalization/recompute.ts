import type { StoredReport } from "@/lib/db/reports";
import { updateReportWedgeFields } from "@/lib/db/reports";
import {
  loadDistributionSignals,
  persistProjection,
} from "@/lib/db/projections";
import { persistMoatScore } from "@/lib/db/moat_scores";
import { projectReport, type EngineContext } from "./engine";
import { scoreMoat, weakestAxis, type MoatScore } from "./moat";
import {
  tierFromWedgeScore,
  wedgeScoreFromAggregate,
  type Tier,
  type VerdictReport,
} from "@/lib/scanner/schema";
import type { ScoringConfig } from "./scoring_defaults";
import type { Capability } from "./taxonomy";

export type RecomputeReportScoringOptions = {
  context?: EngineContext;
  catalog?: Capability[];
  config?: ScoringConfig;
};

export type RecomputeReportScoringResult = {
  moat: MoatScore;
  capability_count: number;
  before: {
    tier: Tier;
    wedge_score: number;
    weakest_moat_axis: VerdictReport["weakest_moat_axis"];
  };
  after: {
    tier: Tier;
    wedge_score: number;
    weakest_moat_axis: VerdictReport["weakest_moat_axis"];
  };
};

/**
 * Canonical recompute path for score-bearing rows.
 *
 * Keeps the public report fields (`wedge_score`, `tier`,
 * `weakest_moat_axis`) in lockstep with the persisted moat aggregate.
 * Every admin/script recompute should come through this helper so
 * distribution signals, calibration config, and wedge derivation cannot
 * drift across call sites.
 */
export async function recomputeReportScoring(
  report: StoredReport,
  options: RecomputeReportScoringOptions = {},
): Promise<RecomputeReportScoringResult> {
  const projection = projectReport(
    report,
    report.detected_stack,
    options.context,
  );
  await persistProjection(report.id, projection);

  const distribution = await loadDistributionSignals(report.id);
  const moat = scoreMoat({
    verdict: report,
    capabilities: projection.capabilities,
    distribution,
    catalog: options.catalog,
    config: options.config,
  });
  await persistMoatScore(report.id, moat);

  const wedgeScore = wedgeScoreFromAggregate(moat.aggregate);
  const tier = tierFromWedgeScore(wedgeScore);
  const weakest = weakestAxis(moat);
  await updateReportWedgeFields(report.id, {
    wedge_score: wedgeScore,
    tier,
    weakest_moat_axis: weakest,
  });

  return {
    moat,
    capability_count: projection.capabilities.length,
    before: {
      tier: report.tier,
      wedge_score: report.wedge_score,
      weakest_moat_axis: report.weakest_moat_axis,
    },
    after: {
      tier,
      wedge_score: wedgeScore,
      weakest_moat_axis: weakest,
    },
  };
}
