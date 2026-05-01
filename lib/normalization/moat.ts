import { CAPABILITIES, type Capability, type MoatTag } from "./taxonomy";
import type { LLMVerdict, MoatAxis } from "@/lib/scanner/schema";
import type { ProjectedCapability } from "./engine";
import type { DistributionSignals } from "@/lib/scanner/distribution";
import {
  DEFAULT_SCORING_CONFIG,
  activeRegexes,
  weight as configWeight,
  type ScoringConfig,
} from "./scoring_defaults";

/**
 * Phase B — moat scoring engine. Pure deterministic functions over the per-
 * report projection + the verdict + the canonical taxonomy. Seven 0–10
 * axes; the aggregate is a weighted RMS. Stored in `report_moat_scores`;
 * the displayed `wedge_score` is the inverse of the aggregate
 * (`round((10 - aggregate) * 10)`).
 *
 * Phase 2.6 — calibration framework. Every regex / domain / weight that
 * was a code constant is now sourced from a `ScoringConfig`. Production
 * scans pass `getCachedScoringConfig()`; legacy callers that don't pass
 * one fall back to `DEFAULT_SCORING_CONFIG` (built from the defaults in
 * `scoring_defaults.ts`). Pure functions; no async, no I/O.
 *
 * Bump RUBRIC_VERSION when the scoring math itself changes. Pattern /
 * weight edits via the admin UI do NOT bump RUBRIC_VERSION — they're
 * data, not formula. The recompute script keys off rubric_version to
 * find structurally-stale rows; it doesn't need to re-read every row
 * after a pattern add.
 */

export const RUBRIC_VERSION = 13;

export type MoatScore = {
  rubric_version: number;
  capital: number;
  technical: number;
  network: number;
  switching: number;
  data_moat: number;
  regulatory: number;
  /** Distribution-axis score 0–10. Null when SERP collection failed. */
  distribution: number | null;
  aggregate: number;
};

/* ────────────────────────── breakdown shapes ────────────────────────── */

export type CapexHit = {
  surface:
    | "est_cost_line"
    | "est_cost_cost"
    | "take"
    | "take_sub"
    | "wedge_thesis"
    | "challenge_note";
  surface_index?: number;
  pattern: string;
  matched_text: string;
};

export type CapitalBreakdown = {
  capex_hits: CapexHit[];
  fortress_thesis_match:
    | { pattern: string; matched_text: string }
    | null;
  path:
    | "descriptive_total"
    | "fortress_thesis"
    | "heavy_capex"
    | "numeric";
  numeric_total: number | string;
};

export type TechnicalBreakdown = {
  nightmare_count: number;
  hard_count: number;
  medium_count: number;
  easy_count: number;
};

