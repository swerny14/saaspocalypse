import Link from "next/link";
import type { StoredMoatScore } from "@/lib/db/moat_scores";

type Props = {
  moat: StoredMoatScore;
  /** Report slug — used to set a `?from=/r/<slug>` query on the
   *  methodology link so its back-button can return here instead of
   *  always dumping the user on the homepage. */
  slug: string;
};

const AXES: Array<{
  key: keyof Pick<
    StoredMoatScore,
    "capital" | "technical" | "network" | "switching" | "data_moat" | "regulatory"
  >;
  label: string;
  blurb: string;
}> = [
  { key: "capital", label: "capital", blurb: "what it costs to keep the lights on" },
  { key: "technical", label: "technical", blurb: "depth of the underlying engineering" },
  { key: "network", label: "network", blurb: "users compound users" },
  { key: "switching", label: "switching", blurb: "stickiness of customer data + workflow" },
  { key: "data_moat", label: "data", blurb: "proprietary data accumulates over time" },
  { key: "regulatory", label: "regulatory", blurb: "real licenses + compliance, not SOC 2 theater" },
];

type Severity = {
  label: string;
  /** Tailwind class for the bar fill. Coral is the brand-reserved accent
   *  for "fortress"; ink for meaningful; muted/faded for shallow/none. */
  barClass: string;
  /** Trailing snark beside the aggregate bar; severity-derived. */
  trailing: string;
};

function severity(score: number): Severity {
  if (score >= 7) {
    return { label: "fortress", barClass: "bg-coral", trailing: "actual fortress" };
  }
  if (score >= 4) {
    return { label: "meaningful", barClass: "bg-ink", trailing: "real moat" };
  }
  if (score >= 1) {
    return { label: "shallow", barClass: "bg-muted", trailing: "shallow ditch" };
  }
  return { label: "none", barClass: "bg-ink/20", trailing: "no moat to speak of" };
}

/**
 * Six-axis moat breakdown. Typographic hero — the aggregate is a
 * brand-scale numeral, the six axes sit in a 2×3 grid below.
 *
 * Slots inside a VerdictReport card between the cost section and the
 * alternatives section, so the section chrome (padding, bottom border,
 * inline header row) matches its siblings exactly. The 2×3 grid uses a
 * single outer border with shared internal dividers — this lets the
 * axes read as one comparable scoreboard rather than six floating cards.
 *
 * Bar fills track the severity ladder: coral for fortress (≥7), ink
 * for meaningful (≥4), muted for shallow (≥1), faded for none. Zero-
 * score axis cells get the cream bg so they recede.
 *
 * Static SSR — score is server-computed, no interactivity.
 */
export function MoatBreakdown({ moat, slug }: Props) {
  const aggregate = moat.aggregate;
  const aggSev = severity(aggregate);
  const aggPct = Math.max(0, Math.min(100, aggregate * 10));
  const methodologyHref = `/methodology?from=${encodeURIComponent(`/r/${slug}`)}`;

  return (
    <section className="px-5 sm:px-11 py-6 sm:py-8 border-b-[2.5px] border-ink">
      {/* Heading row — matches the inline pattern used by every other
          section in VerdictReport (no walled-off header strip). */}
      <div className="flex justify-between items-baseline mb-6 gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="bg-ink text-accent px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] select-none leading-none">
            moat
          </span>
          <h3 className="font-display text-[22px] sm:text-[26px] font-bold m-0 tracking-[-0.02em]">
            how deep is the moat.
          </h3>
        </div>
        <Link
          href={methodologyHref}
          className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-60 hover:opacity-100 hover:text-coral transition-colors"
        >
          methodology →
        </Link>
      </div>

      {/* Hero score row — typographic anchor. Flows directly under the
          heading like any other section's lead content. */}
      <div className="grid items-end gap-4 sm:gap-7 [grid-template-columns:1fr] sm:[grid-template-columns:auto_1fr] mb-6">
        <div className="flex items-baseline gap-1 leading-[0.78]">
          <span
            className="font-display font-bold tracking-[-0.06em] text-ink"
            style={{ fontSize: "clamp(96px, 18vw, 180px)" }}
          >
            {aggregate.toFixed(1)}
          </span>
          <span
            className="font-display font-medium tracking-[-0.04em] text-ink/40 leading-none"
            style={{ fontSize: "clamp(32px, 6vw, 56px)" }}
          >
            /10
          </span>
        </div>

        <div className="sm:pb-3.5 min-w-0">
          <div className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
            aggregate score · {aggSev.label}
          </div>
          <p className="mt-3 font-display text-[18px] sm:text-[22px] font-medium leading-[1.25] tracking-[-0.01em] text-ink text-balance max-w-[560px]">
            weighted average of the six axes below. higher = harder for an indie
            hacker to displace.
          </p>
          <div className="mt-4 flex items-center gap-2.5">
            <div className="flex-1 h-3.5 bg-paper-alt border-2 border-ink relative overflow-hidden">
              <div
                className={`absolute inset-y-0 left-0 ${aggSev.barClass}`}
                style={{ width: `${aggPct}%` }}
                role="img"
                aria-label={`Aggregate moat: ${aggregate.toFixed(1)} out of 10`}
              />
            </div>
            <span className="font-mono text-[11px] uppercase tracking-[0.1em] text-muted whitespace-nowrap">
              {aggSev.trailing}
            </span>
          </div>
        </div>
      </div>

      {/* Axes grid — 2×3 below sm, stacks to 1 col on small screens.
          Wrapped in a single bordered container so the cells share
          internal dividers without bleeding to the section edge. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 border-[2.5px] border-ink">
        {AXES.map((axis, i) => {
          const value = moat[axis.key];
          const sev = severity(value);
          const isZero = value === 0;
          const pct = Math.max(0, Math.min(100, (value / 10) * 100));
          const isRight = i % 2 === 1;
          const isLastRow = i >= AXES.length - 2;
          return (
            <div
              key={axis.key}
              className={[
                "px-5 py-4 min-w-0",
                isZero ? "bg-bg" : "bg-paper",
                "border-ink",
                "border-b-[2.5px]",
                i === AXES.length - 1 ? "max-sm:border-b-0" : "",
                isLastRow ? "sm:border-b-0" : "",
                isRight ? "" : "sm:border-r-[2.5px]",
              ].join(" ")}
            >
              <div className="flex items-baseline justify-between gap-3">
                <div className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink">
                  {axis.label}
                </div>
                <div className="flex items-baseline gap-1 leading-none">
                  <span
                    className={`font-display text-[26px] sm:text-[28px] font-bold tracking-[-0.03em] ${isZero ? "text-ink/40" : "text-ink"}`}
                  >
                    {value.toFixed(1)}
                  </span>
                  <span className="font-display text-[14px] text-ink/40">/10</span>
                </div>
              </div>
              <div
                className="mt-2.5 h-2 border-[1.5px] border-ink bg-paper-alt relative overflow-hidden"
                role="img"
                aria-label={`${axis.label}: ${value.toFixed(1)} out of 10`}
              >
                <div
                  className={`absolute inset-y-0 left-0 ${sev.barClass}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className="mt-2.5 font-mono text-[12px] text-muted">
                {axis.blurb}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
