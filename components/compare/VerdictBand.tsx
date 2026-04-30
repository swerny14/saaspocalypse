import type { CompareVerdict } from "@/lib/normalization/compare_verdict";

type Props = {
  verdict: CompareVerdict;
};

/**
 * Full-width ink slab carrying just the verdict line. The CTA button used
 * to live here, but it pointed at one side's report while the outro right
 * below already linked to BOTH — the duplicate confused readers, so the
 * outro now owns the "go read more" affordance and this band just delivers
 * the verdict.
 */
export function VerdictBand({ verdict }: Props) {
  const { line, punch } = verdict;
  // Split the line on the punch phrase so we can wrap that span in lime.
  const parts = punch && line.includes(punch) ? line.split(punch) : null;

  return (
    <div className="bg-ink text-paper border-[2.5px] border-ink shadow-[6px_6px_0_0_var(--color-ink)] px-7 py-6 grid grid-cols-1 md:grid-cols-[auto_1fr] items-center gap-5">
      <span className="bg-accent text-ink px-2.5 py-1.5 font-mono text-[11px] font-bold tracking-[0.18em] uppercase self-start whitespace-nowrap">
        the verdict
      </span>
      <p className="font-display text-[18px] md:text-[22px] font-medium tracking-[-0.01em] leading-[1.3] m-0 [text-wrap:balance]">
        {parts ? (
          <>
            {parts[0]}
            <em className="not-italic text-accent font-bold">{punch}</em>
            {parts.slice(1).join(punch)}
          </>
        ) : (
          line
        )}
      </p>
    </div>
  );
}
