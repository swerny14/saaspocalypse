import Link from "next/link";
import type { StoredMoatScore } from "@/lib/db/moat_scores";
import type { MoatAxis } from "@/lib/scanner/schema";

type Props = {
  moat: StoredMoatScore;
  /** Report slug — used to set a `?from=/r/<slug>` query on the
   *  methodology link so its back-button can return here instead of
   *  always dumping the user on the homepage. */
  slug: string;
  /** Server-computed lowest-scoring axis. Drives the headline weakest-axis
   *  callout. Pass null to suppress (legacy reports / moat soft-fail). */
  weakestAxis?: MoatAxis | null;
};

type AxisKey = MoatAxis;
type JudgedAxisKey = Exclude<MoatAxis, "distribution">;

type AxisJudgment = {
  score: number;
  confidence: "low" | "medium" | "high";
  rationale: string;
  evidence: string[];
};

const AXES: Array<{
  key: AxisKey;
  label: string;
  blurb: string;
  /** Single-sentence weakest-axis lede — used at the top of the grid when
   *  this axis is the weakest on the moat. Phrased "their X is wide open"
   *  so it lands as a wedge thesis the user can act on. */
  thinLede: string;
  /** Single-sentence strongest-axis warning — used as the realism check
   *  at the top of the grid when this axis is the highest on the moat. */
  thickLede: string;
}> = [
  {
    key: "capital",
    label: "capital",
    blurb: "investment the incumbent had to make",
    thinLede: "their capital wall is paper-thin — runs on commodity cloud + free tiers.",
    thickLede: "their capital wall is real — ongoing capex puts a floor under any clone.",
  },
  {
    key: "technical",
    label: "technical",
    blurb: "depth of the underlying engineering",
    thinLede: "the technical wall is thin — the hard part is one library.",
    thickLede: "the technical wall is real — research-grade engineering, not a weekend.",
  },
  {
    key: "network",
    label: "network",
    blurb: "users compound users",
    thinLede: "no network effect to overcome — users don't compound users.",
    thickLede: "the network effect is real — every new user makes the incumbent stickier.",
  },
  {
    key: "switching",
    label: "switching",
    blurb: "stickiness of customer data + workflow",
    thinLede: "switching cost is paper-thin — users could leave with one CSV.",
    thickLede: "switching cost is real — workflow lock-in keeps customers from leaving.",
  },
  {
    key: "data_moat",
    label: "data",
    blurb: "proprietary data accumulates over time",
    thinLede: "no proprietary corpus — they're running on off-the-shelf data.",
    thickLede: "the data moat is real — proprietary corpus accumulating over time.",
  },
  {
    key: "regulatory",
    label: "regulatory",
    blurb: "real licenses, not SOC 2 theater",
    thinLede: "no regulatory wall — SOC 2 doesn't count.",
    thickLede: "the regulatory wall is real — actual licenses, audit posture, custodial duty.",
  },
  {
    key: "distribution",
    label: "distribution",
    blurb: "brand SERP grip, knowledge graph, news flow",
    thinLede: "their distribution is wide open — invisible on their own brand SERP.",
    thickLede: "their distribution is fortress-grade — they own their brand SERP end-to-end.",
  },
];

const AXIS_BY_KEY = new Map(AXES.map((a) => [a.key, a]));

type Severity = {
  label: string;
  /** Tailwind class for the bar fill. In the wedge frame: coral = thick
   *  walls (danger for the builder); ink = real walls; muted/faded = thin
   *  or open. */
  barClass: string;
  /** Trailing label beside the aggregate bar; severity-derived. */
  trailing: string;
};

function severity(score: number): Severity {
  if (score >= 7) {
    return { label: "fortress", barClass: "bg-coral", trailing: "thick walls" };
  }
  if (score >= 4) {
    return { label: "meaningful", barClass: "bg-ink", trailing: "real walls" };
  }
  if (score >= 1) {
    return { label: "shallow", barClass: "bg-muted", trailing: "thin walls" };
  }
  return { label: "open", barClass: "bg-ink/20", trailing: "wide open" };
}

