/**
 * Default scoring configuration. The DB-driven calibration framework
 * (scoring_patterns / scoring_weights / scoring_audit tables) reads
 * these defaults if either (a) the loader hasn't run yet, or (b) the
 * DB is unreachable. A seed script writes these into the DB on first
 * deploy of the framework, after which DB rows are the source of truth
 * for production scans.
 *
 * KEEP IN SYNC with `scripts/seed_scoring_config.ts`. The seed script
 * writes these values verbatim; if you add a knob here, add the same
 * row to the seed script.
 */

import type {
  PatternKind,
  ScoringAxis,
} from "@/lib/db/scoring_config";

/**
 * Strongly-typed pattern descriptor. The DB stores the raw `pattern`
 * string + `kind`; this in-memory shape adds the compiled RegExp (for
 * the regex kinds) so scoring functions can match without re-compiling
 * on every call.
 */
export type PatternEntry = {
  id: string;                    // 'default-<axis>-<kind>-<index>' for code defaults; UUID for DB rows
  axis: ScoringAxis;
  kind: PatternKind;
  pattern: string;               // raw source — regex string or domain string
  weight: number;
  status: "active" | "disabled";
  evidence: string | null;
  /** Compiled regex when `kind` is regex-shaped; null for `distribution_authoritative_domain`. */
  regex: RegExp | null;
};

export type WeightMap = Record<string, number>;

export type ScoringConfig = {
  patterns: PatternEntry[];
  weights: WeightMap;
};

/* ────────────────────────── default patterns ────────────────────────── */

const RAW_CAPEX_PATTERNS: string[] = [
  // Regulatory / financial moats
  "\\baudits?\\b",
  "\\blicens(e|ing|ed|es)\\b",
  "\\bregulatory\\b",
  "\\bbank(ing)?\\b",
  "\\bcertif(y|ication|ied|ying)\\b",
  "\\btransmitter\\b",
  "\\bpci(\\s|-)?dss\\b",
  "\\battorneys?\\b",
  "\\blegal\\s+counsel\\b",
  "\\binterchange\\b",
  // Generic infra
  "\\bdata\\s?center(s)?\\b",
  "\\binternet[- ]scale\\b",
  "\\bpetabytes?\\b",
  "\\bexabytes?\\b",
  // AI / ML infra
  "\\bgpus?\\b",
  "\\bgpu\\s+clusters?\\b",
  "\\b(a100|h100|v100|h200|gh200|b100|b200)s?\\b",
  "\\btpus?\\b",
  "\\btraining\\s+(data|infra(structure)?|cluster|run|set)\\b",
  "\\bfoundation\\s+model\\b",
  "\\bfrontier\\s+model\\b",
  "\\bdiffusion\\s+models?\\b",
  "\\bworld\\s+models?\\b",
  "\\bworld\\s+simulation\\b",
  "\\bmodel\\s+weights\\b",
  "\\bcustom(\\s|-)trained\\s+models?\\b",
  // Research-grade engineering
  "\\bresearch[- ]grade\\b",
  "\\bresearch\\s+project\\b",
  "\\bresearch\\s+(capital|team|cluster|lab)\\b",
  // Financial scale signals
  "\\bbillion[- ]dollar\\b",
  "\\$\\d+\\s*b(illion)?\\b",
  "\\bmillions?\\s+in\\s+(compute|infra(structure)?|capital|training)\\b",
  "\\bbillions?\\s+in\\s+(compute|infra(structure)?|capital|training)\\b",
];

const RAW_CAPEX_EXCLUDE_PATTERNS: string[] = [
  "\\bsoc\\s?2\\b",
];

const RAW_FORTRESS_THESIS_PATTERNS: string[] = [
  "\\bno\\s+door\\b",
  "\\bfortress(?:[- ]grade)?\\b",
  "\\bdecade(s)?\\s+deep\\b",
  "\\bresearch[- ]grade\\b",
  "\\bcapital[- ]intensive\\b",
];

const RAW_AUTHORITATIVE_DOMAINS: string[] = [
  // Authority directories
  "wikipedia.org",
  "linkedin.com",
  "crunchbase.com",
  "g2.com",
  "capterra.com",
  "trustpilot.com",
  "pitchbook.com",
  "glassdoor.com",
  "builtin.com",
  "producthunt.com",
  "ycombinator.com",
  // Tech / business press
  "bloomberg.com",
  "reuters.com",
  "wsj.com",
  "ft.com",
  "nytimes.com",
  "cnbc.com",
  "fortune.com",
  "businessinsider.com",
  "forbes.com",
  "techcrunch.com",
  "theinformation.com",
  "venturebeat.com",
  "axios.com",
  "theverge.com",
  "wired.com",
  "arstechnica.com",
  "engadget.com",
  "fastcompany.com",
  "zdnet.com",
  "pcmag.com",
  "bbc.com",
  // Brand ecosystem
  "apps.apple.com",
  "play.google.com",
  "youtube.com",
  "x.com",
  "twitter.com",
  "reddit.com",
  "github.com",
];

