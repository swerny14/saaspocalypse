import type { StoredReport } from "@/lib/db/reports";

const SITE_URL = "https://www.saaspocalypse.dev";
const BRAND = "saaspocalypse";

/**
 * Front-loads the search intent a builder is likely to have:
 * "can I build/compete with X?" The report can still use wedge language
 * once the user understands the frame.
 */
export function reportTitle(report: StoredReport): string {
  return `Can you compete with ${report.name}? ${report.tier} - wedge score ${report.wedge_score} | ${BRAND}`;
}

export function reportOgTitle(report: StoredReport): string {
  return `${report.name} moat scan: wedge score ${report.wedge_score}/100, ${report.tier} tier - ${BRAND}`;
}

/**
 * Description blends keyword phrases with the take. Aims for <=155 chars
 * when possible so search snippets and social previews stay readable.
 */
export function reportDescription(report: StoredReport): string {
  const stack = report.stack.slice(0, 3).join(", ");
  const stack2 = report.stack.slice(0, 2).join(", ");
  const firstSentence = (report.take.match(/^[^.!?]+[.!?]?/)?.[0] ?? report.take).trim();

  const parts = [
    `Moat scan for ${report.name}.`,
    `Wedge score ${report.wedge_score}/100.`,
    `Build time: ${report.time_estimate}.`,
    `Stack: ${stack}.`,
    firstSentence,
  ];
  const full = parts.join(" ");
  if (full.length <= 155) return full;

  const noTake = `Moat scan for ${report.name}. Wedge score ${report.wedge_score}/100. Build time: ${report.time_estimate}. Stack: ${stack}.`;
  if (noTake.length <= 155) return noTake;

  return `Moat scan for ${report.name}. Wedge score ${report.wedge_score}/100. Build time: ${report.time_estimate}. Stack: ${stack2}.`;
}

export function reportCanonical(slug: string): string {
  return `${SITE_URL}/r/${slug}`;
}

export function compareCanonical(slugA: string, slugB: string): string {
  return `${SITE_URL}/compare/${slugA}-vs-${slugB}`;
}

export function comparePageTitle(a: StoredReport, b: StoredReport): string {
  return `${a.name} vs ${b.name}: which SaaS is easier to compete with? - ${BRAND}`;
}

export function comparePageOgTitle(a: StoredReport, b: StoredReport): string {
  return `${a.name} vs ${b.name}: SaaS moat comparison - ${a.wedge_score}/100 vs ${b.wedge_score}/100 | ${BRAND}`;
}

export function comparePageDescription(a: StoredReport, b: StoredReport): string {
  const full = `${a.name} vs ${b.name}. Compare wedge scores, moat depth, stack, capabilities, cost, and estimated build time side by side.`;
  if (full.length <= 155) return full;
  return `${a.name} vs ${b.name}. Wedge score ${a.wedge_score} vs ${b.wedge_score}. ${a.time_estimate} vs ${b.time_estimate}.`;
}

export { SITE_URL, BRAND };
