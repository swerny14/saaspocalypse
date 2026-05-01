/**
 * Dump the raw distribution-axis signals for every report alongside the
 * stored aggregate and distribution scores. Used during calibration to
 * see what the underlying numbers look like — tells you in seconds
 * whether a low score is driven by missing Knowledge Graph, weak SERP,
 * Wikipedia gap, or scoring-curve issue.
 *
 * Run with: pnpm tsx scripts/diagnose_distribution.ts [--sort=dist|agg|name] [--limit=N]
 *
 * Defaults: sort by distribution desc, all rows.
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

import { getSupabaseAdmin } from "../lib/db/supabase";

type Row = {
  slug: string;
  name: string;
  serp: number | null;
  org: number | null;
  kg: boolean | null;
  auth: number | null;
  top: boolean | null;
  sl: boolean | null;
  pricing_gate: string | null;
  distribution: number | null;
  aggregate: number | null;
};

async function main() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY. Set it in .env.local.");
    process.exit(1);
  }

  const args = process.argv.slice(2);
  const sortArg = args.find((a) => a.startsWith("--sort="))?.slice("--sort=".length) ?? "dist";
  const limitArg = args.find((a) => a.startsWith("--limit="))?.slice("--limit=".length);
  const limit = limitArg ? Number.parseInt(limitArg, 10) : Infinity;

  const admin = getSupabaseAdmin();
  const { data: reports, error: rErr } = await admin
    .from("reports")
    .select("id, slug, name")
    .order("slug");
  if (rErr) {
    console.error("reports query failed:", rErr);
    process.exit(1);
  }

  const ids = (reports ?? []).map((r) => r.id);
  const { data: attrs, error: aErr } = await admin
    .from("report_attributes")
    .select(
      "report_id, serp_own_domain_count, organic_count, knowledge_graph_present, authoritative_third_party_count, top_organic_owned, has_sitelinks, pricing_gate",
    )
    .in("report_id", ids);
  if (aErr) {
    console.error("attributes query failed:", aErr);
    process.exit(1);
  }
  const { data: scores, error: sErr } = await admin
    .from("report_moat_scores")
    .select("report_id, distribution, aggregate")
    .in("report_id", ids);
  if (sErr) {
    console.error("scores query failed:", sErr);
    process.exit(1);
  }

  const attrMap = new Map((attrs ?? []).map((a) => [a.report_id, a]));
  const scoreMap = new Map((scores ?? []).map((s) => [s.report_id, s]));

  const rows: Row[] = (reports ?? []).map((r) => {
    const a = attrMap.get(r.id);
    const s = scoreMap.get(r.id);
    return {
      slug: r.slug,
      name: r.name,
      serp: a?.serp_own_domain_count ?? null,
      org: a?.organic_count ?? null,
      kg: a?.knowledge_graph_present ?? null,
      auth: a?.authoritative_third_party_count ?? null,
      top: a?.top_organic_owned ?? null,
      sl: a?.has_sitelinks ?? null,
      pricing_gate: a?.pricing_gate ?? null,
      distribution: s?.distribution ?? null,
      aggregate: s?.aggregate ?? null,
    };
  });

  rows.sort((a, b) => {
    if (sortArg === "name") return a.slug.localeCompare(b.slug);
    if (sortArg === "agg") return (b.aggregate ?? -1) - (a.aggregate ?? -1);
    return (b.distribution ?? -1) - (a.distribution ?? -1);
  });

  const sliced = Number.isFinite(limit) ? rows.slice(0, limit) : rows;

  const colWidths = {
    slug: Math.max(12, ...sliced.map((r) => r.slug.length)),
    name: Math.max(12, ...sliced.map((r) => r.name.length)),
  };
  const pad = (s: string, w: number) => s + " ".repeat(Math.max(0, w - s.length));
  const flag = (v: boolean | null) => (v === null ? "—" : v ? "✓" : ".");
  console.log(
    `${pad("slug", colWidths.slug)}  ${pad("name", colWidths.name)}  serp  org  kg  sl  top  auth  comp   gate    dist  agg`,
  );
  console.log("-".repeat(colWidths.slug + colWidths.name + 60));
  for (const r of sliced) {
    const dist = r.distribution === null ? "—" : r.distribution.toFixed(1);
    const agg = r.aggregate === null ? "—" : r.aggregate.toFixed(1);
    const comp = r.org !== null && r.org < 10 ? "✓" : r.org === null ? "—" : ".";
    console.log(
      `${pad(r.slug, colWidths.slug)}  ${pad(r.name, colWidths.name)}  ` +
        `${pad(String(r.serp ?? "—"), 4)}  ${pad(String(r.org ?? "—"), 3)}  ` +
        `${flag(r.kg)}   ${flag(r.sl)}   ${flag(r.top)}    ${pad(String(r.auth ?? "—"), 3)}   ${comp}     ` +
        `${pad(r.pricing_gate ?? "—", 6)}  ${pad(dist, 4)}  ${agg}`,
    );
  }

  // Summary stats
  const dists = rows.map((r) => r.distribution).filter((x): x is number => x !== null);
  const aggs = rows.map((r) => r.aggregate).filter((x): x is number => x !== null);
  const mean = (xs: number[]) =>
    xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length;
  const median = (xs: number[]) => {
    if (xs.length === 0) return 0;
    const sorted = [...xs].sort((a, b) => a - b);
    return sorted[Math.floor(sorted.length / 2)];
  };
  const serpOk = rows.filter((r) => r.kg !== null).length;
  const kgHits = rows.filter((r) => r.kg === true).length;
  const slHits = rows.filter((r) => r.sl === true).length;
  const topHits = rows.filter((r) => r.top === true).length;
  const compHits = rows.filter((r) => r.org !== null && r.org < 10).length;
  const authMean =
    rows.filter((r) => r.auth !== null).reduce((a, r) => a + (r.auth ?? 0), 0) /
    Math.max(1, rows.filter((r) => r.auth !== null).length);

  console.log();
  console.log(`distribution mean ${mean(dists).toFixed(2)}, median ${median(dists).toFixed(2)} (n=${dists.length})`);
  console.log(`aggregate    mean ${mean(aggs).toFixed(2)}, median ${median(aggs).toFixed(2)} (n=${aggs.length})`);
  console.log(
    `signal coverage (n=${serpOk}): kg ${kgHits}, sitelinks ${slHits}, top-organic ${topHits}, compressed-organic ${compHits}, auth-avg ${authMean.toFixed(1)}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
