import type { StoredReport } from "@/lib/db/reports";

const SITE_URL = "https://saaspocalypse.com";
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

export { SITE_URL, BRAND };
