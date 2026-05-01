/**
 * Dump the raw Serper response for one or more domains so we can see
 * exactly which fields are present and what shape they take. Use this
 * when distribution-axis signals are firing inconsistently — it tells
 * us in one call whether the issue is field-naming (extraction wrong)
 * or signal-availability (Serper isn't returning the data).
 *
 * Run with: pnpm tsx scripts/debug_serper.ts stripe.com chatgpt.com linear.app
 *
 * For each domain, prints:
 *   - Full list of top-level response keys
 *   - Specific signal-relevant counts (kg present, paa size, related size,
 *     topStories size, news size, organic count)
 *   - Top 10 organic links
 *   - knowledgeGraph title + type if present
 */

import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const apiKey = process.env.SERPER_API_KEY;
if (!apiKey) {
  console.error("Missing SERPER_API_KEY. Set it in .env.local.");
  process.exit(1);
}

const domains = process.argv.slice(2);
if (domains.length === 0) {
  console.error("Usage: pnpm tsx scripts/debug_serper.ts <domain1> [domain2] ...");
  console.error("       pnpm tsx scripts/debug_serper.ts stripe.com chatgpt.com linear.app");
  process.exit(1);
}

async function main() {
  for (const domain of domains) {
    const query = domain.split(".")[0] || domain;
    console.log(`\n${"=".repeat(80)}`);
    console.log(`DOMAIN: ${domain}    QUERY: "${query}"`);
    console.log("=".repeat(80));

    const res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 10 }),
    });

    if (!res.ok) {
      console.error(`HTTP ${res.status} ${res.statusText}`);
      continue;
    }

    const data = (await res.json()) as Record<string, unknown>;

    console.log(`\nTOP-LEVEL KEYS: ${Object.keys(data).join(", ")}`);

    // Specific signal probes — the fields we care about for distribution scoring.
    const probes = [
      "knowledgeGraph",
      "answerBox",
      "peopleAlsoAsk",
      "relatedSearches",
      "topStories",
      "news",
      "topNews",
      "aiOverview",
      "ai_overview",
      "places",
      "videos",
      "images",
      "thingsToKnow",
      "things_to_know",
      "discussions",
      "discussionsAndForums",
      "searchInformation",
    ];

    console.log("\nSIGNAL PROBES:");
    for (const key of probes) {
      const v = data[key];
      if (v === undefined) {
        // Don't print missing keys; they clutter output. Only show what's present.
        continue;
      }
      if (Array.isArray(v)) {
        console.log(`  ${key}: array(${v.length})`);
      } else if (v && typeof v === "object") {
        console.log(`  ${key}: object{${Object.keys(v).slice(0, 6).join(", ")}}`);
      } else {
        console.log(`  ${key}: ${typeof v} = ${JSON.stringify(v).slice(0, 100)}`);
      }
    }

    // Knowledge graph detail.
    if (data.knowledgeGraph && typeof data.knowledgeGraph === "object") {
      const kg = data.knowledgeGraph as Record<string, unknown>;
      console.log("\nKNOWLEDGE GRAPH:");
      console.log(`  title: ${kg.title}`);
      console.log(`  type: ${kg.type}`);
      console.log(`  description (first 100): ${String(kg.description ?? "").slice(0, 100)}`);
      console.log(`  attributes keys: ${kg.attributes ? Object.keys(kg.attributes as object).join(", ") : "(none)"}`);
      console.log(`  socialMedia keys: ${kg.socialMedia ? Object.keys(kg.socialMedia as object).join(", ") : "(none)"}`);
    }

    // Search information detail.
    if (data.searchInformation && typeof data.searchInformation === "object") {
      console.log("\nSEARCH INFORMATION:");
      console.log(`  ${JSON.stringify(data.searchInformation, null, 2)}`);
    }

    // Organic results.
    if (Array.isArray(data.organic)) {
      console.log(`\nORGANIC RESULTS (${data.organic.length} total):`);
      data.organic.slice(0, 10).forEach((r: unknown, i: number) => {
        const row = r as Record<string, unknown>;
        const sl = Array.isArray(row.sitelinks) ? `[+${row.sitelinks.length} sitelinks]` : "";
        const date = row.date ? `[date: ${row.date}]` : "";
        console.log(`  ${i}: ${row.link} ${sl}${date}`);
      });
    }

    // PAA detail.
    if (Array.isArray(data.peopleAlsoAsk) && data.peopleAlsoAsk.length > 0) {
      console.log(`\nPEOPLE ALSO ASK (${data.peopleAlsoAsk.length} items):`);
      data.peopleAlsoAsk.slice(0, 5).forEach((r: unknown, i: number) => {
        const row = r as Record<string, unknown>;
        console.log(`  ${i}: ${row.question}`);
      });
    }

    // Related searches detail.
    if (Array.isArray(data.relatedSearches) && data.relatedSearches.length > 0) {
      console.log(`\nRELATED SEARCHES (${data.relatedSearches.length} items):`);
      data.relatedSearches.slice(0, 5).forEach((r: unknown) => {
        const row = r as Record<string, unknown>;
        console.log(`  - ${row.query}`);
      });
    }

    // News detail.
    if (Array.isArray(data.topStories) && data.topStories.length > 0) {
      console.log(`\nTOP STORIES (${data.topStories.length}):`);
      data.topStories.slice(0, 3).forEach((r: unknown) => {
        const row = r as Record<string, unknown>;
        console.log(`  - ${row.title} [${row.source}, ${row.date}]`);
      });
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