export type CapabilityAxisBreakdown = {
  capability_hits: Array<{ slug: string; tags: MoatTag[] }>;
  raw_count: number;
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

export type MoatBreakdown = {
  capital: CapitalBreakdown;
  technical: TechnicalBreakdown;
  network: CapabilityAxisBreakdown;
  switching: CapabilityAxisBreakdown;
  data_moat: CapabilityAxisBreakdown;
  regulatory: CapabilityAxisBreakdown;
  distribution: DistributionBreakdown;
};

export type MoatResult = { score: MoatScore; breakdown: MoatBreakdown };

/* ────────────────────────── capex helpers ────────────────────────── */

function findFirstMatch(text: string, regexes: RegExp[]): {
  pattern: string;
  matched_text: string;
} | null {
  for (const re of regexes) {
    const m = re.exec(text);
    if (m) {
      return { pattern: re.source, matched_text: m[0] };
    }
  }
  return null;
}

function isExcluded(text: string, excludes: RegExp[]): boolean {
  return excludes.some((re) => re.test(text));
}

/**
 * Count distinct capex patterns matching a single text surface, capped
 * per-surface so one verbose line can't dominate scoring. Returns the
 * matches themselves (for the breakdown) — caller computes the count via
 * `.length`.
 */
function collectCapexMatches(
  text: string,
  capexRegexes: RegExp[],
  excludeRegexes: RegExp[],
  surfaceCap: number,
): Array<{ pattern: string; matched_text: string }> {
  if (isExcluded(text, excludeRegexes)) return [];
  const out: Array<{ pattern: string; matched_text: string }> = [];
  for (const re of capexRegexes) {
    const m = re.exec(text);
    if (m) {
      out.push({ pattern: re.source, matched_text: m[0] });
      if (out.length >= surfaceCap) break;
    }
  }
  return out;
}

/* ─────────────────────────── per-axis scorers ─────────────────────────── */

/**
 * CAPITAL — what the incumbent had to invest to build the thing.
 * Scoring paths in priority order:
 *   1. Descriptive est_total ("more than your house") → anchor + capex hits
 *   2. FORTRESS-shaped wedge_thesis ("no door", "fortress-grade", etc.) → anchor + capex hits
 *   3. Heavy capex prose (capex hits ≥ heavy_capex_hits_min) → mid-anchor
 *   4. Numeric magnitude + light capex hits
 *
 * Counts capex matches across est_cost lines + take + take_sub +
 * wedge_thesis + challenge notes, capped per surface. Returns the score
 * AND the breakdown so the audit UI can show which patterns matched
 * which prose.
 */
function scoreCapitalWithBreakdown(
  verdict: LLMVerdict,
  config: ScoringConfig,
): { score: number; breakdown: CapitalBreakdown } {
  const capexRegexes = activeRegexes(config, "capital", "capex");
  const excludeRegexes = activeRegexes(config, "capital", "capex_exclude");
  const fortressRegexes = activeRegexes(config, "capital", "fortress_thesis");

  const surfaceCap = configWeight(config, "capital.surface_cap");
  const descriptiveAnchor = configWeight(config, "capital.descriptive_anchor");
  const fortressAnchor = configWeight(config, "capital.fortress_thesis_anchor");
  const heavyAnchor = configWeight(config, "capital.heavy_capex_anchor");
  const heavyMin = configWeight(config, "capital.heavy_capex_hits_min");
  const threshold100k = configWeight(config, "capital.numeric.threshold_100k");
  const tier100k = configWeight(config, "capital.numeric.tier_100k");
  const threshold10k = configWeight(config, "capital.numeric.threshold_10k");
  const tier10k = configWeight(config, "capital.numeric.tier_10k");
  const threshold1k = configWeight(config, "capital.numeric.threshold_1k");
  const tier1k = configWeight(config, "capital.numeric.tier_1k");

  const hits: CapexHit[] = [];

  verdict.est_cost.forEach((row, i) => {
    const lineMatches = collectCapexMatches(
      row.line,
      capexRegexes,
      excludeRegexes,
      surfaceCap,
    );
    for (const m of lineMatches) {
      hits.push({
        surface: "est_cost_line",
        surface_index: i,
        pattern: m.pattern,
        matched_text: m.matched_text,
      });
    }
    if (typeof row.cost === "string" && row.cost !== "???") {
      const costMatches = collectCapexMatches(
        row.cost,
        capexRegexes,
        excludeRegexes,
        surfaceCap,
      );
      for (const m of costMatches) {
        hits.push({
          surface: "est_cost_cost",
          surface_index: i,
          pattern: m.pattern,
          matched_text: m.matched_text,
        });
      }
    }
  });

  for (const surface of ["take", "take_sub", "wedge_thesis"] as const) {
    const text = verdict[surface];
    const matches = collectCapexMatches(
      text,
      capexRegexes,
      excludeRegexes,
      surfaceCap,
    );
    for (const m of matches) {
      hits.push({ surface, pattern: m.pattern, matched_text: m.matched_text });
    }
  }

  verdict.challenges.forEach((c, i) => {
    const matches = collectCapexMatches(
      c.note,
      capexRegexes,
      excludeRegexes,
      surfaceCap,
    );
    for (const m of matches) {
      hits.push({
        surface: "challenge_note",
        surface_index: i,
        pattern: m.pattern,
        matched_text: m.matched_text,
      });
    }
  });

  const capexHits = hits.length;
  const total = verdict.est_total;
  const totalIsDescriptive =
    typeof total === "string" &&
    !total.startsWith("$") &&
    total !== "usage-based";
  const fortressMatch = findFirstMatch(verdict.wedge_thesis, fortressRegexes);

  // Path resolution.
  let path: CapitalBreakdown["path"];
  let score: number;

  if (totalIsDescriptive) {
    path = "descriptive_total";
    score = clamp(descriptiveAnchor + Math.min(3, capexHits));
  } else if (fortressMatch) {
    path = "fortress_thesis";
    score = clamp(fortressAnchor + Math.min(3, capexHits));
  } else if (capexHits >= heavyMin) {
    path = "heavy_capex";
    score = clamp(heavyAnchor + Math.min(3, capexHits - heavyMin));
  } else {
    path = "numeric";
    let numericBoost = 0;
    if (typeof total === "number") {
      if (total >= threshold100k) numericBoost = tier100k;
      else if (total >= threshold10k) numericBoost = tier10k;
      else if (total >= threshold1k) numericBoost = tier1k;
    }
    score = clamp(capexHits * 2 + numericBoost);
  }

  return {
    score: roundTo1(score),
    breakdown: {
      capex_hits: hits,
      fortress_thesis_match: fortressMatch,
      path,
      numeric_total: total,
    },
  };
}

/**
 * TECHNICAL — depth of the incumbent's underlying engineering. Derived
 * from per-challenge difficulty distribution alone (the LLM no longer
 * emits a buildability score under the wedge frame).
 */
function scoreTechnicalWithBreakdown(
  verdict: LLMVerdict,
  config: ScoringConfig,
): { score: number; breakdown: TechnicalBreakdown } {
  const nightmareW = configWeight(config, "technical.nightmare_weight");
  const hardW = configWeight(config, "technical.hard_weight");
  const mediumW = configWeight(config, "technical.medium_weight");

  const breakdown: TechnicalBreakdown = {
    nightmare_count: 0,
    hard_count: 0,
    medium_count: 0,
    easy_count: 0,
  };
  let raw = 0;
  for (const c of verdict.challenges) {
    if (c.diff === "nightmare") {
      breakdown.nightmare_count += 1;
      raw += nightmareW;
    } else if (c.diff === "hard") {
      breakdown.hard_count += 1;
      raw += hardW;
    } else if (c.diff === "medium") {
      breakdown.medium_count += 1;
      raw += mediumW;
    } else {
      breakdown.easy_count += 1;
    }
  }
  return { score: roundTo1(clamp(raw)), breakdown };
}

const NETWORK_TAGS: MoatTag[] = ["multi_sided", "ugc", "marketplace", "viral_loop"];
const SWITCHING_TAGS: MoatTag[] = ["data_storage", "workflow_lock_in", "integration_hub"];
const DATA_TAGS: MoatTag[] = ["proprietary_dataset", "training_data", "behavioral"];
const REGULATORY_TAGS: MoatTag[] = ["hipaa", "finra", "gdpr_critical", "licensed"];

type TagAxis = "network" | "switching" | "data_moat" | "regulatory";

const AXIS_TAGS: Record<TagAxis, MoatTag[]> = {
  network: NETWORK_TAGS,
  switching: SWITCHING_TAGS,
  data_moat: DATA_TAGS,
  regulatory: REGULATORY_TAGS,
};

function collectAxisHits(
  matchedCapabilities: ProjectedCapability[],
  catalog: Capability[],
  axis: TagAxis,
): CapabilityAxisBreakdown {
  const tagsBySlug = new Map<string, MoatTag[]>();
  for (const c of catalog) tagsBySlug.set(c.slug, c.moat_tags);
  const wanted = new Set(AXIS_TAGS[axis]);
  const hits: Array<{ slug: string; tags: MoatTag[] }> = [];
  for (const cap of matchedCapabilities) {
    const tags = tagsBySlug.get(cap.capability_slug);
    if (!tags || tags.length === 0) continue;
    const matched = tags.filter((t) => wanted.has(t));
    if (matched.length > 0) {
      hits.push({ slug: cap.capability_slug, tags: matched });
    }
  }
  return { capability_hits: hits, raw_count: hits.length };
}

function scoreFromCount(count: number, multiplier: number): number {
  return clamp(count * multiplier);
}

/* ────────────────────────── distribution ────────────────────────── */

const SERP_CURVE = [0, 6, 8, 9, 9.5, 10];
const AUTHORITATIVE_CURVE = [0, 4, 6, 8, 9, 10];

function curvedSerpScore(count: number): number {
  if (count <= 0) return 0;
  if (count >= SERP_CURVE.length - 1) return SERP_CURVE[SERP_CURVE.length - 1];
  return SERP_CURVE[count];
}

function curvedAuthoritativeScore(count: number): number {
  if (count <= 0) return 0;
  if (count >= AUTHORITATIVE_CURVE.length - 1)
    return AUTHORITATIVE_CURVE[AUTHORITATIVE_CURVE.length - 1];
  return AUTHORITATIVE_CURVE[count];
}

function scoreDistributionWithBreakdown(
  signals: DistributionSignals,
  config: ScoringConfig,
): { score: number | null; breakdown: DistributionBreakdown } {
  if (signals.knowledge_graph_present === null) {
    return { score: null, breakdown: null };
  }
  const compressedOrganic =
    signals.organic_count !== null && signals.organic_count < 10;
  const authCountRaw = signals.authoritative_third_party_count ?? 0;
  const authCount = signals.top_organic_owned ? authCountRaw : 0;
  const ownCount = signals.serp_own_domain_count ?? 0;

  const subs: DistributionSubSignal[] = [
    {
      name: "has_sitelinks",
      raw_value: signals.has_sitelinks,
      weight: configWeight(config, "distribution.sub_weight.has_sitelinks"),
      score: signals.has_sitelinks ? 10 : 0,
    },
    {
      name: "compressed_organic",
      raw_value: signals.organic_count,
      weight: configWeight(config, "distribution.sub_weight.compressed_organic"),
      score: compressedOrganic ? 10 : 0,
    },
    {
      name: "authoritative_third_party_count",
      raw_value: authCount,
      weight: configWeight(
        config,
        "distribution.sub_weight.authoritative_third_party_count",
      ),
      score: curvedAuthoritativeScore(authCount),
    },
    {
      name: "knowledge_graph_present",
      raw_value: signals.knowledge_graph_present,
      weight: configWeight(
        config,
        "distribution.sub_weight.knowledge_graph_present",
      ),
      score: signals.knowledge_graph_present ? 10 : 0,
    },
    {
      name: "top_organic_owned",
      raw_value: signals.top_organic_owned,
      weight: configWeight(config, "distribution.sub_weight.top_organic_owned"),
      score: signals.top_organic_owned ? 10 : 0,
    },
    {
      name: "serp_own_domain_count",
      raw_value: ownCount,
      weight: configWeight(
        config,
        "distribution.sub_weight.serp_own_domain_count",
      ),
      score: curvedSerpScore(ownCount),
    },
  ];

  const totalWeight = subs.reduce((acc, s) => acc + s.weight, 0);
  const weighted = subs.reduce((acc, s) => acc + s.score * s.weight, 0);
  const score = totalWeight > 0 ? roundTo1(weighted / totalWeight) : 0;

  return {
    score,
    breakdown: {
      sub_signals: subs,
      total_weighted: weighted,
      total_weight: totalWeight,
    },
  };
}

/* ─────────────────────────── aggregate ─────────────────────────── */

function aggregate(
  parts: Omit<MoatScore, "rubric_version" | "aggregate">,
  config: ScoringConfig,
): number {
  const wCapital = configWeight(config, "aggregate.capital");
  const wTechnical = configWeight(config, "aggregate.technical");
  const wNetwork = configWeight(config, "aggregate.network");
  const wSwitching = configWeight(config, "aggregate.switching");
  const wData = configWeight(config, "aggregate.data_moat");
  const wRegulatory = configWeight(config, "aggregate.regulatory");
  const wDistribution = configWeight(config, "aggregate.distribution");

  let totalWeight =
    wCapital + wTechnical + wNetwork + wSwitching + wData + wRegulatory;
  let weightedSquares =
    parts.capital ** 2 * wCapital +
    parts.technical ** 2 * wTechnical +
    parts.network ** 2 * wNetwork +
    parts.switching ** 2 * wSwitching +
    parts.data_moat ** 2 * wData +
    parts.regulatory ** 2 * wRegulatory;
  if (parts.distribution !== null) {
    weightedSquares += parts.distribution ** 2 * wDistribution;
    totalWeight += wDistribution;
  }
  return roundTo1(Math.sqrt(weightedSquares / totalWeight));
}

/* ────────────────────────── entry points ────────────────────────── */

export type MoatInput = {
  /** The LLM-emitted verdict slice — drives capital + technical via prose. */
  verdict: LLMVerdict;
  capabilities: ProjectedCapability[];
  /** Distribution signals collected during the scan. Optional: when omitted,
   *  the distribution axis is null and is excluded from the aggregate. */
  distribution?: DistributionSignals | null;
  /** Optional capability catalog for moat-tag lookup. Defaults to the
   *  TS-bundled CAPABILITIES. Pass DB-fresh rows from admin recompute. */
  catalog?: Capability[];
  /** Optional scoring config. Defaults to DEFAULT_SCORING_CONFIG. Pass a
   *  fresh DB-loaded config from admin recompute or production scans
   *  via `getCachedScoringConfig()`. */
  config?: ScoringConfig;
};

/**
 * Score the moat. Pure function. Production scans call this with a
 * config loaded via `getCachedScoringConfig()`; legacy callers without
 * a config get the in-code defaults.
 */
export function scoreMoat(input: MoatInput): MoatScore {
  return scoreMoatWithBreakdown(input).score;
}

/**
 * Same as `scoreMoat` but also returns a breakdown of which patterns /
 * capabilities / sub-signals contributed. Drives the `/admin/score-audit`
 * "what fired" surface.
 */
export function scoreMoatWithBreakdown(input: MoatInput): MoatResult {
  const config = input.config ?? DEFAULT_SCORING_CONFIG;
  const catalog = input.catalog ?? CAPABILITIES;
  const multiplier = configWeight(config, "capability.hit_multiplier");

  const cap = scoreCapitalWithBreakdown(input.verdict, config);
  const tech = scoreTechnicalWithBreakdown(input.verdict, config);
  const network = collectAxisHits(input.capabilities, catalog, "network");
  const switching = collectAxisHits(input.capabilities, catalog, "switching");
  const dataMoat = collectAxisHits(input.capabilities, catalog, "data_moat");
  const regulatory = collectAxisHits(input.capabilities, catalog, "regulatory");
  const dist = input.distribution
    ? scoreDistributionWithBreakdown(input.distribution, config)
    : { score: null, breakdown: null };

  const networkScore = roundTo1(scoreFromCount(network.raw_count, multiplier));
  const switchingScore = roundTo1(scoreFromCount(switching.raw_count, multiplier));
  const dataMoatScore = roundTo1(scoreFromCount(dataMoat.raw_count, multiplier));
  const regulatoryScore = roundTo1(scoreFromCount(regulatory.raw_count, multiplier));

  const agg = aggregate(
    {
      capital: cap.score,
      technical: tech.score,
      network: networkScore,
      switching: switchingScore,
      data_moat: dataMoatScore,
      regulatory: regulatoryScore,
      distribution: dist.score,
    },
    config,
  );

  return {
    score: {
      rubric_version: RUBRIC_VERSION,
      capital: cap.score,
      technical: tech.score,
      network: networkScore,
      switching: switchingScore,
      data_moat: dataMoatScore,
      regulatory: regulatoryScore,
      distribution: dist.score,
      aggregate: agg,
    },
    breakdown: {
      capital: cap.breakdown,
      technical: tech.breakdown,
      network,
      switching,
      data_moat: dataMoat,
      regulatory,
      distribution: dist.breakdown,
    },
  };
}

/* ────────────────────────── derived helpers ────────────────────────── */

const SCORABLE_AXES: MoatAxis[] = [
  "capital",
  "technical",
  "network",
  "switching",
  "data_moat",
  "regulatory",
  "distribution",
];

/**
 * Lowest-scoring axis on the moat — the wedge's most attackable surface.
 * Drives the headline callout on `/r/[slug]` and keys the wedge guide LLM
 * prompt. Tie-breaks deterministically by SCORABLE_AXES order.
 */
export function weakestAxis(score: MoatScore): MoatAxis | null {
  let best: MoatAxis | null = null;
  let bestVal = Number.POSITIVE_INFINITY;
  for (const axis of SCORABLE_AXES) {
    const v = score[axis];
    if (typeof v !== "number") continue;
    if (v < bestVal) {
      best = axis;
      bestVal = v;
    }
  }
  return best;
}

/* ─────────────────────────── helpers ─────────────────────────── */

function clamp(n: number, min = 0, max = 10): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function roundTo1(n: number): number {
  return Math.round(n * 10) / 10;
}
