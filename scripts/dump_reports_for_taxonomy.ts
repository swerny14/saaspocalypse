/**
 * Dump every report's identifying text fields + current matched capabilities,
 * for human + LLM review when designing new capability patterns. Read-only —
 * no DB writes.
 *
 * Run with: pnpm tsx scripts/dump_reports_for_taxonomy.ts > reports.txt
 *
 * Output format: one report per block, separated by `---`. Capabilities
 * already matched by the engine are listed at the end so the gaps are
 * obvious (e.g. calendly + cal.com both lacking a `scheduling` cap).
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { getAllReports } from "../lib/db/reports";
import { getAllSimilarityCandidates } from "../lib/db/projections";

async function main() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL. Set it in .env.local before running.");
    process.exit(1);
  }

  const [reports, candidates] = await Promise.all([
    getAllReports(5000),
    getAllSimilarityCandidates(),
  ]);

  reports.sort((a, b) => a.name.localeCompare(b.name));

  for (const r of reports) {
    const candidate = candidates.get(r.id);
    const caps = candidate ? Array.from(candidate.capabilities).sort() : [];
    process.stdout.write(`SLUG:     ${r.slug}\n`);
    process.stdout.write(`NAME:     ${r.name}\n`);
    process.stdout.write(`TAGLINE:  ${r.tagline}\n`);
    process.stdout.write(`TAKE:     ${r.take.replace(/\s+/g, " ").trim()}\n`);
    if (r.take_sub) {
      process.stdout.write(`TAKE_SUB: ${r.take_sub.replace(/\s+/g, " ").trim()}\n`);
    }
    process.stdout.write(`CAPS:     ${caps.join(", ") || "(none)"}\n`);
    process.stdout.write(`---\n`);
  }

  console.error(`\nDumped ${reports.length} reports.`);
}

main().catch((err) => {
  console.error("[dump_reports_for_taxonomy] failed:", err);
  process.exit(1);
});
