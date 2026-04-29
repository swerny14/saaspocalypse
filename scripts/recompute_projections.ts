/**
 * Re-run the deterministic normalization engine against every existing
 * report, replacing the per-report projection rows. Use this:
 *   - to backfill projections for reports scanned before this layer shipped
 *   - after a taxonomy edit (new aliases, new capability patterns)
 *   - after bumping PROJECTION_VERSION in lib/normalization/engine.ts
 *
 * Run with: pnpm tsx scripts/recompute_projections.ts
 *
 * Flags:
 *   --reset-unknowns   Delete every `status='open'` row from
 *                      normalization_unknowns before recomputing. Useful
 *                      after a harvester change that produces different
 *                      candidates (e.g. atomizing multi-tool stack items
 *                      surfaces "Reddit API" / "X API v2" individually
 *                      instead of as one aggregate). Resolved rows
 *                      (aliased / added / ignored) are preserved.
 *
 * Sequential, not parallel — Supabase rate limits aside, the row count is
 * small (~30 reports today) and ordering keeps logs readable. Soft-fails
 * per report so a single bad row doesn't abort the whole sweep.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { getAllReports } from "../lib/db/reports";
import { projectReport } from "../lib/normalization/engine";
import { persistProjection } from "../lib/db/projections";
import { deleteOpenUnknowns } from "../lib/db/normalization_unknowns";
import { scoreMoat } from "../lib/normalization/moat";
import { persistMoatScore } from "../lib/db/moat_scores";

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

  const reports = await getAllReports(10_000);
  console.log(`[recompute] ${reports.length} reports to project`);

  let ok = 0;
  let failed = 0;
  for (const r of reports) {
    try {
      const projection = projectReport(r, r.detected_stack);
      await persistProjection(r.id, projection);
      // r is StoredReport which extends VerdictReport — pass directly.
      const moat = scoreMoat({
        verdict: r,
        capabilities: projection.capabilities,
      });
      await persistMoatScore(r.id, moat);
      ok += 1;
      console.log(
        `[recompute] ${r.slug} · ${projection.components.length} components · ${projection.capabilities.length} capabilities · ${projection.unknowns.length} unknowns · moat ${moat.aggregate}/10`,
      );
    } catch (err) {
      failed += 1;
      console.error(`[recompute] ${r.slug} failed:`, err);
    }
  }

  console.log(`[recompute] done — ${ok} ok, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
