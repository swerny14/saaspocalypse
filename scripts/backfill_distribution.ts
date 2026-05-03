/**
 * Phase 1 backfill — collect distribution signals for every existing report
 * and recompute moat scores with the new 7th axis.
 *
 * Run with: pnpm tsx scripts/backfill_distribution.ts
 *
 * Per report:
 *   1. Re-fetch the homepage (we don't store the original HTML).
 *   2. Re-project the verdict so attributes are current with the live
 *      taxonomy (parity with the production scan path).
 *   3. Persist projection rows + persist distribution signals.
 *   4. Re-score moat with the new distribution axis.
 *
 * Sequential — keeps SERP API quota and Supabase load polite, and the
 * report count is small. Soft-fails per report so one bad fetch doesn't
 * abort the sweep.
 *
 * Honest failure modes:
 *   - Site is down / fetch fails → distribution + projection refresh skipped
 *     (existing rows untouched). Re-run later.
 *   - SERPER_API_KEY missing → SERP signal stays null; other 4 still get
 *     populated. Distribution axis still computes (3 of 5 threshold).
 *   - Domain has private RDAP / no /blog → those signals null, axis still
 *     computes via SERP + pricing_gate + community.
 *
 * Quota note: at 50 reports × 1 SERP call = 50 calls. Serper free tier is
 * 2,500 credits — plenty of headroom. Re-running is safe but burns quota.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { getAllReports, updateReportWedgeFields } from "../lib/db/reports";
import { projectReport } from "../lib/normalization/engine";
import {
  persistProjection,
  persistDistributionSignals,
} from "../lib/db/projections";
import { weakestAxis } from "../lib/normalization/moat";
import { scoreMoatWithLLM } from "../lib/normalization/moat_llm";
import { persistMoatScore } from "../lib/db/moat_scores";
import { fetchAndCleanHomepage } from "../lib/scanner/fetch";
import {
  collectExternalDistributionSignals,
  combineDistributionSignals,
} from "../lib/scanner/distribution";
import {
  tierFromWedgeScore,
  wedgeScoreFromAggregate,
} from "../lib/scanner/schema";

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
  if (!process.env.SERPER_API_KEY) {
    console.warn(
      "[backfill] Warning: SERPER_API_KEY not set. SERP signal will be null for every report.",
    );
  }

  const slugFilter = parseSlugFilter();
  const all = await getAllReports(10_000);
  const reports = slugFilter ? all.filter((r) => r.slug === slugFilter) : all;
  if (slugFilter && reports.length === 0) {
    console.error(`[backfill] no report matches slug "${slugFilter}"`);
    process.exit(1);
  }
  console.log(
    `[backfill] ${reports.length} report(s) to backfill${slugFilter ? ` (filter: ${slugFilter})` : ""}`,
  );

  let ok = 0;
  let failed = 0;
  let serpOk = 0;
  let kgHits = 0;
  let wikiHits = 0;
  let newsHits = 0;

  for (const r of reports) {
    try {
      // 1. Fetch + collect externals in parallel.
      const [fetched, externals] = await Promise.all([
        fetchAndCleanHomepage(`https://${r.domain}`),
        collectExternalDistributionSignals(r.domain),
      ]);

      // 2. Re-project so attributes (esp. monthly_floor_usd) are current.
      const projection = projectReport(r, r.detected_stack);
      await persistProjection(r.id, projection);

      // 3. Combine + persist distribution signals.
      const distribution = combineDistributionSignals(
        externals,
        fetched,
        projection.attributes,
      );
      await persistDistributionSignals(r.id, distribution);

      // 4. Recompute moat with the new axis + propagate wedge fields.
      const scored = await scoreMoatWithLLM({
        verdict: r,
        distribution,
        detectedStack: r.detected_stack,
      });
      if (scored.kind === "error") {
        throw new Error(`LLM moat scoring failed: ${scored.message}`);
      }
      const moat = scored.score;
      await persistMoatScore(r.id, moat, scored.judgment);

      const newWedgeScore = wedgeScoreFromAggregate(moat.aggregate);
      const newTier = tierFromWedgeScore(newWedgeScore);
      const newWeakest = weakestAxis(moat);
      await updateReportWedgeFields(r.id, {
        wedge_score: newWedgeScore,
        tier: newTier,
        weakest_moat_axis: newWeakest,
      });

      if (externals) {
        serpOk += 1;
        if (externals.knowledge_graph_present) kgHits += 1;
        if (externals.has_wikipedia) wikiHits += 1;
        if (externals.has_news) newsHits += 1;
      }

      ok += 1;
      const distLabel =
        moat.distribution === null ? "null" : `${moat.distribution.toFixed(1)}/10`;
      const kg = externals?.knowledge_graph_present ? "kg" : "—";
      const auth = externals?.authoritative_third_party_count ?? 0;
      const sl = externals?.has_sitelinks ? "sl" : "—";
      const top = externals?.top_organic_owned ? "top" : "—";
      const org = externals?.organic_count ?? "—";
      const comp = externals && externals.organic_count < 10 ? "comp" : "—";
      console.log(
        `[backfill] ${r.slug} · serp=${externals?.serp_own_domain_count ?? "—"} ` +
          `org=${org} ${comp} ${kg} ${sl} ${top} auth=${auth} ` +
          `· distribution ${distLabel} · moat ${moat.aggregate}/10`,
      );
    } catch (err) {
      failed += 1;
      console.error(`[backfill] ${r.slug} failed:`, err);
    }
  }

  console.log(
    `[backfill] done — ${ok} ok, ${failed} failed · serp coverage ${serpOk}/${ok}, ` +
      `KG hits ${kgHits}/${serpOk}, wiki hits ${wikiHits}/${serpOk}, news hits ${newsHits}/${serpOk}`,
  );
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
