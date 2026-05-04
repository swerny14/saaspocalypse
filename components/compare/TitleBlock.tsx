type Props = {
  aName: string;
  bName: string;
};

/**
 * Page title block. Poses the question without spoiling the verdict — the
 * chip + reasons + CTA now live in the bottom VerdictBand so the page
 * builds toward a conclusion rather than landing it twice. The case-file
 * header strip mirrors the verdict report's framing so the surfaces feel
 * like the same investigation.
 */
export function TitleBlock({ aName, bName }: Props) {
  return (
    <header className="mb-7 border-[2.5px] border-ink shadow-[6px_6px_0_0_var(--color-ink)] bg-paper">
      {/* CASE-FILE STRIP — mirrors the verdict report header bar. */}
      <div className="bg-bg bg-hatch border-b-[2.5px] border-ink px-4 sm:px-[22px] py-3 sm:py-3.5 flex justify-between items-center gap-3 flex-wrap font-mono text-[10px] sm:text-[11px] tracking-[0.05em]">
        <div className="flex gap-3.5 items-center">
          <span className="bg-ink text-accent px-2 py-0.5 font-bold tracking-[0.1em]">
            SAASPOCALYPSE
          </span>
          <span className="opacity-60">case · head-to-head</span>
        </div>
        <div className="opacity-60">wedge comparison</div>
      </div>

      {/* TITLE BODY */}
      <div className="px-5 sm:px-9 pt-7 sm:pt-9 pb-7 sm:pb-9">
        <div className="font-mono text-xs font-bold tracking-[0.15em] uppercase text-muted mb-3.5">
          subjects of investigation
        </div>

        <h1 className="font-display font-bold text-[40px] sm:text-[52px] md:text-[64px] tracking-[-0.035em] leading-[0.96] m-0 [text-wrap:balance]">
          <RansomChip>{aName}</RansomChip>
          <span className="font-display mx-2">vs</span>
          <RansomChip>{bName}</RansomChip>
        </h1>

        <p className="font-display text-[18px] sm:text-[22px] font-medium text-muted m-0 mt-4 tracking-[-0.01em]">
          which is stronger?
        </p>
      </div>
    </header>
  );
}

function RansomChip({ children }: { children: React.ReactNode }) {
  return (
    <em className="not-italic inline-block bg-ink text-accent px-2.5 -translate-y-[2px] shadow-[4px_4px_0_0_var(--color-ink)] align-baseline">
      {children}
    </em>
  );
}
