import type { StoredReport } from "@/lib/db/reports";
import type { StoredMoatScore } from "@/lib/db/moat_scores";

/**
 * Detect reports whose moat score doesn't fit their wedge tier in obvious
 * ways. Pure heuristics; no LLM. The rules are intentionally conservative —
 * false positives here are cheap (admin reviews + dismisses), but a noisy
 * queue defeats the purpose of having a queue at all.
 *
 * The heuristics encode the same gut-check we used to spot Stripe at 6.8:
 *   - FORTRESS tier with low aggregate ⇒ probably missing capabilities
 *   - SOFT tier with high aggregate ⇒ probably over-firing capabilities
 *   - Specialist moats are real (a 10/10/0/0/0/10 is honest), but a single
 *     zero-axis next to two ≥ 7 neighbors is usually a coverage gap, not
 *     a structural absence.
 */

export type AnomalyReason =
  | "low_fortress_tier"
  | "high_soft_tier"
  | "isolated_zero_axis"
  | "fortress_tier_no_strong_axis";

export type AnomalyAxis =
  | "capital"
  | "technical"
  | "network"
  | "switching"
  | "data_moat"
  | "regulatory";

export type Anomaly = {
  reason: AnomalyReason;
  /** Plain-English explanation suitable for the admin UI. */
  explanation: string;
  /** Axes whose scores triggered the rule (empty for whole-report rules). */
  axes: AnomalyAxis[];
};

export type FlaggedReport = {
  report: StoredReport;
  moat: StoredMoatScore;
  anomalies: Anomaly[];
};

const ALL_AXES: AnomalyAxis[] = [
  "capital",
  "technical",
  "network",
  "switching",
  "data_moat",
  "regulatory",
];

function axisValue(moat: StoredMoatScore, axis: AnomalyAxis): number {
  return moat[axis];
}

export function detectAnomalies(reports: StoredReport[]): FlaggedReport[] {
  const out: FlaggedReport[] = [];

  for (const r of reports) {
    if (!r.moat) continue;
    const moat = r.moat;
    const found: Anomaly[] = [];

    // Rule 1: FORTRESS tier with weak aggregate. The LLM said "this is
    // structurally hard to build," so the moat should also be high.
    if (r.tier === "FORTRESS" && moat.aggregate < 5) {
      found.push({
        reason: "low_fortress_tier",
        explanation: `FORTRESS-tier report (wedge score ${r.wedge_score}) but moat aggregate is only ${moat.aggregate.toFixed(1)} — usually means moat-bearing capabilities aren't matching the verdict text.`,
        axes: [],
      });
    }

    // Rule 2: SOFT tier with surprisingly high aggregate. The wedge score
    // and the moat are now mathematically linked (wedge = (10 - agg) * 10),
    // so this rule only fires when the score-bucket math is off — which
    // shouldn't happen post-Phase-2.5. Kept for legacy / hand-edited rows.
    if (r.tier === "SOFT" && moat.aggregate > 5) {
      found.push({
        reason: "high_soft_tier",
        explanation: `SOFT-tier report (wedge score ${r.wedge_score}) but moat aggregate is ${moat.aggregate.toFixed(1)} — wedge_score / tier / moat aggregate disagree.`,
        axes: [],
      });
    }

    // Rule 3: Isolated zero-axis. Specialist moats are real (capital +
    // technical + regulatory all maxed with three legitimate zeros), but
    // a SINGLE zero amid ≥ 2 neighbors at ≥ 7 is usually a coverage gap.
    const strongCount = ALL_AXES.filter((a) => axisValue(moat, a) >= 7).length;
    const zeros = ALL_AXES.filter((a) => axisValue(moat, a) === 0);
    if (strongCount >= 2 && zeros.length === 1) {
      found.push({
        reason: "isolated_zero_axis",
        explanation: `One axis at 0.0 surrounded by ${strongCount} axes ≥ 7 — usually means the right capabilities exist but the patterns don't match this verdict's phrasing.`,
        axes: zeros,
      });
    }

    // Rule 4: FORTRESS tier with no axis hitting high. The structural moat
    // exists somewhere — we just haven't found it.
    if (r.tier === "FORTRESS" && strongCount === 0) {
      found.push({
        reason: "fortress_tier_no_strong_axis",
        explanation: `FORTRESS-tier report with zero axes ≥ 7 — the report says structurally hard, but no moat axis is registering it.`,
        axes: [],
      });
    }

    if (found.length > 0) {
      out.push({ report: r, moat, anomalies: found });
    }
  }

  // Most-misaligned-first: bigger gap between tier expectation and aggregate
  // surfaces first. FORTRESS-tier mismatches are the most actionable.
  out.sort((a, b) => {
    const score = (f: FlaggedReport): number => {
      const tier = f.report.tier;
      const agg = f.moat.aggregate;
      if (tier === "FORTRESS") return 10 - agg;
      if (tier === "SOFT") return agg;
      return 0;
    };
    return score(b) - score(a);
  });

  return out;
}
