import type { DistributionSignals } from "@/lib/scanner/distribution";
import type { MoatAxis } from "@/lib/scanner/schema";

export const RUBRIC_VERSION = 15;

export type MoatScore = {
  rubric_version: number;
  capital: number;
  technical: number;
  network: number;
  switching: number;
  data_moat: number;
  regulatory: number;
  distribution: number | null;
  aggregate: number;
};

export type DistributionSubSignal = {
  name: string;
  raw_value: unknown;
  weight: number;
  score: number;
};

export type DistributionBreakdown = {
  sub_signals: DistributionSubSignal[];
  total_weighted: number;
  total_weight: number;
} | null;

const DISTRIBUTION_WEIGHTS = {
  has_sitelinks: 4,
  compressed_organic: 3,
  authoritative_third_party_count: 3,
  knowledge_graph_present: 2,
  top_organic_owned: 2,
  serp_own_domain_count: 1,
} as const;

const SERP_CURVE = [0, 6, 8, 9, 9.5, 10];
const AUTHORITATIVE_CURVE = [0, 4, 6, 8, 9, 10];

function roundTo1(n: number): number {
  return Math.round(n * 10) / 10;
}

function curve(count: number, values: readonly number[]): number {
  if (count <= 0) return 0;
  if (count >= values.length - 1) return values[values.length - 1];
  return values[count];
}

export function scoreDistributionWithBreakdown(
  signals: DistributionSignals | null | undefined,
): { score: number | null; breakdown: DistributionBreakdown } {
  if (!signals || signals.knowledge_graph_present === null) {
    return { score: null, breakdown: null };
  }

  const compressedOrganic =
    signals.organic_count !== null && signals.organic_count < 10;
  const authCount = signals.top_organic_owned
    ? signals.authoritative_third_party_count ?? 0
    : 0;
  const ownCount = signals.serp_own_domain_count ?? 0;

  const subSignals: DistributionSubSignal[] = [
    {
      name: "has_sitelinks",
      raw_value: signals.has_sitelinks,
      weight: DISTRIBUTION_WEIGHTS.has_sitelinks,
      score: signals.has_sitelinks ? 10 : 0,
    },
    {
      name: "compressed_organic",
      raw_value: signals.organic_count,
      weight: DISTRIBUTION_WEIGHTS.compressed_organic,
      score: compressedOrganic ? 10 : 0,
    },
    {
      name: "authoritative_third_party_count",
      raw_value: authCount,
      weight: DISTRIBUTION_WEIGHTS.authoritative_third_party_count,
      score: curve(authCount, AUTHORITATIVE_CURVE),
    },
    {
      name: "knowledge_graph_present",
      raw_value: signals.knowledge_graph_present,
      weight: DISTRIBUTION_WEIGHTS.knowledge_graph_present,
      score: signals.knowledge_graph_present ? 10 : 0,
    },
    {
      name: "top_organic_owned",
      raw_value: signals.top_organic_owned,
      weight: DISTRIBUTION_WEIGHTS.top_organic_owned,
      score: signals.top_organic_owned ? 10 : 0,
    },
    {
      name: "serp_own_domain_count",
      raw_value: ownCount,
      weight: DISTRIBUTION_WEIGHTS.serp_own_domain_count,
      score: curve(ownCount, SERP_CURVE),
    },
  ];

  const totalWeight = subSignals.reduce((sum, s) => sum + s.weight, 0);
  const totalWeighted = subSignals.reduce((sum, s) => sum + s.score * s.weight, 0);

  return {
    score: totalWeight > 0 ? roundTo1(totalWeighted / totalWeight) : 0,
    breakdown: {
      sub_signals: subSignals,
      total_weighted: totalWeighted,
      total_weight: totalWeight,
    },
  };
}

export function aggregateMoatScore(
  parts: Omit<MoatScore, "rubric_version" | "aggregate">,
): number {
  const values = [
    parts.capital,
    parts.technical,
    parts.network,
    parts.switching,
    parts.data_moat,
    parts.regulatory,
    parts.distribution,
  ].filter((v): v is number => typeof v === "number");

  if (values.length === 0) return 0;
  const meanSquare =
    values.reduce((sum, value) => sum + value ** 2, 0) / values.length;
  return roundTo1(Math.sqrt(meanSquare));
}

const SCORABLE_AXES: MoatAxis[] = [
  "capital",
  "technical",
  "network",
  "switching",
  "data_moat",
  "regulatory",
  "distribution",
];

const WEDGE_TIEBREAK: MoatAxis[] = [
  "distribution",
  "switching",
  "technical",
  "capital",
  "data_moat",
  "regulatory",
  "network",
];

export function weakestAxis(score: MoatScore): MoatAxis | null {
  let bestVal = Number.POSITIVE_INFINITY;
  for (const axis of SCORABLE_AXES) {
    const value = score[axis];
    if (typeof value !== "number") continue;
    if (value < bestVal) bestVal = value;
  }
  if (bestVal === Number.POSITIVE_INFINITY) return null;
  return WEDGE_TIEBREAK.find((axis) => score[axis] === bestVal) ?? null;
}
