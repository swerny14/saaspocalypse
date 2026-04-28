import { z } from "zod";

export const TIERS = ["WEEKEND", "MONTH", "DON'T"] as const;
export const DIFFICULTIES = ["easy", "medium", "hard", "nightmare"] as const;

export const TierSchema = z.enum(TIERS);
export const DifficultySchema = z.enum(DIFFICULTIES);

export type Tier = z.infer<typeof TierSchema>;
export type Difficulty = z.infer<typeof DifficultySchema>;

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
 * Canonical shape produced by the LLM, stored in `reports`, and consumed by
 * the UI. Cross-field invariants (tier-score bucket alignment, challenge
 * ordering) are enforced via `.refine` below.
 */
export const VerdictReportSchema = z
  .object({
    name: z.string().min(1).max(60),
    tagline: z.string().min(1).max(80),

    tier: TierSchema,
    score: z.number().int().min(0).max(100),
    confidence: z.number().int().min(0).max(100).optional(),

    take: z.string().min(1).max(400),
    take_sub: z.string().min(1).max(800),
    time_estimate: z.string().min(1).max(40),
    time_breakdown: z.string().min(1).max(200),
    break_even: z.string().min(1).max(200),

    est_total: MoneyOrDescriptor.describe(
      "Monthly USD run-rate, equal to the sum of numeric est_cost lines. Use a descriptive string only if non-numeric lines dominate (e.g. DON'T-tier capex).",
    ),
    current_cost: CurrentCostSchema,
    est_cost: z.array(EstCostLineSchema).min(1).max(10),
    alternatives: z.array(AlternativeSchema).length(3),
    challenges: z.array(ChallengeSchema).min(4).max(6),
    stack: z.array(z.string().min(1)).min(3).max(5),
  })
  .refine(
    (v) => {
      if (v.score >= 70) return v.tier === "WEEKEND";
      if (v.score >= 30) return v.tier === "MONTH";
      return v.tier === "DON'T";
    },
    { message: "tier must match score bucket (WEEKEND ≥ 70, MONTH 30–69, DON'T < 30)", path: ["tier"] },
  )
  .refine(
    (v) => {
      const rank: Record<Difficulty, number> = { easy: 0, medium: 1, hard: 2, nightmare: 3 };
      for (let i = 1; i < v.challenges.length; i += 1) {
        if (rank[v.challenges[i].diff] < rank[v.challenges[i - 1].diff]) return false;
      }
      return true;
    },
    { message: "challenges must be sorted ascending by difficulty", path: ["challenges"] },
  );

export type VerdictReport = z.infer<typeof VerdictReportSchema>;
export type CurrentCost = z.infer<typeof CurrentCostSchema>;
export type EstCostLine = z.infer<typeof EstCostLineSchema>;
export type Alternative = z.infer<typeof AlternativeSchema>;
export type Challenge = z.infer<typeof ChallengeSchema>;

/** Tier → pale background CSS variable, used by score cell + tier pill. */
export const TIER_BG_VAR: Record<Tier, string> = {
  WEEKEND: "var(--color-tier-weekend-bg)",
  MONTH: "var(--color-tier-month-bg)",
  "DON'T": "var(--color-tier-dont-bg)",
};

/** Tier → darker accent (used for score-cell label dots, etc.). */
export const TIER_FG: Record<Tier, string> = {
  WEEKEND: "#22c55e",
  MONTH: "#eab308",
  "DON'T": "#ef4444",
};

/** Difficulty → chip background CSS variable. */
export const DIFF_BG_VAR: Record<Difficulty, string> = {
  easy: "var(--color-accent)",
  medium: "var(--color-sticky)",
  hard: "var(--color-coral)",
  nightmare: "var(--color-purple)",
};
