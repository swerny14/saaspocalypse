import Link from "next/link";
import { getRecentReports, type StoredReport } from "@/lib/db/reports";
import { TIER_FG } from "@/lib/scanner/schema";
import { SectionHead } from "./SectionHead";

export async function VerdictGrid() {
  const reports = await getRecentReports(6);

  return (
    <section id="examples" className="py-20">
      <div className="container">
        <SectionHead
          eyebrow="Recent verdicts"
          title="We've been busy judging."
          sub="Fresh out of the scanner, still warm to the touch."
        />

        {reports.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-[22px] mt-10 grid-cols-[repeat(auto-fill,minmax(340px,1fr))]">
            {reports.map((r) => (
              <VerdictCard key={r.id} r={r} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="bru bg-paper mt-10 p-10 font-mono text-sm opacity-70">
      ▸ no verdicts yet. be the first — paste a URL above.
    </div>
  );
}

function VerdictCard({ r }: { r: StoredReport }) {
  const tierColor = TIER_FG[r.tier];
  return (
    <Link
      href={`/r/${r.slug}`}
      className="bru bg-paper p-[22px] grid gap-3.5 no-underline text-ink hover:shadow-[8px_8px_0_0_#0a0a0a] transition-shadow"
    >
      <div className="flex justify-between items-center">
        <div className="font-mono text-[13px] text-muted">▸ {r.name}</div>
        <div
          className="font-mono text-[10px] font-bold tracking-[0.1em] text-ink px-2 py-[3px]"
          style={{ background: tierColor }}
        >
          {r.tier}
        </div>
      </div>
      <div className="flex items-baseline gap-2">
        <div
          className="font-display text-[56px] font-bold leading-none tracking-[-0.03em]"
          style={{ color: tierColor }}
        >
          {r.wedge_score}
        </div>
        <div className="font-mono text-[13px] text-muted">/100</div>
        <div className="ml-auto font-mono text-xs text-right">
          <div>{r.time_estimate}</div>
          <div className="text-muted">{formatTotal(r.est_total)}</div>
        </div>
      </div>
      <p className="font-display text-[17px] font-medium leading-[1.35] m-0 tracking-[-0.005em]">
        &ldquo;{r.take}&rdquo;
      </p>
      <div className="border-t-[1.5px] border-dashed border-ink pt-3 font-mono text-xs grid gap-1">
        {r.stack.slice(0, 3).map((s, i) => (
          <div key={i} className="opacity-80">
            · {s}
          </div>
        ))}
        {r.stack.length > 3 && (
          <div className="opacity-50">+ {r.stack.length - 3} more</div>
        )}
      </div>
    </Link>
  );
}

function formatTotal(v: number | string): string {
  if (typeof v === "string") return v;
  if (v === 0) return "$0/mo";
  if (v < 100) return `$${v.toFixed(2)}/mo`;
  return `$${v.toLocaleString()}/mo`;
}
