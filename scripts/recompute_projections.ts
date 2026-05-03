/**
 * Re-run the deterministic normalization engine against existing reports,
 * replacing per-report projection rows and keeping the public wedge fields
 * in lockstep with the recomputed moat aggregate.
 *
 * Run with: pnpm tsx scripts/recompute_projections.ts
 *
 * Flags:
 *   --reset-unknowns   Delete every `status='open'` row from
 *                      normalization_unknowns before recomputing.
 *   --slug=<slug>      Recompute a single report.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { getAllReports } from "../lib/db/reports";
import { deleteOpenUnknowns } from "../lib/db/normalization_unknowns";
import { recomputeReportScoring } from "../lib/normalization/recompute";

function parseSlugFilter(): string | null {
  const flag = process.argv.find((a) => a.startsWith("--slug="));
  if (!flag) return null;
  return flag.slice("--slug=".length).trim() || null;
}

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set it in .env.local before running.",
    );
    process.exit(1);
  }

  const resetUnknowns = process.argv.includes("--reset-unknowns");
  if (resetUnknowns) {
    const dropped = await deleteOpenUnknowns();
    console.log(`[recompute] --reset-unknowns: dropped ${dropped} open rows`);
  }

  const slugFilter = parseSlugFilter();
  const all = await getAllReports(10_000);
  const reports = slugFilter ? all.filter((r) => r.slug === slugFilter) : all;
  if (slugFilter && reports.length === 0) {
    console.error(`[recompute] no report matches slug "${slugFilter}"`);
    process.exit(1);
  }
  console.log(
    `[recompute] ${reports.length} report(s) to project${
      slugFilter ? ` (filter: ${slugFilter})` : ""
    }`,
  );

  let ok = 0;
  let failed = 0;
  let tierMoves = 0;
  const driftSamples: Array<{
    slug: string;
    before: { tier: string; wedge_score: number };
    after: { tier: string; wedge_score: number };
  }> = [];

  for (const r of reports) {
    try {
      const result = await recomputeReportScoring(r);

      if (result.before.tier !== result.after.tier) {
        tierMoves += 1;
        driftSamples.push({
          slug: r.slug,
          before: {
            tier: result.before.tier,
            wedge_score: result.before.wedge_score,
          },
          after: {
            tier: result.after.tier,
            wedge_score: result.after.wedge_score,
          },
        });
      }

      ok += 1;
      const distLabel =
        result.moat.distribution === null
          ? "-"
          : `${result.moat.distribution.toFixed(1)}/10`;
      const beforeAfter =
        result.before.wedge_score !== result.after.wedge_score ||
        result.before.tier !== result.after.tier
          ? ` | ${result.before.tier} ${result.before.wedge_score} -> ${result.after.tier} ${result.after.wedge_score}`
          : "";
      console.log(
        `[recompute] ${r.slug} | capabilities ${result.capability_count} | distribution ${distLabel} | moat agg ${result.moat.aggregate.toFixed(1)} (cap ${result.moat.capital.toFixed(1)}, tech ${result.moat.technical.toFixed(1)})${beforeAfter}`,
      );
    } catch (err) {
      failed += 1;
      console.error(`[recompute] ${r.slug} failed:`, err);
    }
  }

  console.log(
    `[recompute] done - ${ok} ok, ${failed} failed, ${tierMoves} tier moves`,
  );
  if (driftSamples.length > 0) {
    console.log("[recompute] drift samples (max 10):");
    for (const d of driftSamples.slice(0, 10)) {
      console.log(
        `  - ${d.slug}: ${d.before.tier} ${d.before.wedge_score} -> ${d.after.tier} ${d.after.wedge_score}`,
      );
    }
  }

  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
