import { z } from "zod";

/**
 * Tiers in the wedge frame (Phase 2.5 of the wedge-frame pivot).
 * SOFT = wedgeable opening, CONTESTED = real fight, FORTRESS = thick walls.
 *
 * Tier and the displayed `wedge_score` are server-computed from the moat
 * aggregate (see lib/normalization/moat.ts + lib/scanner/pipeline.ts):
 *   wedge_score = round((10 - moat.aggregate) * 10)
 *   tier        = wedge_score >= 70 ? SOFT : wedge_score >= 30 ? CONTESTED : FORTRESS
 * The LLM no longer emits either field — its job is wedge_thesis + analytical
 * content. The historic "buildability score" was retired in Phase 2.5; what
 * users see is "where are the walls thinnest."
 */
export const TIERS = ["SOFT", "CONTESTED", "FORTRESS"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard", "nightmare"] as const;

export const TierSchema = z.enum(TIERS);
export const DifficultySchema = z.enum(DIFFICULTIES);

export type Tier = z.infer<typeof TierSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;

/** Moat axis keys, used for `weakest_moat_axis` and elsewhere. */
export const MOAT_AXES = [
  "capital",
  "technical",
  "network",
  "switching",
  "data_moat",
  "regulatory",
  "distribution",
] as const;
export const MoatAxisSchema = z.enum(MOAT_AXES);
export type MoatAxis = z.infer<typeof MoatAxisSchema>;

/** Numbers for single prices; strings for tiered pricing like "2.9% + $0.30". */
const MoneyOrDescriptor = z.union([z.number(), z.string()]);

export const CurrentCostSchema = z.object({
  label: z.string().min(1),
  price: MoneyOrDescriptor.describe(
    "Number for single tier, string for tiered/usage pricing like '2.9% + $0.30'.",
  ),
  unit: z.string().min(1),
  annual: MoneyOrDescriptor,
  note: z.string().optional(),
});

export const EstCostLineSchema = z.object({
  line: z.string().min(1),
  cost: MoneyOrDescriptor.describe(
    "Monthly USD run-rate at indie-hacker scale. Free tiers are 0. Use '???' for variable-cost services (LLM/data APIs).",
  ),
});

export const AlternativeSchema = z.object({
  name: z.string().min(1),
  why: z.string().min(1),
});

export const ChallengeSchema = z.object({
  diff: DifficultySchema.describe(
    "Sorted ascending across the challenges array (easy → medium → hard → nightmare).",
  ),
  name: z.string().min(1),
  note: z.string().min(1),
});

/**
 * Underlying object shape produced by the LLM. Refined separately for the
 * LLM call (challenge-sort invariant) and re-extended for the DB shape
 * (adds server-computed wedge fields). Don't export this directly — use
 * LLMVerdictSchema or VerdictReportSchema.
 */
const LLMVerdictObject = z.object({
  name: z.string().min(1).max(60),
  tagline: z.string().min(1).max(80),

  /** One-sentence wedge thesis — the lede of the report. References the
   *  weakest moat surface in concrete terms ("their distribution is wide
   *  open", "users would leave with one CSV export"). */
  wedge_thesis: z.string().min(20).max(220),

  take: z.string().min(1).max(400),
  take_sub: z.string().min(1).max(800),
  time_estimate: z.string().min(1).max(40),
  time_breakdown: z.string().min(1).max(200),
  break_even: z.string().min(1).max(200),

  est_total: MoneyOrDescriptor.describe(
    "Monthly USD run-rate, equal to the sum of numeric est_cost lines. Use a descriptive string only if non-numeric lines dominate (FORTRESS-tier capex).",
  ),
  current_cost: CurrentCostSchema,
  est_cost: z.array(EstCostLineSchema).min(1).max(10),
  alternatives: z.array(AlternativeSchema).length(3),
  challenges: z.array(ChallengeSchema).min(4).max(6),
  stack: z.array(z.string().min(1)).min(3).max(5),
});

const challengesSortedRefine = (
  v: { challenges: { diff: Difficulty }[] },
): boolean => {
  const rank: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2, nightmare: 3 };
  for (let i = 1; i < v.challenges.length; i += 1) {
    if (rank[v.challenges[i].diff] < rank[v.challenges[i - 1].diff]) return false;
  }
  return true;
};