/* ────────────────────────── default weights ────────────────────────── */

export const DEFAULT_WEIGHTS: WeightMap = {
  // Per-axis weights in the moat aggregate (weighted RMS).
  "aggregate.capital": 1,
  "aggregate.technical": 1,
  "aggregate.network": 1,
  "aggregate.switching": 1,
  "aggregate.data_moat": 1,
  "aggregate.regulatory": 1,
  "aggregate.distribution": 1,

  // Distribution sub-signal weights (within the distribution axis).
  "distribution.sub_weight.has_sitelinks": 4,
  "distribution.sub_weight.compressed_organic": 3,
  "distribution.sub_weight.authoritative_third_party_count": 3,
  "distribution.sub_weight.knowledge_graph_present": 2,
  "distribution.sub_weight.top_organic_owned": 2,
  "distribution.sub_weight.serp_own_domain_count": 1,

  // Capital scoring path thresholds + anchors.
  "capital.descriptive_anchor": 7,
  "capital.fortress_thesis_anchor": 7,
  "capital.heavy_capex_anchor": 5,
  "capital.heavy_capex_hits_min": 4,
  "capital.surface_cap": 3,
  // Numeric magnitude tiers (USD/mo total). Threshold = breakpoint;
  // tier = bonus added when est_total >= threshold (highest matched wins).
  "capital.numeric.threshold_100k": 100000,
  "capital.numeric.tier_100k": 4,
  "capital.numeric.threshold_10k": 10000,
  "capital.numeric.tier_10k": 2,
  "capital.numeric.threshold_1k": 1000,
  "capital.numeric.tier_1k": 0.5,

  // Technical scoring per-difficulty multipliers.
  "technical.nightmare_weight": 3.5,
  "technical.hard_weight": 1.5,
  "technical.medium_weight": 0.3,

  // Capability-tag scoring (network / switching / data / regulatory).
  // count → score: count * multiplier, clamped 0–10. Default makes
  // 1 hit → 4, 2 → 8, 3+ → 10.
  "capability.hit_multiplier": 4,
};

/* ───────────────────────── default config ───────────────────────── */

function compileEntries(
  raw: string[],
  axis: ScoringAxis,
  kind: PatternKind,
): PatternEntry[] {
  return raw.map((src, i) => {
    const isRegex = kind !== "distribution_authoritative_domain";
    let regex: RegExp | null = null;
    if (isRegex) {
      try {
        regex = new RegExp(src, "i");
      } catch {
        regex = null;
      }
    }
    return {
      id: `default-${axis}-${kind}-${i}`,
      axis,
      kind,
      pattern: src,
      weight: 1,
      status: "active",
      evidence: null,
      regex,
    };
  });
}

export const DEFAULT_PATTERNS: PatternEntry[] = [
  ...compileEntries(RAW_CAPEX_PATTERNS, "capital", "capex"),
  ...compileEntries(RAW_CAPEX_EXCLUDE_PATTERNS, "capital", "capex_exclude"),
  ...compileEntries(RAW_FORTRESS_THESIS_PATTERNS, "capital", "fortress_thesis"),
  ...compileEntries(
    RAW_AUTHORITATIVE_DOMAINS,
    "distribution",
    "distribution_authoritative_domain",
  ),
];

export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  patterns: DEFAULT_PATTERNS,
  weights: DEFAULT_WEIGHTS,
};

/* ─────────────────────── helpers for callers ─────────────────────── */

export function patternsByAxisAndKind(
  config: ScoringConfig,
  axis: ScoringAxis,
  kind: PatternKind,
): PatternEntry[] {
  return config.patterns.filter(
    (p) => p.axis === axis && p.kind === kind && p.status === "active",
  );
}

export function activeRegexes(
  config: ScoringConfig,
  axis: ScoringAxis,
  kind: PatternKind,
): RegExp[] {
  return patternsByAxisAndKind(config, axis, kind)
    .map((p) => p.regex)
    .filter((r): r is RegExp => r !== null);
}

export function activeDomains(
  config: ScoringConfig,
  axis: ScoringAxis,
  kind: PatternKind,
): string[] {
  return patternsByAxisAndKind(config, axis, kind).map((p) =>
    p.pattern.toLowerCase(),
  );
}

export function weight(config: ScoringConfig, key: string): number {
  const v = config.weights[key];
  if (typeof v === "number") return v;
  // Fall back to default if key is missing — important for new code that
  // expects a knob the seed script hasn't written yet.
  const defaultV = DEFAULT_WEIGHTS[key];
  return typeof defaultV === "number" ? defaultV : 0;
}
