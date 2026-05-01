import Link from "next/link";
import type { StoredReport } from "@/lib/db/reports";
import { TIER_STYLES, type DirectoryTier } from "@/components/directory/tiers";
import { TierBadge } from "@/components/directory/TierBadge";
import { CAPABILITIES } from "@/lib/normalization/taxonomy";

type Props = {
  /** Source-page slug — paired with `report.slug` to build the canonical
   *  alphabetical compare URL. The card itself becomes the entry point into
   *  the head-to-head surface, which is the SEO compounding play. */
  sourceSlug: string;
  report: StoredReport;
  shared_capabilities: string[];
  score_delta: number;
  wedge_capability_slugs: string[];
};

const CAP_LOOKUP = new Map(CAPABILITIES.map((c) => [c.slug, c.display_name.toLowerCase()]));

function capLabel(slug: string): string {
  return CAP_LOOKUP.get(slug) ?? slug.replace(/-/g, " ");
}

function formatDelta(delta: number): string {
  if (delta === 0) return "±0";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

const MAX_WEDGE_DISPLAY = 2;

export function SimilarCard({ sourceSlug, report, shared_capabilities, score_delta, wedge_capability_slugs }: Props) {
  const tier = report.tier as DirectoryTier;
  const t = TIER_STYLES[tier];
  const wedgeShown = wedge_capability_slugs.slice(0, MAX_WEDGE_DISPLAY).map(capLabel);
  const wedgeRemainder = wedge_capability_slugs.length - wedgeShown.length;
  const wedgeLine = wedgeShown.length
    ? `+ ${wedgeShown.join(", ")}${wedgeRemainder > 0 ? ` +${wedgeRemainder}` : ""}`
    : null;
  const sharedLine = shared_capabilities.length
    ? `via ${capLabel(shared_capabilities[0])}${shared_capabilities.length > 1 ? ` +${shared_capabilities.length - 1}` : ""}`
    : null;
  const [a, b] = sourceSlug < report.slug ? [sourceSlug, report.slug] : [report.slug, sourceSlug];
  const compareHref = `/compare/${a}-vs-${b}`;

  return (
    <Link
      href={compareHref}
      className="group bru border-[2.5px] bg-paper relative flex flex-col min-h-[200px] no-underline text-ink hover:translate-y-[-2px] hover:shadow-[3px_3px_0_0_#0a0a0a] transition-transform"
    >
      <div className="h-2 border-b-[2.5px] border-ink" style={{ background: t.bg }} />
      <div className="px-4 pt-4 pb-3.5 flex-1 flex flex-col">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="font-display font-bold text-[18px] tracking-[-0.02em] leading-[1.15] [overflow-wrap:anywhere]">
            {report.domain}
          </div>
          <TierBadge tier={tier} size="sm" />
        </div>
        <div className="font-display text-[12px] opacity-70 mb-3 [text-wrap:pretty] line-clamp-2">
          {report.tagline}
        </div>

        <div className="mt-auto border-t-[1.5px] border-dashed border-ink pt-2.5 font-mono text-[11px] tracking-[0.02em] flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-bold">
              <span className="text-base">{report.wedge_score}</span>
              <span className="opacity-60 text-[10px]"> /100</span>
              <span
                className={`ml-1.5 ${
                  score_delta > 0
                    ? "text-success"
                    : score_delta < 0
                      ? "text-danger"
                      : "opacity-60"
                }`}
              >
                {formatDelta(score_delta)}
              </span>
            </span>
            <span className="opacity-70 lowercase">{report.time_estimate}</span>
          </div>
          {wedgeLine && (
            <div className="text-[10.5px] opacity-75 [overflow-wrap:anywhere]">
              {wedgeLine}
            </div>
          )}
          {!wedgeLine && sharedLine && (
            <div className="text-[10.5px] opacity-60 [overflow-wrap:anywhere]">
              {sharedLine}
            </div>
          )}
        </div>
      </div>

      <div className="border-t-[2.5px] border-ink px-4 py-2 bg-paper-alt flex items-center justify-between font-mono text-[10.5px] tracking-[0.15em] uppercase font-bold">
        <span className="opacity-60 group-hover:opacity-100 transition-opacity">vs.</span>
        <span className="opacity-80 group-hover:opacity-100 group-hover:text-coral transition-colors">
          compare →
        </span>
      </div>
    </Link>
  );
}
