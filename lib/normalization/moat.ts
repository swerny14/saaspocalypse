import { CAPABILITIES, type Capability, type MoatTag } from "./taxonomy";
import type { VerdictReport } from "@/lib/scanner/schema";
import type {
  ProjectedCapability,
} from "./engine";

/**
 * Phase B — moat scoring engine. Pure deterministic functions over the per-
 * report projection + the verdict + the canonical taxonomy. No LLM, no
 * async. Six axes, each 0–10, aggregate is a weighted average. Stored in
 * `report_moat_scores`; surfaced in the VerdictReport card and explained
 * on `/methodology`.
 *
 * Bump RUBRIC_VERSION whenever any axis function or weight changes — the
 * recompute script keys off the stored `rubric_version` to know which rows
 * are stale. Also bump if you add or remove a moat tag in capabilities.ts
 * that materially changes scoring inputs.
 *
 * Important framing: this is INCUMBENT moat depth, not "cost to clone."
 * A common confusion: the projection's `attributes.monthly_floor_usd` and
 * the linked `components` describe the *indie hacker's clone stack*, not
 * what the incumbent built. Capital + Technical therefore derive from the
 * buildability tier + score (which IS the LLM's incumbent assessment) plus
 * capex flags in est_cost, NOT from the projection's cost/components.
 *
 * Distribution / brand is intentionally NOT modeled. You cannot derive it
 * from a homepage scan, and faking it would weaken the credibility of the
 * other five axes. The methodology page calls this out explicitly.
 */

export const RUBRIC_VERSION = 3;

export type MoatScore = {
  rubric_version: number;
  capital: number;
  technical: number;
  network: number;
  switching: number;
  data_moat: number;
  regulatory: number;
  aggregate: number;
};

export type MoatRubric = {
  version: number;
  weights: {
    capital: number;
    technical: number;
    network: number;
    switching: number;
    data_moat: number;
    regulatory: number;
  };
  /** Cap on raw `sum(5 - commoditization_level)` before scaling to 0–10. */
  technical_depth_cap: number;
};

export const MOAT_RUBRIC_V1: MoatRubric = {
  version: RUBRIC_VERSION,
  // Equal weights for V1 — the rubric should be honest about each axis being
  // roughly equally important. Re-tune only after we have enough scored
  // reports to see clustering and decide some axes carry less signal.
  weights: {
    capital: 1,
    technical: 1,
    network: 1,
    switching: 1,
    data_moat: 1,
    regulatory: 1,
  },
  // Retained for backward-compatible MoatRubric type — no longer used by
  // scoreTechnical (V2 derives from score+challenges instead of components).
  technical_depth_cap: 15,
};

/* ──────────────────────────── per-axis scorers ──────────────────────────── */

/**
 * Capex-flagging patterns. Words in an est_cost line that signal real
 * incumbent capital investment (audits, licenses, regulatory work, banking
 * relationships, training infrastructure). SOC 2 and bare "compliance" /
 * "GDPR" are intentionally excluded — they're table-stakes for any B2B
 * SaaS and would inflate everyone's score. Same exclusion principle as
 * the regulatory axis.
 */
const CAPEX_PATTERNS: RegExp[] = [
  /\baudits?\b/i,
  /\blicens(e|ing|ed|es)\b/i,
  /\bregulatory\b/i,
  /\bbank(ing)?\b/i,
  /\bcertif(y|ication|ied|ying)\b/i,
  /\btransmitter\b/i,
  /\bgpus?\b/i,
  /\btraining\s+(data|infra|cluster|run|set)\b/i,
  /\bpci(\s|-)?dss\b/i,
  /\bdata\s?center(s)?\b/i,
  /\battorneys?\b/i,
  /\blegal\s+counsel\b/i,
  /\binterchange\b/i,
];

const CAPEX_EXCLUDE: RegExp[] = [/\bsoc\s?2\b/i];

function lineHasCapex(text: string): boolean {
  if (CAPEX_EXCLUDE.some((re) => re.test(text))) return false;
  return CAPEX_PATTERNS.some((re) => re.test(text));
}

