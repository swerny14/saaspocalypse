import type { StoredReport } from "@/lib/db/reports";

const SITE_URL = "https://www.saaspocalypse.dev";
const BRAND = "saaspocalypse";

/** Front-loads the long-tail query phrase users actually search for. */
export function reportTitle(report: StoredReport): string {
  return `Can I build ${report.name}? — ${report.tier} · ${report.time_estimate} · ${BRAND}`;
}

/** Longer form OG title for Twitter/Slack/LinkedIn previews. */
export function reportOgTitle(report: StoredReport): string {
  return `Can I build ${report.name} myself? Buildability ${report.score}/100, ${report.tier} tier — ${BRAND}`;
}

/**
 * Description blends keyword phrases with the take. Aims for ≤155 chars
 * (Google truncates around there). Falls back gracefully when full body
 * would overflow.
 */
export function reportDescription(report: StoredReport): string {
  const stack = report.stack.slice(0, 3).join(", ");
  const stack2 = report.stack.slice(0, 2).join(", ");
  const firstSentence = (report.take.match(/^[^.!?]+[.!?]?/)?.[0] ?? report.take).trim();

  const parts = [
    `Buildability score ${report.score}/100.`,
    `Estimated build time: ${report.time_estimate}.`,
    `Stack: ${stack}.`,
    firstSentence,
  ];
  const full = parts.join(" ");
  if (full.length <= 155) return full;

  const noTake = `Buildability score ${report.score}/100. Estimated build time: ${report.time_estimate}. Stack: ${stack}.`;
  if (noTake.length <= 155) return noTake;

  return `Buildability score ${report.score}/100. Estimated build time: ${report.time_estimate}. Stack: ${stack2}.`;
}

export function reportCanonical(slug: string): string {
  return `${SITE_URL}/r/${slug}`;
}

/** Canonical compare URL — alphabetical slug ordering enforced by caller. */
export function compareCanonical(slugA: string, slugB: string): string {
  return `${SITE_URL}/compare/${slugA}-vs-${slugB}`;
}

/**
 * Title targets *comparison* intent (`X vs Y: which is easier to build`),
 * not the per-report "Can I build X" intent. Keeps the long-tail comparison
 * query phrase up front for SERP CTR.
 */
export function comparePageTitle(a: StoredReport, b: StoredReport): string {
  return `${a.name} vs ${b.name}: which is easier to build? — ${BRAND}`;
}

/** Longer share-card form. Adds tier + score signal so previews aren't bare. */
export function comparePageOgTitle(a: StoredReport, b: StoredReport): string {
  return `${a.name} vs ${b.name}: head-to-head buildability — ${a.score}/100 vs ${b.score}/100 · ${BRAND}`;
}

/**
 * ≤155 chars when possible. Stack lists keep brand names readable; falls back
 * to a stack-less form when the full version overflows.
 */
export function comparePageDescription(a: StoredReport, b: StoredReport): string {
  const full = `${a.name} vs ${b.name}. Buildability ${a.score} vs ${b.score}. ${a.time_estimate} vs ${b.time_estimate}. Stack, capabilities, cost — side by side.`;
  if (full.length <= 155) return full;
  return `${a.name} vs ${b.name}. Buildability ${a.score} vs ${b.score}. ${a.time_estimate} vs ${b.time_estimate}.`;
}

export { SITE_URL, BRAND };
