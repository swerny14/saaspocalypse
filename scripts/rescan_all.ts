/**
 * Phase 2.5 corpus re-scan: wipes the reports table cascade, then re-runs
 * the scanner pipeline against every domain that was previously scanned.
 *
 * Why a re-scan instead of a backfill:
 *   - The LLM voice and contract changed end-to-end (wedge thesis added,
 *     score+tier+difficulty+confidence dropped from the schema).
 *   - The moat scoring formulas for capital + technical changed; the
 *     wedge score is now derived from the moat aggregate.
 *   - Old `report.score` had a different semantic — keeping it under a
 *     new name would just confuse downstream consumers forever.
 *
 * Run with: pnpm tsx scripts/rescan_all.ts
 *
 * Requires: SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY in .env.local
 *           (plus SERPER_API_KEY for distribution-axis scoring).
 *
 * Safety: the truncate happens only after a confirmation prompt unless you
 * pass --no-confirm. Restricted to non-production by default (NODE_ENV
 * check) — pass --allow-prod to override.
 */

import { config as loadEnv } from "dotenv";
import { createInterface } from "node:readline";
import { stdin, stdout, exit, argv } from "node:process";

// Load env BEFORE importing any module that reads process.env.
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const args = new Set(argv.slice(2));
const NO_CONFIRM = args.has("--no-confirm");
const ALLOW_PROD = args.has("--allow-prod");
const VERBOSE = args.has("--verbose") || args.has("-v");

if (process.env.NODE_ENV === "production" && !ALLOW_PROD) {
  console.error(
    "[rescan] NODE_ENV=production. Pass --allow-prod to confirm. Aborting.",
  );
  exit(1);
}
if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error("[rescan] missing SUPABASE_SERVICE_ROLE_KEY. Aborting.");
  exit(1);
}
if (!process.env.ANTHROPIC_API_KEY) {
  console.error("[rescan] missing ANTHROPIC_API_KEY. Aborting.");
  exit(1);
}

async function main() {
  // Lazy import so env is loaded first.
  const { getSupabaseAdmin } = await import("../lib/db/supabase");
  const { runScan } = await import("../lib/scanner/pipeline");

  const admin = getSupabaseAdmin();

  // 1. Snapshot the existing domain list.
  const { data: existing, error: listErr } = await admin
    .from("reports")
    .select("domain, slug")
    .order("created_at", { ascending: true });
  if (listErr) {
    console.error("[rescan] failed to list reports:", listErr);
    exit(1);
  }
  const domains = (existing ?? []).map(
    (r: { domain: string; slug: string }) => ({ domain: r.domain, slug: r.slug }),
  );
  console.log(`[rescan] found ${domains.length} reports to re-scan.`);
  if (domains.length === 0) {
    console.log("[rescan] nothing to do.");
    return;
  }

  // 2. Confirm before truncating.
  if (!NO_CONFIRM) {
    const ok = await confirm(
      `[rescan] About to TRUNCATE reports + cascade ${domains.length} rows + every projection / moat / similarity-gap / build_guide / purchase. Continue?`,
    );
    if (!ok) {
      console.log("[rescan] aborted by user.");
      return;
    }
  }

  // 3. Truncate cascade via the SECURITY DEFINER RPC.
  console.log("[rescan] truncating reports cascade…");
  const { error: truncErr } = await admin.rpc("truncate_reports_cascade");
  if (truncErr) {
    console.error("[rescan] truncate failed:", truncErr);
    exit(1);
  }
  console.log("[rescan] truncate complete.");

  // 4. Re-scan each domain sequentially. Parallel scans would race the
  //    domain-lock infra and inflate per-Anthropic / per-Serper bills.
  let okCount = 0;
  let errCount = 0;
  for (let i = 0; i < domains.length; i += 1) {
    const { domain } = domains[i];
    const tag = `[${i + 1}/${domains.length}] ${domain}`;
    console.log(`${tag} scanning…`);
    let lastEvent: string | null = null;
    try {
      await runScan(
        { url: `https://${domain}`, ip: "rescan-script" },
        async (event) => {
          lastEvent = event.type;
          if (VERBOSE) console.log(`${tag} · ${event.type}`);
        },
      );
      if (lastEvent === "done") {
        okCount += 1;
        console.log(`${tag} ✓ ok`);
      } else {
        errCount += 1;
        console.log(`${tag} ✗ ended with ${lastEvent ?? "no events"}`);
      }
    } catch (e) {
      errCount += 1;
      console.error(
        `${tag} ✗ threw:`,
        e instanceof Error ? e.message : String(e),
      );
    }
  }

  console.log(
    `[rescan] done — ${okCount} succeeded, ${errCount} failed out of ${domains.length}.`,
  );
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