/**
 * CAPITAL — what the incumbent had to invest to build the thing. The
 * buildability tier is the strong signal: DON'T-tier products by
 * definition required substantial capital (regulatory, research-grade,
 * capex-heavy); WEEKEND products didn't. Capex flags in est_cost line
 * text add specificity (audit, licensing, GPU/training, banking, legal).
 * A descriptive est_total string ("more than your house", "approximately
 * your 20s") is the LLM's signal that the cost is unbounded — boost.
 *
 * We deliberately do NOT use `attributes.monthly_floor_usd` here — that's
 * the indie hacker's clone-hosting cost, not the incumbent's capex.
 */
function scoreCapital(verdict: VerdictReport): number {
  const tierBase = verdict.tier === "DON'T" ? 7 : verdict.tier === "MONTH" ? 4 : 1;

  let capexHits = 0;
  for (const row of verdict.est_cost) {
    if (lineHasCapex(row.line)) capexHits += 1;
    // The LLM also encodes capex in the cost field as descriptive strings
    // ("priceless", "your remaining sanity") on DON'T-tier reports.
    if (typeof row.cost === "string" && row.cost !== "???" && lineHasCapex(row.cost)) {
      capexHits += 1;
    }
  }
  const capexBoost = Math.min(3, capexHits);

  // est_total as a non-numeric, non-"$X + usage" string is a strong DON'T
  // signal — the LLM gave up trying to put a number on it.
  const total = verdict.est_total;
  const totalIsDescriptive =
    typeof total === "string" &&
    !total.startsWith("$") &&
    total !== "usage-based";
  const totalBoost = totalIsDescriptive ? 2 : 0;

  return clamp(tierBase + capexBoost + totalBoost);
}

/**
 * TECHNICAL — depth of the incumbent's underlying engineering. Lower
 * buildability score = harder problem to recreate = deeper technical moat.
 * The LLM's score IS our judgment of how hard the incumbent's R&D is, so
 * we use it directly (inverted, so low score → high score). Add a boost
 * from `nightmare`/`hard` challenge counts for cases where the score is
 * borderline but the problem set is genuinely brutal.
 *
 * We deliberately do NOT use the projection's components here — those
 * describe the indie clone stack (Next.js, OpenAI API, Postgres), not what
 * the incumbent built (the foundation model itself). Same conceptual
 * mismatch as Capital.
 */
function scoreTechnical(verdict: VerdictReport): number {
  // Inverse score: 95 → 0.5, 70 → 3, 50 → 5, 30 → 7, 10 → 9, 0 → 10.
  const scoreInverse = (100 - verdict.score) / 10;

  const nightmareCount = verdict.challenges.filter((c) => c.diff === "nightmare").length;
  const hardCount = verdict.challenges.filter((c) => c.diff === "hard").length;
  const challengeBoost = Math.min(4, nightmareCount * 1.0 + hardCount * 0.5);

  // Weighted blend — score does most of the work, challenge structure
  // refines within tier.
  return clamp(scoreInverse * 0.7 + challengeBoost);
}

const NETWORK_TAGS: MoatTag[] = ["multi_sided", "ugc", "marketplace", "viral_loop"];
const SWITCHING_TAGS: MoatTag[] = ["data_storage", "workflow_lock_in", "integration_hub"];
const DATA_TAGS: MoatTag[] = ["proprietary_dataset", "training_data", "behavioral"];
const REGULATORY_TAGS: MoatTag[] = ["hipaa", "finra", "gdpr_critical", "licensed"];

type AxisCounts = {
  network: number;
  switching: number;
  data: number;
  regulatory: number;
};

/**
 * Count tagged-capability hits per axis. Crucially we count CAPABILITIES,
 * not unique tags — Stripe matching `payments-licensing` + `pci-dss-level-1`
 * + `kyc-aml` (all sharing the `licensed` tag) should register as 3
 * regulatory hits, not 1. Counting unique tags would conflate "moat with
 * many distinct mechanisms" with "moat with one mechanism repeated."
 *
 * `catalog` lets the admin recompute path pass DB-fresh capability rows so
 * pattern/tag edits affect scoring without a redeploy. Defaults to the
 * TS-bundled CAPABILITIES used by production scans.
 */
