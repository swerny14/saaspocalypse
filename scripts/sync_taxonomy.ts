/**
 * Mirror the TS taxonomy modules under lib/normalization/taxonomy/ into
 * Supabase. Idempotent — re-run after editing any taxonomy file to push
 * changes to the DB. Does NOT delete entries that disappeared from TS;
 * removing a canonical slug is a deliberate manual step (FK-referenced by
 * report_components/report_capabilities).
 *
 * Run with: pnpm tsx scripts/sync_taxonomy.ts
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { syncTaxonomyToDb } from "../lib/db/taxonomy";

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Set it in .env.local before running.",
    );
    process.exit(1);
  }
  const counts = await syncTaxonomyToDb();
  console.log(
    `[taxonomy] synced — ${counts.components} components, ${counts.capabilities} capabilities, ${counts.segments} segments, ${counts.models} models`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
