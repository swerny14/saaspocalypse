import type { CompareVerdict } from "@/lib/normalization/compare_verdict";

type Props = {
  verdict: CompareVerdict;
};

/**
 * Climax of the compare page. The TitleBlock above poses the question;
 * every section between is evidence; this band delivers the verdict.
 *
 * Palette discipline: one primary accent (lime) used at a single focal
 * moment (the CTA). The chip is a paper-on-ink rubber stamp — bright
 * enough to land as the headline without competing with the CTA for
 * attention. Reasons render as outline pills, quiet supporting evidence.
 * Lime appears once more in-prose on the punch phrase. Coral is reserved
 * for the CTA hover and never appears at rest.
 */
export function VerdictBand({ verdict }: Props) {
  const { line, punch, chip, reasons, cta_label, cta_href, winner } = verdict;
  const isTie = winner === "tie";
  // Split the line on the punch phrase so we can wrap that span in lime.
  const parts = punch && line.includes(punch) ? line.split(punch) : null;

  return (
    <div className="bg-ink text-paper border-[2.5px] border-ink shadow-[6px_6px_0_0_var(--color-ink)] overflow-hidden">
      <div className="px-7 py-7 sm:py-9">
        {/* Eyebrow — muted, just labels the section. No accent fill so it
            doesn't compete with the chip below. */}
        <div className="font-mono text-[10.5px] font-bold tracking-[0.22em] uppercase text-paper/55 mb-4">
          the verdict
        </div>

        {/* Chip — coral rubber stamp. The headline conclusion. Tie state
            falls back to paper since "too close to call" isn't a coral
            (action-y) moment. */}
        <div className="mb-6">
          <span
            className={`inline-block font-display font-bold text-[15px] sm:text-[17px] tracking-[0.06em] uppercase px-3.5 py-2 -rotate-[1.5deg] ${
              isTie
                ? "bg-paper-alt text-ink"
                : "bg-coral text-ink"
            }`}
          >
            {chip}
          </span>
        </div>

        {/* The line with lime-emphasized punch — the single in-prose
            accent moment. */}
        <p className="font-display text-[19px] sm:text-[23px] font-medium tracking-[-0.015em] leading-[1.35] m-0 [text-wrap:balance]">
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

        {/* Reasons strip — outline pills, deliberately quiet so the chip
            and the line stay primary. */}
        {reasons.length > 0 && (
          <div className="mt-6 pt-5 border-t border-paper/15">
            <div className="font-mono text-[10px] font-bold tracking-[0.22em] uppercase text-paper/55 mb-3">
              {isTie ? "the read" : "the case"}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {reasons.map((r, i) => (
                <span
                  key={i}
                  className="px-2.5 py-[5px] font-mono text-[11px] font-medium tracking-[0.04em] border border-paper/35 text-paper/85 whitespace-nowrap"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CTA bar — the primary lime moment. Hover shifts to coral. */}
      <a
        href={cta_href}
        className="block bg-accent text-ink border-t-[2.5px] border-ink px-7 py-4 no-underline font-display font-bold text-[16px] sm:text-[18px] tracking-[-0.01em] hover:bg-coral transition-colors"
      >
        {cta_label}
      </a>
    </div>
  );
}