function countAxisHits(
  matchedCapabilities: ProjectedCapability[],
  catalog: Capability[],
): AxisCounts {
  const tagsBySlug: Map<string, MoatTag[]> = new Map();
  for (const c of catalog) tagsBySlug.set(c.slug, c.moat_tags);
  const counts: AxisCounts = { network: 0, switching: 0, data: 0, regulatory: 0 };
  for (const cap of matchedCapabilities) {
    const tags = tagsBySlug.get(cap.capability_slug);
    if (!tags || tags.length === 0) continue;
    if (tags.some((t) => NETWORK_TAGS.includes(t))) counts.network += 1;
    if (tags.some((t) => SWITCHING_TAGS.includes(t))) counts.switching += 1;
    if (tags.some((t) => DATA_TAGS.includes(t))) counts.data += 1;
    if (tags.some((t) => REGULATORY_TAGS.includes(t))) counts.regulatory += 1;
  }
  return counts;
}

/**
 * Diminishing-returns curve: 1 hit → 4, 2 → 8, 3+ → 10. A single tagged
 * capability is real signal but not max-confident; multiple capabilities
 * sharing a moat axis is the high-confidence case.
 */
function scoreFromCount(count: number): number {
  return clamp(count * 4);
}

/* ───────────────────────────── aggregate ─────────────────────────────────── */

/**
 * Weighted root-mean-square aggregate. RMS rather than arithmetic mean so
 * specialist moats (Stripe is 10/10/0/0/0/10 in capital/technical/regulatory
 * with the other three legitimately near zero) don't get averaged down to
 * mediocrity. RMS rewards concentration: the same total points distributed
 * across fewer axes scores higher than spread evenly. Uniform distributions
 * are unchanged (RMS = mean when all values are equal), so this only shifts
 * the scoring for genuinely lopsided moats — which is the cases we were
 * misrepresenting.
 */
function aggregate(parts: Omit<MoatScore, "rubric_version" | "aggregate">, rubric: MoatRubric): number {
  const w = rubric.weights;
  const totalWeight = w.capital + w.technical + w.network + w.switching + w.data_moat + w.regulatory;
  const weightedSquares =
    parts.capital ** 2 * w.capital +
    parts.technical ** 2 * w.technical +
    parts.network ** 2 * w.network +
    parts.switching ** 2 * w.switching +
    parts.data_moat ** 2 * w.data_moat +
    parts.regulatory ** 2 * w.regulatory;
  return roundTo1(Math.sqrt(weightedSquares / totalWeight));
}

/* ────────────────────────────── entry point ─────────────────────────────── */

export type MoatInput = {
  /** The verdict itself — drives Capital (tier + capex flags + est_total)
   *  and Technical (score + challenge difficulty). The projection is no
   *  longer used for those axes; only for capability-tag axes below. */
  verdict: VerdictReport;
  capabilities: ProjectedCapability[];
  /** Optional capability catalog for moat-tag lookup. Defaults to the
   *  TS-bundled CAPABILITIES. Pass DB-fresh rows from the admin recompute
   *  path so live tag edits affect scoring without a redeploy. */
  catalog?: Capability[];
};

/**
 * Score a report against the rubric. Pure function.
 *
 * Caller responsibility: pass projection capabilities fresh from
 * `projectReport` (so capability moat_tags are the source-of-truth set).
 * Reading old reports from DB and re-scoring with the current rubric is
 * fine — the recompute script does exactly that.
 */
export function scoreMoat(
  input: MoatInput,
  rubric: MoatRubric = MOAT_RUBRIC_V1,
): MoatScore {
  const catalog = input.catalog ?? CAPABILITIES;
  const counts = countAxisHits(input.capabilities, catalog);
  const capital = roundTo1(scoreCapital(input.verdict));
  const technical = roundTo1(scoreTechnical(input.verdict));
  const network = roundTo1(scoreFromCount(counts.network));
  const switching = roundTo1(scoreFromCount(counts.switching));
  const data_moat = roundTo1(scoreFromCount(counts.data));
  const regulatory = roundTo1(scoreFromCount(counts.regulatory));
  const agg = aggregate(
    { capital, technical, network, switching, data_moat, regulatory },
    rubric,
  );
  return {
    rubric_version: rubric.version,
    capital,
    technical,
    network,
    switching,
    data_moat,
    regulatory,
    aggregate: agg,
  };
}

/* ─────────────────────────────── helpers ────────────────────────────────── */

function clamp(n: number, min = 0, max = 10): number {
  if (n < min) return min;
  if (n > max) return max;
  return n;
}

function roundTo1(n: number): number {
  return Math.round(n * 10) / 10;
}
