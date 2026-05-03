import type { EngineContext } from "./engine";
import { DEFAULT_ENGINE_CONTEXT } from "./engine";

/**
 * Per-report projection slice needed for similarity scoring. Built from
 * `report_capabilities` + `report_attributes` rows; we deliberately omit
 * stack components — every B2B SaaS shares Stripe+Postgres+Vercel, so stack
 * overlap is high-overlap-but-no-signal noise that would surface "similar"
 * products built on the same infra rather than products that actually do
 * similar things.
 */
export type SimilarityCandidate = {
  report_id: string;
  capabilities: Set<string>;
  segment_slug: string | null;
  business_model_slug: string | null;
};

export type SimilarityResult = {
  score: number;
  shared_capabilities: string[];
  same_segment: boolean;
  same_business_model: boolean;
};

/** Below this final score, two reports aren't "similar enough" to surface.
 *  Calibrated against IDF-weighted Jaccard distributions on real corpus —
 *  raise it once the taxonomy fills in (more discriminating capabilities
 *  push the noise floor down naturally). */
export const MIN_SIMILARITY_SCORE = 0.1;

/** Below this many candidates, IDF is too noisy to trust. Fall back to the
 *  flat 1× / 1.5× moat-tag weighting — better than letting log((9/3)+1) etc.
 *  swing a single capability's weight to extremes. */
const MIN_CORPUS_FOR_IDF = 10;

const UNTAGGED_WEIGHT_FALLBACK = 1.0;
const DESCRIPTOR_FALLBACK_WEIGHT = 2.0;

/** Multiplier applied on top of IDF² weight for descriptor capabilities
 *  (those in `DESCRIPTOR_CAPABILITY_SLUGS`). Descriptors describe WHAT a
 *  product is (form builder, appointment booking, ai agent platform) and
 *  should outweigh shared infrastructure (gdpr-compliance, behavioral-data,
 *  automations) in "products like X" rankings. Without this boost, a pair
 *  sharing 3 mid-rare infrastructure caps can outrank a pair sharing the
 *  one descriptor that defines them as the same kind of product. */
const DESCRIPTOR_BOOST = 2.0;

/** Capability-weight lookup. The orchestrator (`scoreAllCandidates`) builds
 *  one of these once per call from the candidate corpus and threads it
 *  through. Pure function consumers can also build their own. */
export type CapabilityWeights = (slug: string) => number;

/**
 * Squared-IDF capability lookup over a corpus of candidates. Rare
 * capabilities (`marketplace`, `appointment-booking`, `payment-rails`)
 * get strongly amplified weight; common ones (`integrations`,
 * `user-data-storage`, `social-login`) get squashed toward zero.
 *
 * Formula: weight(slug) = ln((N+1)/(df+1))² . Range [0, ln(N+1)²].
 * - df = N (capability fires on every report): weight ≈ 0
 * - df = N/2: weight ≈ ln(2)² ≈ 0.48
 * - df = 1 (only one report has it): weight ≈ ln(N+1)² (high)
 *
 * Why squared, not linear IDF: linear IDF still let pairs that share
 * three generic caps (`user-data-storage` + `integrations` +
 * `social-login`) cluster around score 0.15 — close enough to real
 * twins (~0.27) to surface as false positives. Squaring widens the gap
 * because common caps now contribute near-zero in BOTH the intersection
 * and the union, while rare caps dominate both. Real-twin scores
 * compress less than noise scores; ratio improves ~2× → ~4×.
 *
 * Falls back to flat 1× / 1.5× moat-tag weighting when corpus < 10 — log
 * is unstable on tiny denominators.
 */
export function buildCorpusWeights(
  candidates: SimilarityCandidate[],
  ctx: EngineContext = DEFAULT_ENGINE_CONTEXT,
): CapabilityWeights {
  const descriptors = descriptorSet(ctx);
  const N = candidates.length;
  if (N < MIN_CORPUS_FOR_IDF) {
    return (slug: string) => {
      if (descriptors.has(slug)) return DESCRIPTOR_FALLBACK_WEIGHT;
      return UNTAGGED_WEIGHT_FALLBACK;
    };
  }
  const df = new Map<string, number>();
  for (const c of candidates) {
    for (const slug of c.capabilities) {
      df.set(slug, (df.get(slug) ?? 0) + 1);
    }
  }
  return (slug: string) => {
    const documentFreq = df.get(slug) ?? 1;
    const idf = Math.log((N + 1) / (documentFreq + 1));
    const baseWeight = idf * idf;
    return descriptors.has(slug) ? baseWeight * DESCRIPTOR_BOOST : baseWeight;
  };
}

/** Set of descriptor slugs derived from `ctx.capabilities`. Cached per
 *  ctx identity — recomputed only when the engine context changes (e.g.
 *  an admin tool fetched a fresh `loadEngineContextFromDb()`). */
const descriptorCache = new WeakMap<EngineContext, Set<string>>();
function descriptorSet(ctx: EngineContext): Set<string> {
  const cached = descriptorCache.get(ctx);
  if (cached) return cached;
  const set = new Set<string>();
  for (const cap of ctx.capabilities) {
    if (cap.is_descriptor) set.add(cap.slug);
  }
  descriptorCache.set(ctx, set);
  return set;
}

