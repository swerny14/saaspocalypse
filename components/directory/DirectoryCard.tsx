import Link from "next/link";
import type { StoredReport } from "@/lib/db/reports";
import { TIER_STYLES, type DirectoryTier } from "./tiers";
import { TierBadge } from "./TierBadge";
import { ScoreBar } from "./ScoreBar";

type Props = {
  report: StoredReport;
  scanIndex: number;
};

function formatScannedAt(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
}

function formatViewCount(n: number): string {
  return n.toLocaleString();
}

export function DirectoryCard({ report, scanIndex }: Props) {
  const tier = report.tier as DirectoryTier;
  const t = TIER_STYLES[tier];
  const scannedAt = formatScannedAt(report.scanned_at);

  return (
    <Link
      href={`/r/${report.slug}`}
      className="bru border-[2.5px] bg-paper relative flex flex-col min-h-[220px] no-underline text-ink hover:translate-y-[-2px] hover:shadow-[3px_3px_0_0_#0a0a0a] transition-transform"
    >
      <div
        className="h-2 border-b-[2.5px] border-ink"
        style={{ background: t.bg }}
      />
      <div className="px-5 pt-[18px] pb-4 flex-1 flex flex-col">
        <div className="flex justify-between font-mono text-[10px] font-bold tracking-[0.15em] uppercase opacity-65 mb-2.5">
          <span>scan №&nbsp;{String(scanIndex).padStart(3, "0")}</span>
          <span>{scannedAt}</span>
        </div>

        <div className="font-display font-bold text-[22px] tracking-[-0.02em] mb-1">
          {report.domain}
        </div>
        <div className="font-display text-[13px] opacity-70 mb-3.5 [text-wrap:pretty]">
          {report.tagline}
        </div>

        <div className="flex items-center justify-between mb-3 gap-2">
          <TierBadge tier={tier} />
          <ScoreBar score={report.wedge_score} width={120} />
        </div>

        <div className="mt-auto flex justify-between items-center border-t-[1.5px] border-dashed border-ink pt-2.5 font-mono text-[11px] font-bold tracking-[0.05em]">
          <span className="opacity-70">{report.time_estimate}</span>
          <span className="opacity-70">{formatViewCount(report.view_count)}&nbsp;👁</span>
        </div>
      </div>
    </Link>
  );
}