function axisJudgment(
  moat: StoredMoatScore,
  axis: AxisKey,
): AxisJudgment | null {
  if (axis === "distribution") return null;
  return moat.score_judgment?.axes?.[axis as JudgedAxisKey] ?? null;
}

function previewText(text: string, max = 118): string {
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).replace(/\s+\S*$/, "")}...`;
}

/** Pick the strongest axis (highest score, tie-break by fixed axis order). */
function pickStrongestAxis(moat: StoredMoatScore): AxisKey | null {
  let best: AxisKey | null = null;
  let bestVal = -1;
  for (const a of AXES) {
    const v = moat[a.key];
    if (typeof v !== "number") continue;
    if (v > bestVal) {
      best = a.key;
      bestVal = v;
    }
  }
  return best;
}

/**
 * Seven-axis moat breakdown. Promoted to the top of `/r/[slug]` in Phase
 * 2.5 — this IS the wedge analysis, so it leads.
 *
 * Two ledes anchor the grid:
 *   - "the door": the weakest axis, framed as the door for an indie hacker
 *   - "watch out": the strongest axis, the realism check
 *
 * The aggregate number is gone from the head; the displayed wedge_score in
 * the report hero is the inverse of it (`(10 - aggregate) * 10`), so showing
 * both was just the same number twice.
 *
 * Bar fills track severity: coral for fortress (≥7), ink for meaningful
 * (≥4), muted for shallow (≥1), faded for none. Static SSR — no
 * interactivity.
 */
export function MoatBreakdown({ moat, slug, weakestAxis }: Props) {
  const methodologyHref = `/methodology?from=${encodeURIComponent(`/r/${slug}`)}`;
  const weakest = weakestAxis ?? null;
  const strongest = pickStrongestAxis(moat);
  const weakestEntry = weakest ? AXIS_BY_KEY.get(weakest) : null;
  const strongestEntry = strongest ? AXIS_BY_KEY.get(strongest) : null;
  const strongestVal = strongest ? (moat[strongest] as number | null) : null;
  // Suppress strongest callout when it equals weakest (uniform axis case)
  // or when both score the same low band — there's no "watch out" worth
  // saying when nothing is fortress-grade.
  const showStrongest =
    strongestEntry &&
    weakest !== strongest &&
    typeof strongestVal === "number" &&
    strongestVal >= 4;

  return (
    <section className="px-5 sm:px-11 py-6 sm:py-8 border-b-[2.5px] border-ink">
      {/* Heading row */}
      <div className="flex justify-between items-baseline mb-5 gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="bg-ink text-accent px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] select-none leading-none">
            wedge
          </span>
          <h3 className="font-display text-[22px] sm:text-[26px] font-bold m-0 tracking-[-0.02em]">
            where the walls are.
          </h3>
        </div>
        <Link
          href={methodologyHref}
          className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-60 hover:opacity-100 hover:text-coral transition-colors"
        >
          methodology →
        </Link>
      </div>

      {/* Lede callouts: the door + the realism check. */}
      {(weakestEntry || (showStrongest && strongestEntry)) && (
        <div className="mb-6 grid gap-2.5">
          {weakestEntry && (
            <div className="flex gap-2.5 items-baseline">
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-success whitespace-nowrap pt-[3px]">
                the door
              </span>
              <p className="font-display text-[17px] sm:text-[19px] font-medium leading-[1.3] tracking-[-0.005em] text-ink m-0 [text-wrap:balance]">
                {weakestEntry.thinLede}
              </p>
            </div>
          )}
          {showStrongest && strongestEntry && (
            <div className="flex gap-2.5 items-baseline">
              <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.18em] text-coral whitespace-nowrap pt-[3px]">
                watch out
              </span>
              <p className="font-display text-[17px] sm:text-[19px] font-medium leading-[1.3] tracking-[-0.005em] text-ink m-0 [text-wrap:balance]">
                {strongestEntry.thickLede}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Axes grid — 2×3 below sm, stacks to 1 col on small screens. */}
      {(() => {
        const visibleAxes = AXES.filter((a) => {
          const v = moat[a.key];
          return typeof v === "number";
        });
        const isOdd = visibleAxes.length % 2 === 1;
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 border-[2.5px] border-ink">
            {visibleAxes.map((axis, i) => {
              const value = moat[axis.key] as number;
              const sev = severity(value);
              const isZero = value === 0;
              const pct = Math.max(0, Math.min(100, (value / 10) * 100));
              const isRight = i % 2 === 1;
              const isLast = i === visibleAxes.length - 1;
              const isLastSpan = isOdd && isLast;
              const isLastRow = isLastSpan
                ? isLast
                : !isOdd && i >= visibleAxes.length - 2;
              const isWeakest = axis.key === weakest;
              const judgment = axisJudgment(moat, axis.key);
              return (
                <div
                  key={axis.key}
                  className={[
                    "px-5 py-4 min-w-0",
                    isZero ? "bg-bg" : "bg-paper",
                    "border-ink",
                    "border-b-[2.5px]",
                    isLast ? "max-sm:border-b-0" : "",
                    isLastRow ? "sm:border-b-0" : "",
                    isLastSpan ? "sm:col-span-2" : isRight ? "" : "sm:border-r-[2.5px]",
                  ].join(" ")}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink flex items-center gap-2">
                      {axis.label}
                      {isWeakest && (
                        <span className="bg-success/20 text-success px-1.5 py-0 font-mono text-[9px] font-bold tracking-[0.1em] uppercase border border-success">
                          door
                        </span>
                      )}
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
                    className="mt-2.5 h-2.5 border-[1.5px] border-ink bg-paper-alt relative overflow-hidden"
                    role="img"
                    aria-label={`${axis.label}: ${value.toFixed(1)} out of 10 (${sev.trailing})`}
                  >
                    <div
                      className={`absolute inset-y-0 left-0 ${sev.barClass}`}
                      style={{ width: `${pct}%` }}
                    />
                    {/* 10-segment ticks — calibrates the bar against the
                        same scoring system as the wedge-score hero. */}
                    <div aria-hidden className="absolute inset-0 flex pointer-events-none">
                      {Array.from({ length: 10 }).map((_, t) => (
                        <div
                          key={t}
                          className="flex-1 border-r border-ink/25 last:border-r-0"
                        />
                      ))}
                    </div>
                  </div>
                  <div className="mt-2.5 font-mono text-[12px] text-muted">
                    {axis.blurb}
                  </div>
                  {judgment ? (
                    <details className="group mt-3 border-t border-ink/15 pt-3">
                      <summary className="cursor-pointer list-none">
                        <span className="flex items-center justify-between gap-3">
                          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.14em] text-ink/65 group-open:text-ink">
                            why this score
                          </span>
                          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                            {judgment.confidence} confidence
                          </span>
                        </span>
                        <span className="mt-1.5 block font-display text-[13px] leading-[1.3] text-ink/65 group-open:hidden">
                          {previewText(judgment.rationale)}
                        </span>
                      </summary>
                      <p className="mt-2 mb-0 font-display text-[13.5px] leading-[1.35] text-ink/80">
                        {judgment.rationale}
                      </p>
                      {judgment.evidence.length > 0 ? (
                        <ul className="mt-2 mb-0 grid gap-1.5 pl-0 list-none">
                          {judgment.evidence.slice(0, 3).map((item, idx) => (
                            <li
                              key={`${axis.key}-evidence-${idx}`}
                              className="font-mono text-[11px] leading-snug text-muted before:content-['-'] before:mr-1.5"
                            >
                              {item}
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </details>
                  ) : null}
                </div>
              );
            })}
          </div>
        );
      })()}
    </section>
  );
}
