/**
 * Wipe the current report corpus and scan the curated high-awareness SaaS set.
 *
 * Run with: pnpm tsx scripts/scan_curated_sites.ts
 *
 * Flags:
 *   --no-confirm   Skip the destructive confirmation prompt.
 *   --allow-prod   Allow running with NODE_ENV=production.
 *   --verbose      Print every scan event.
 */

import { config as loadEnv } from "dotenv";
import { createInterface } from "node:readline";
import { stdin, stdout, exit, argv } from "node:process";
import {
  CURATED_SCAN_SITES,
  assertCuratedScanSiteCount,
} from "./curated_sites";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const args = new Set(argv.slice(2));
const NO_CONFIRM = args.has("--no-confirm");
const ALLOW_PROD = args.has("--allow-prod");
const VERBOSE = args.has("--verbose") || args.has("-v");

if (process.env.NODE_ENV === "production" && !ALLOW_PROD) {
  console.error(
    "[curated-scan] NODE_ENV=production. Pass --allow-prod to confirm. Aborting.",
  );
  exit(1);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[curated-scan] missing SUPABASE_SERVICE_ROLE_KEY. Aborting.");
  exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("[curated-scan] missing ANTHROPIC_API_KEY. Aborting.");
  exit(1);
}

async function main() {
  assertCuratedScanSiteCount(50);

  const { getSupabaseAdmin } = await import("../lib/db/supabase");
  const { runScan } = await import("../lib/scanner/pipeline");
  const { loadEngineContextFromDb } = await import("../lib/db/taxonomy_loader");

  const admin = getSupabaseAdmin();
  const { context: engineContext } = await loadEngineContextFromDb();

  const counts = CURATED_SCAN_SITES.reduce(
    (acc, site) => {
      acc[site.expectedTier] += 1;
      return acc;
    },
    { FORTRESS: 0, CONTESTED: 0, SOFT: 0 },
  );

  console.log(
    `[curated-scan] ${CURATED_SCAN_SITES.length} sites queued (${counts.FORTRESS} fortress, ${counts.CONTESTED} contested, ${counts.SOFT} soft planning labels).`,
  );

  if (!NO_CONFIRM) {
    const ok = await confirm(
      `[curated-scan] About to TRUNCATE reports cascade and replace it with ${CURATED_SCAN_SITES.length} curated scans. Continue?`,
    );
    if (!ok) {
      console.log("[curated-scan] aborted by user.");
      return;
    }
  }

  console.log("[curated-scan] truncating reports cascade...");
  const { error: truncErr } = await admin.rpc("truncate_reports_cascade");
  if (truncErr) {
    console.error("[curated-scan] truncate failed:", truncErr);
    exit(1);
  }
  console.log("[curated-scan] truncate complete.");

  let okCount = 0;
  let errCount = 0;
  for (let i = 0; i < CURATED_SCAN_SITES.length; i += 1) {
    const site = CURATED_SCAN_SITES[i];
    const tag = `[${i + 1}/${CURATED_SCAN_SITES.length}] ${site.domain}`;
    console.log(
      `${tag} scanning (${site.category}, expected ${site.expectedTier.toLowerCase()})...`,
    );
    let lastEvent: string | null = null;

    try {
      await runScan(
        {
          url: `https://${site.domain}`,
          ip: "curated-scan-script",
          brandQuery: site.brandQuery,
        },
        async (event) => {
          lastEvent = event.type;
          if (VERBOSE) console.log(`${tag} - ${event.type}`);
        },
        {
          engineContext,
          skipRateLimit: true,
        },
      );
      if (lastEvent === "done") {
        okCount += 1;
        console.log(`${tag} ok`);
      } else {
        errCount += 1;
        console.log(`${tag} ended with ${lastEvent ?? "no events"}`);
      }
    } catch (e) {
      errCount += 1;
      console.error(
        `${tag} threw:`,
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  console.log(
    `[curated-scan] done - ${okCount} succeeded, ${errCount} failed out of ${CURATED_SCAN_SITES.length}.`,
  );
  if (errCount > 0) exit(1);
}

async function confirm(prompt: string): Promise<boolean> {
  const rl = createInterface({ input: stdin, output: stdout });
  return new Promise<boolean>((resolve) => {
    rl.question(`${prompt} (yes/no) `, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase() === "yes");
    });
  });
}

main().catch((err) => {
  console.error(err);
  exit(1);
});