/**
 * Compute the score between two reports. Pure function; deterministic.
 *
 * Algorithm:
 *   1. Weighted Jaccard over capability sets, weighted by IDF over the
 *      provided corpus (rare capabilities matter more than common ones).
 *      Output ∈ [0,1].
 *   2. Multiply by a segment factor:
 *        - same segment:                              1.00
 *        - same business model (regardless segment):  0.85
 *        - segment OR business model unknown either side: 0.85
 *          (charitable — we don't penalize for missing taxonomy data)
 *        - both known and different on both axes:     0.70
 *
 *      Spread is intentionally tight (1.00 vs 0.70) so capability overlap
 *      drives ranking, not segment metadata. Earlier 0.4 floor caused
 *      segment-mismatched pairs to lose to less-similar segment-matched
 *      pairs even when capability overlap was 3× higher.
 *
 * Returns 0 (empty shared list) when either side has no capabilities —
 * a report we can't characterize shouldn't pollute neighbor lists.
 */
export function similarityScore(
  source: SimilarityCandidate,
  candidate: SimilarityCandidate,
  weights: CapabilityWeights,
): SimilarityResult {
  if (source.report_id === candidate.report_id) {
    return { score: 0, shared_capabilities: [], same_segment: false, same_business_model: false };
  }
  if (source.capabilities.size === 0 || candidate.capabilities.size === 0) {
    return { score: 0, shared_capabilities: [], same_segment: false, same_business_model: false };
  }

  let intersectionWeight = 0;
  const shared: string[] = [];
  for (const slug of source.capabilities) {
    if (candidate.capabilities.has(slug)) {
      intersectionWeight += weights(slug);
      shared.push(slug);
    }
  }
  if (intersectionWeight === 0) {
    return { score: 0, shared_capabilities: [], same_segment: false, same_business_model: false };
  }

  let unionWeight = 0;
  const seen = new Set<string>();
  for (const slug of source.capabilities) {
    seen.add(slug);
    unionWeight += weights(slug);
  }
  for (const slug of candidate.capabilities) {
    if (!seen.has(slug)) unionWeight += weights(slug);
  }

  const jaccard = intersectionWeight / unionWeight;

  const sameSegment =
    source.segment_slug !== null &&
    candidate.segment_slug !== null &&
    source.segment_slug === candidate.segment_slug;
  const sameBusinessModel =
    source.business_model_slug !== null &&
    candidate.business_model_slug !== null &&
    source.business_model_slug === candidate.business_model_slug;

  const segmentMissing =
    source.segment_slug === null ||
    candidate.segment_slug === null ||
    source.business_model_slug === null ||
    candidate.business_model_slug === null;

  let segmentFactor: number;
  if (sameSegment) segmentFactor = 1.0;
  else if (sameBusinessModel) segmentFactor = 0.85;
  else if (segmentMissing) segmentFactor = 0.85;
  else segmentFactor = 0.7;

  return {
    score: jaccard * segmentFactor,
    shared_capabilities: shared,
    same_segment: sameSegment,
    same_business_model: sameBusinessModel,
  };
}

/**
 * Score every candidate against `source` (excluding self). Builds a
 * corpus-aware IDF weight lookup once and threads it through every pair.
 * No threshold, no limit — useful for diagnostics that want to see the
 * full distribution of near-misses, not just the rows that cleared
 * `MIN_SIMILARITY_SCORE`. Stable ordering: descending score, then
 * ascending report_id for ties.
 */
export function scoreAllCandidates(
  source: SimilarityCandidate,
  candidates: SimilarityCandidate[],
  ctx: EngineContext = DEFAULT_ENGINE_CONTEXT,
): Array<{ candidate: SimilarityCandidate; result: SimilarityResult }> {
  const weights = buildCorpusWeights(candidates, ctx);
  const scored: Array<{ candidate: SimilarityCandidate; result: SimilarityResult }> = [];
  for (const c of candidates) {
    if (c.report_id === source.report_id) continue;
    scored.push({ candidate: c, result: similarityScore(source, c, weights) });
  }
  scored.sort((a, b) => {
    if (b.result.score !== a.result.score) return b.result.score - a.result.score;
    return a.candidate.report_id.localeCompare(b.candidate.report_id);
  });
  return scored;
}

/**
 * Rank candidates against `source`, return the top `limit` above
 * `MIN_SIMILARITY_SCORE`. Stable across ties (see `scoreAllCandidates`).
 */
export function rankSimilar(
  source: SimilarityCandidate,
  candidates: SimilarityCandidate[],
  limit: number,
  ctx: EngineContext = DEFAULT_ENGINE_CONTEXT,
): Array<{ candidate: SimilarityCandidate; result: SimilarityResult }> {
  return scoreAllCandidates(source, candidates, ctx)
    .filter((s) => s.result.score >= MIN_SIMILARITY_SCORE)
    .slice(0, limit);
}
