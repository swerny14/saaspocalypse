import type { CompareSide } from "@/lib/db/compare";

type Props = {
  a: CompareSide;
  b: CompareSide;
};

const TIER_BG: Record<string, string> = {
  WEEKEND: "var(--color-accent)",
  MONTH: "var(--color-sticky)",
  "DON'T": "var(--color-coral)",
};

/**
 * Page outro. A single paired card that mirrors the head-to-head twin at the
 * top — each half is a clickable link to the corresponding `/r/<slug>` page,
 * carrying just enough signal (tier + score) to feel like a real next step
 * rather than a bare anchor. Below it, a single thin rail back to the
 * directory.
 */
export function CompareFooter({ a, b }: Props) {
  return (
    <>
      <section className="bg-paper border-[2.5px] border-ink shadow-[6px_6px_0_0_var(--color-ink)] mt-7 grid grid-cols-1 md:grid-cols-2 overflow-hidden">
        <ReportLink side={a} variant="left" />
        <ReportLink side={b} variant="right" />
      </section>
      <div className="flex justify-between items-center mt-9 pt-4 border-t-[1.5px] border-ink font-mono text-[11px] font-medium tracking-[0.18em] uppercase text-muted">
        <a href="/directory" className="text-muted no-underline hover:text-coral">
          ← saaspocalypse · directory
        </a>
        <span>head-to-head</span>
      </div>
    </>
  );
}

function ReportLink({
  side,
  variant,
}: {
  side: CompareSide;
  variant: "left" | "right";
}) {
  const r = side.report;
  const tierBg = TIER_BG[r.tier] ?? "var(--color-paper)";
  return (
    <a
      href={`/r/${r.slug}`}
      className={`group block px-7 py-6 no-underline text-ink transition-colors ${
        variant === "right"
          ? "bg-paper-alt md:border-l-[2.5px] max-md:border-t-[2.5px] border-ink"
          : "bg-paper"
      } hover:bg-bg`}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="font-mono text-[10.5px] font-bold tracking-[0.18em] uppercase text-muted">
          full report
        </span>
        <span
          className="font-mono text-[10.5px] font-bold tracking-[0.16em] uppercase px-2 py-[3px] border-2 border-ink shadow-[2px_2px_0_0_var(--color-ink)] whitespace-nowrap"
          style={{ background: tierBg }}
        >
          {r.tier === "DON'T" ? "don't" : r.tier.toLowerCase()} · {r.score}
        </span>
      </div>
      <div className="font-display font-bold text-[24px] sm:text-[28px] tracking-[-0.02em] leading-[1.1] [overflow-wrap:anywhere] group-hover:text-coral transition-colors">
        → read the {r.name} report
      </div>
    </a>
  );
}
