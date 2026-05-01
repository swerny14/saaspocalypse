/**
 * Phase 2.6 — calibration framework seed script.
 *
 * Reads the in-code defaults from `lib/normalization/scoring_defaults.ts`
 * and writes them as DB rows in `scoring_patterns` + `scoring_weights`.
 * Once these rows exist, all scoring can be calibrated through the
 * /admin/score-audit UI without redeploying.
 *
 * Run with: pnpm tsx scripts/seed_scoring_config.ts
 *
 * Idempotent: re-running won't duplicate. Pattern rows are upserted on
 * (axis, kind, pattern); weight rows on key. The script only INSERTS or
 * UPSERTS — it never disables an existing row, so calibration edits made
 * via the admin UI survive a re-run.
 *
 * Use `--dry` to preview without writing.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { getSupabaseAdmin } from "../lib/db/supabase";
import {
  DEFAULT_PATTERNS,
  DEFAULT_WEIGHTS,
} from "../lib/normalization/scoring_defaults";
import { logScoringAudit } from "../lib/db/scoring_config";

type PatternUpsert = {
  axis: string;
  kind: string;
  pattern: string;
  weight: number;
  status: string;
  evidence: string | null;
  added_by: string;
};

const WEIGHT_DESCRIPTIONS: Record<string, string> = {
  "aggregate.capital": "Per-axis weight in moat-aggregate weighted RMS.",
  "aggregate.technical": "Per-axis weight in moat-aggregate weighted RMS.",
  "aggregate.network": "Per-axis weight in moat-aggregate weighted RMS.",
  "aggregate.switching": "Per-axis weight in moat-aggregate weighted RMS.",
  "aggregate.data_moat": "Per-axis weight in moat-aggregate weighted RMS.",
  "aggregate.regulatory": "Per-axis weight in moat-aggregate weighted RMS.",
  "aggregate.distribution": "Per-axis weight in moat-aggregate weighted RMS.",
  "distribution.sub_weight.has_sitelinks":
    "Distribution sub-signal: weight on `has_sitelinks` (organic[0] expanded).",
  "distribution.sub_weight.compressed_organic":
    "Distribution sub-signal: weight on `organic_count < 10` (Google brand-confidence compression).",
  "distribution.sub_weight.authoritative_third_party_count":
    "Distribution sub-signal: weight on count of authoritative-domain hits in top organic (gated by top_organic_owned).",
  "distribution.sub_weight.knowledge_graph_present":
    "Distribution sub-signal: weight on KG panel presence.",
  "distribution.sub_weight.top_organic_owned":
    "Distribution sub-signal: weight on organic[0] being the brand's own domain.",
  "distribution.sub_weight.serp_own_domain_count":
    "Distribution sub-signal: weight on count of own-domain organic results.",
  "capital.descriptive_anchor":
    "Path 1 (descriptive est_total) capital anchor before adding capex hits.",
  "capital.fortress_thesis_anchor":
    "Path 2 (FORTRESS-shaped thesis) capital anchor before adding capex hits.",
  "capital.heavy_capex_anchor":
    "Path 3 (heavy capex prose without explicit fortress framing) capital anchor.",
  "capital.heavy_capex_hits_min":
    "Path 3 minimum capex hits to qualify (drops to path 4 below this threshold).",
  "capital.surface_cap":
    "Cap on capex matches counted within a single text surface (per-line dominance protection).",
  "capital.numeric.threshold_100k":
    "Numeric-path breakpoint: est_total >= this triggers the tier_100k bonus.",
  "capital.numeric.tier_100k":
    "Numeric path bonus when est_total clears threshold_100k.",
  "capital.numeric.threshold_10k":
    "Numeric-path breakpoint: est_total >= this triggers the tier_10k bonus.",
  "capital.numeric.tier_10k":
    "Numeric path bonus when est_total clears threshold_10k.",
  "capital.numeric.threshold_1k":
    "Numeric-path breakpoint: est_total >= this triggers the tier_1k bonus.",
  "capital.numeric.tier_1k":
    "Numeric path bonus when est_total clears threshold_1k.",
  "technical.nightmare_weight":
    "Per-challenge multiplier added to technical when diff = nightmare.",
  "technical.hard_weight":
    "Per-challenge multiplier added to technical when diff = hard.",
  "technical.medium_weight":
    "Per-challenge multiplier added to technical when diff = medium.",
  "capability.hit_multiplier":
    "scoreFromCount multiplier (capability hits in network/switching/data/regulatory). Default 4 → 1 hit = 4, 2 hits = 8, 3+ = 10.",
};

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local. Aborting.");
    process.exit(1);
  }
  const dryRun = process.argv.includes("--dry");

  const admin = getSupabaseAdmin();

  // Pattern upserts.
  const patternRows: PatternUpsert[] = DEFAULT_PATTERNS.map((p) => ({
    axis: p.axis,
    kind: p.kind,
    pattern: p.pattern,
    weight: p.weight,
    status: p.status,
    evidence: p.evidence,
    added_by: "seed",
  }));

  console.log(`[seed_scoring] ${patternRows.length} pattern rows`);
  if (dryRun) {
    for (const r of patternRows.slice(0, 5)) {
      console.log(`  · ${r.axis}/${r.kind}: ${r.pattern}`);
    }
    if (patternRows.length > 5) console.log(`  · ... and ${patternRows.length - 5} more`);
  } else {
    const { error: pErr } = await admin
      .from("scoring_patterns")
      .upsert(patternRows, { onConflict: "axis,kind,pattern" });
    if (pErr) {
      console.error("[seed_scoring] pattern upsert failed:", pErr);
      process.exit(1);
    }
  }

  // Weight upserts.
  const weightRows = Object.entries(DEFAULT_WEIGHTS).map(([key, value]) => ({
    key,
    value,
    description: WEIGHT_DESCRIPTIONS[key] ?? null,
  }));
  console.log(`[seed_scoring] ${weightRows.length} weight rows`);
  if (dryRun) {
    for (const r of weightRows.slice(0, 5)) {
      console.log(`  · ${r.key} = ${r.value}`);
    }
    if (weightRows.length > 5) console.log(`  · ... and ${weightRows.length - 5} more`);
  } else {
    const { error: wErr } = await admin
      .from("scoring_weights")
      .upsert(weightRows, { onConflict: "key" });
    if (wErr) {
      console.error("[seed_scoring] weight upsert failed:", wErr);
      process.exit(1);
    }
  }

  if (!dryRun) {
    await logScoringAudit({
      actor: "seed",
      scope: "pattern",
      change_kind: "add",
      reason: `Seed script ran: ${patternRows.length} patterns + ${weightRows.length} weights upserted from code defaults.`,
    });
  }

  console.log(`[seed_scoring] done${dryRun ? " (dry)" : ""}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
