import type { ComparePair, CompareSide } from "@/lib/db/compare";
import { CAPABILITIES, STACK_COMPONENTS } from "@/lib/normalization/taxonomy";

/**
 * Pure compute over a `ComparePair`. No DB, no LLM. Powers every section of
 * the head-to-head page. Stable orderings (descriptor-first, then
 * alphabetical) so the same pair always renders identically — important for
 * ISR cache hits.
 *
 * Convention: deltas are signed `b - a`. Positive `score_delta` means B is
 * easier to clone than A; positive `cost_delta` means B's monthly floor is
 * higher.
 */

export type CapabilityBucket = {
  /** Slugs in stable display order. */
  shared: string[];
  a_only: string[];
  b_only: string[];
};

export type ComponentBucket = {
  shared: string[];
  a_only: string[];
  b_only: string[];
};

export type MoatAxisDiff = {
  axis: "capital" | "technical" | "network" | "switching" | "data_moat" | "regulatory" | "aggregate";
  a: number | null;
  b: number | null;
  /** b - a; null when either side is missing a moat score. */
  delta: number | null;
};

export type CompareDiff = {
  score_delta: number;
  /** b - a in dollars; null when either side has no monthly_floor_usd
   *  (usage-based or unknown). */
  cost_delta: number | null;
  capability_diff: CapabilityBucket;
  /** Filtered to commoditization_level <= 3 by default — drops Postgres,
   *  Stripe, Vercel et al. that everyone uses. UI offers a "show all" toggle
   *  that re-runs against the full set via `componentDiffAll`. */
  stack_diff: ComponentBucket;
  /** Same shape, no commoditization filter. */
  stack_diff_all: ComponentBucket;
  /** 6 axes + aggregate. Aggregate is last so the UI can pull it out
   *  separately as a hero number. */
  moat_diff: MoatAxisDiff[];
  tier_match: boolean;
};

const DESCRIPTOR_SLUGS = new Set(
  CAPABILITIES.filter((c) => c.is_descriptor).map((c) => c.slug),
);

const COMMODITIZATION_BY_SLUG = new Map(
  STACK_COMPONENTS.map((c) => [c.slug, c.commoditization_level]),
);

/** Hide components at this level or above from the default stack diff —
 *  Postgres+Stripe+Vercel are noise in a head-to-head. UI can opt back in. */
const COMMODITIZATION_HIDE_AT = 4;

const MOAT_AXES: MoatAxisDiff["axis"][] = [
  "capital",
  "technical",
  "network",
  "switching",
  "data_moat",
  "regulatory",
  "aggregate",
];

export function diffPair(pair: ComparePair): CompareDiff {
  const { a, b } = pair;

  const capDiff = bucketCapabilities(a, b);
  const stackDiffAll = bucketComponents(a, b, () => true);
  const stackDiff = bucketComponents(
    a,
    b,
    (slug) => (COMMODITIZATION_BY_SLUG.get(slug) ?? 0) < COMMODITIZATION_HIDE_AT,
  );

  const moatDiff: MoatAxisDiff[] = MOAT_AXES.map((axis) => {
    const av = a.report.moat ? a.report.moat[axis] : null;
    const bv = b.report.moat ? b.report.moat[axis] : null;
    const delta = av != null && bv != null ? bv - av : null;
    return { axis, a: av, b: bv, delta };
  });

  const cost_delta =
    a.monthly_floor_usd != null && b.monthly_floor_usd != null
      ? b.monthly_floor_usd - a.monthly_floor_usd
      : null;

  return {
    score_delta: b.report.score - a.report.score,
    cost_delta,
    capability_diff: capDiff,
    stack_diff: stackDiff,
    stack_diff_all: stackDiffAll,
    moat_diff: moatDiff,
    tier_match: a.report.tier === b.report.tier,
  };
}

function bucketCapabilities(a: CompareSide, b: CompareSide): CapabilityBucket {
  const aSet = a.projection?.capabilities ?? new Set<string>();
  const bSet = b.projection?.capabilities ?? new Set<string>();

  const shared: string[] = [];
  const a_only: string[] = [];
  const b_only: string[] = [];
  for (const slug of aSet) {
    if (bSet.has(slug)) shared.push(slug);
    else a_only.push(slug);
  }
  for (const slug of bSet) {
    if (!aSet.has(slug)) b_only.push(slug);
  }
  return {
    shared: shared.sort(descriptorThenAlpha),
    a_only: a_only.sort(descriptorThenAlpha),
    b_only: b_only.sort(descriptorThenAlpha),
  };
}

function bucketComponents(
  a: CompareSide,
  b: CompareSide,
  keep: (slug: string) => boolean,
): ComponentBucket {
  const aSet = new Set(a.components.map((c) => c.component_slug).filter(keep));
  const bSet = new Set(b.components.map((c) => c.component_slug).filter(keep));
  const shared: string[] = [];
  const a_only: string[] = [];
  const b_only: string[] = [];
  for (const slug of aSet) {
    if (bSet.has(slug)) shared.push(slug);
    else a_only.push(slug);
  }
  for (const slug of bSet) {
    if (!aSet.has(slug)) b_only.push(slug);
  }
  shared.sort();
  a_only.sort();
  b_only.sort();
  return { shared, a_only, b_only };
}

function descriptorThenAlpha(x: string, y: string): number {
  const xd = DESCRIPTOR_SLUGS.has(x);
  const yd = DESCRIPTOR_SLUGS.has(y);
  if (xd !== yd) return xd ? -1 : 1;
  return x.localeCompare(y);
}
