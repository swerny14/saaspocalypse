import type { CompareVerdict } from "@/lib/normalization/compare_verdict";

type Props = {
  aName: string;
  bName: string;
  verdict: CompareVerdict;
};

/**
 * Page title block. Leads with the brand-pair query, then asks the plain
 * user-intent question. "Wedge" remains in the metrics below, but the
 * headline should read naturally to someone arriving from search.
 */
export function TitleBlock({ aName, bName, verdict }: Props) {
  const isTie = verdict.winner === "tie";
  return (
    <header className="pb-6 mb-7 border-b-[2.5px] border-ink">
      <div className="flex items-center gap-2.5 mb-3.5 font-mono text-[11px] font-bold tracking-[0.2em] uppercase text-ink">
        <span className="w-2 h-2 rounded-full bg-coral" aria-hidden="true" />
        head-to-head
        <span className="text-muted font-medium">- moat comparison</span>
      </div>

      <h1 className="font-display font-bold text-[40px] sm:text-[52px] md:text-[64px] tracking-[-0.035em] leading-[0.96] m-0 [text-wrap:balance]">
        <RansomChip>{aName}</RansomChip>
        <span className="font-display mx-2">vs</span>
        <RansomChip>{bName}</RansomChip>
      </h1>
      <p className="font-display text-[18px] sm:text-[20px] font-medium text-muted m-0 mt-3 tracking-[-0.01em]">
        which is easier to compete with?
      </p>

      <div className="mt-5 flex items-baseline gap-3 flex-wrap">
        <span className="font-display font-bold text-[18px] sm:text-[20px] tracking-[-0.01em] text-ink">
          - {isTie ? "too close to call" : verdictHeadline(verdict.chip)}.
        </span>
        <span className="font-display text-[15px] text-muted">
          {verdict.summary}
        </span>
      </div>
    </header>
  );
}

function verdictHeadline(chip: string): string {
  return chip.toLowerCase();
}

function RansomChip({ children }: { children: React.ReactNode }) {
  return (
    <em className="not-italic inline-block bg-ink text-accent px-2.5 -translate-y-[2px] shadow-[4px_4px_0_0_var(--color-ink)] align-baseline">
      {children}
    </em>
  );
}
