import type { StoredReport } from "@/lib/db/reports";
import type { Capability } from "./taxonomy";
import { loadDistributionSignals } from "@/lib/db/projections";
import { projectReport, type EngineContext } from "./engine";
import {
  scoreMoatWithBreakdown,
  type MoatResult,
} from "./moat";
import { getCachedScoringConfig } from "./scoring_loader";
import type { ScoringConfig } from "./scoring_defaults";

/**
 * Compute a fresh score + breakdown for a single report. Loads projection
 * capabilities (re-derived in-memory from the verdict so it always reflects
 * the current taxonomy) and previously-collected distribution signals.
 *
 * Used by the score-audit drilldown page. Pure read — does not persist.
 *
 * Pass `config` from the caller (admin paths use `getCachedScoringConfig
 * (true)` for fresh DB read; defaults are fine for ad-hoc tools).
 */
export async function computeScoreAudit(
  report: StoredReport,
  options?: {
    config?: ScoringConfig;
    catalog?: Capability[];
    context?: EngineContext;
  },
): Promise<MoatResult> {
  const config = options?.config ?? (await getCachedScoringConfig(true));
  const projection = projectReport(
    report,
    report.detected_stack,
    options?.context,
  );
  const distribution = await loadDistributionSignals(report.id);
  return scoreMoatWithBreakdown({
    verdict: report,
    capabilities: projection.capabilities,
    distribution,
    catalog: options?.catalog,
    config,
  });
}