const challengesSortMessage = {
  message: "challenges must be sorted ascending by difficulty",
  path: ["challenges"],
};

/**
 * What the LLM emits via submit_verdict. The headline number (wedge_score)
 * and the tier are NOT here — they're computed server-side from the moat
 * aggregate. The LLM's job is the wedge thesis + the supporting analytical
 * fields (cost, time, alternatives, challenges, stack). Buildability
 * difficulty, when it matters, lives entirely inside the per-challenge
 * `diff` field — the engine derives the technical-moat axis from those.
 */
export const LLMVerdictSchema = LLMVerdictObject.refine(
  challengesSortedRefine,
  challengesSortMessage,
);

export type LLMVerdict = z.infer<typeof LLMVerdictSchema>;

/**
 * Full report shape stored in `reports`. Extends the LLM output with the
 * server-computed wedge fields. UI components consume this shape via
 * `StoredReport` (which adds DB metadata: id, slug, view_count, etc.).
 *
 * Defensive readers (lib/db/reports.ts::safeReadReport) parse against this
 * schema, tolerating string-length overages — caps guide the LLM, they
 * don't gatekeep stored data.
 */
export const VerdictReportSchema = LLMVerdictObject.extend({
  /** 0–100 displayed score. Higher = thinner walls = more wedgeable. */
  wedge_score: z.number().int().min(0).max(100),
  /** Server-derived from wedge_score buckets (≥70 SOFT, 30–69 CONTESTED, <30 FORTRESS). */
  tier: TierSchema,
  /** Lowest-scoring moat axis — drives the weakest-axis callout in the UI
   *  and keys the wedge guide LLM prompt. Null when no moat score exists
   *  (legacy / projection failure). */
  weakest_moat_axis: MoatAxisSchema.nullable(),
}).refine(challengesSortedRefine, challengesSortMessage);

export type VerdictReport = z.infer<typeof VerdictReportSchema>;
export type CurrentCost = z.infer<typeof CurrentCostSchema>;
export type EstCostLine = z.infer<typeof EstCostLineSchema>;
export type Alternative = z.infer<typeof AlternativeSchema>;
export type Challenge = z.infer<typeof ChallengeSchema>;

/** Tier → pale background CSS variable, used by score cell + tier pill.
 *  CSS variables retained the legacy naming (--color-tier-weekend-bg etc.)
 *  to avoid touching globals.css; the mapping is logical (SOFT inherits
 *  what was the WEEKEND background). */
export const TIER_BG_VAR: Record<Tier, string> = {
  SOFT: "var(--color-tier-weekend-bg)",
  CONTESTED: "var(--color-tier-month-bg)",
  FORTRESS: "var(--color-tier-dont-bg)",
};

/** Tier → darker accent (used for score-cell label dots, etc.). */
export const TIER_FG: Record<Tier, string> = {
  SOFT: "#22c55e",
  CONTESTED: "#eab308",
  FORTRESS: "#ef4444",
};

/** Difficulty → chip background CSS variable. */
export const DIFF_BG_VAR: Record<Difficulty, string> = {
  easy: "var(--color-accent)",
  medium: "var(--color-sticky)",
  hard: "var(--color-coral)",
  nightmare: "var(--color-purple)",
};

/* ────────────────────── server-side wedge derivation ────────────────────── */

/**
 * Derive the wedge score (0–100) from the moat aggregate (0–10).
 * Higher moat aggregate = thicker walls = lower wedge score.
 * Aggregate of 0 → wedge 100, aggregate of 10 → wedge 0.
 */
export function wedgeScoreFromAggregate(aggregate: number): number {
  const score = Math.round((10 - aggregate) * 10);
  if (score < 0) return 0;
  if (score > 100) return 100;
  return score;
}

/** Bucket a wedge score into a tier. */
export function tierFromWedgeScore(score: number): Tier {
  if (score >= 70) return "SOFT";
  if (score >= 30) return "CONTESTED";
  return "FORTRESS";
}
