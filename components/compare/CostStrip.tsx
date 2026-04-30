import type { CompareSide } from "@/lib/db/compare";
import { CompareCard, CardHead } from "./primitives";

type Props = {
  a: CompareSide;
  b: CompareSide;
  cost_delta: number | null;
};

type Winner = "a" | "b" | "tie";

function formatMonthly(side: CompareSide): string {
  if (side.monthly_floor_usd != null) {
    const dollars = Math.round(side.monthly_floor_usd);
    return side.is_usage_based ? `$${dollars} + usage` : `$${dollars}`;
  }
  if (side.is_usage_based) return "usage-based";
  return "—";
}

function pickCostWinner(delta: number | null): Winner {
  if (delta == null) return "tie";
  if (Math.abs(delta) < 1) return "tie";
  return delta < 0 ? "b" : "a";
}

function pickTimeWinner(a: CompareSide, b: CompareSide): Winner {
  const aDays = parseTimeToDays(a.report.time_estimate);
  const bDays = parseTimeToDays(b.report.time_estimate);
  if (aDays == null || bDays == null) return "tie";
  // Both sides effectively infinite → genuinely a tie. Without this,
  // `Math.abs(Infinity - Infinity)` is NaN and the comparison below
  // silently picks B as the winner.
  if (aDays === Infinity && bDays === Infinity) return "tie";
  if (Math.abs(aDays - bDays) < 1) return "tie";
  return aDays < bDays ? "a" : "b";
}

/** Coarse parser — covers "a weekend", "18 hours", "6 weeks", "a month".
 *  Returns `Infinity` for "never" / "forever" / "∞" so the time-winner
 *  picker treats a finite estimate as the clear winner against an effectively
 *  unbuildable side. */
function parseTimeToDays(s: string): number | null {
  const lower = s.toLowerCase().trim();
  if (
    lower === "∞" ||
    lower === "infinity" ||
    lower.includes("never") ||
    lower.includes("forever") ||
    lower.includes("don't")
  ) {
    return Infinity;
  }
  if (lower.includes("weekend")) return 2;
  const m = lower.match(/(\d+(?:\.\d+)?)\s*(hour|day|week|month|year)s?/);
  if (!m) {
    if (lower.includes("a month")) return 30;
    if (lower.includes("a week")) return 7;
    if (lower.includes("a day")) return 1;
    return null;
  }
  const n = parseFloat(m[1]);
  switch (m[2]) {
    case "hour":
      return n / 24;
    case "day":
      return n;
    case "week":
      return n * 7;
    case "month":
      return n * 30;
    case "year":
      return n * 365;
  }
  return null;
}

function formatCostDelta(delta: number | null): string | null {
  if (delta == null) return null;
  const rounded = Math.round(delta);
  if (rounded === 0) return null;
  return rounded > 0 ? `delta −$${rounded}` : `delta +$${Math.abs(rounded)}`;
}

function timeNarration(
  winner: Winner,
  a: CompareSide,
  b: CompareSide,
  winnerSide: CompareSide,
  loserSide: CompareSide,
): string {
  if (winner === "tie") {
    const aDays = parseTimeToDays(a.report.time_estimate);
    const bDays = parseTimeToDays(b.report.time_estimate);
    if (aDays === Infinity && bDays === Infinity) {
      return "neither is buildable as a clone — the fight here is the moat, not the build.";
    }
    return "comparable build windows on both sides.";
  }
  const loserDays = parseTimeToDays(loserSide.report.time_estimate);
  if (loserDays === Infinity) {
    return `${winnerSide.report.name} is buildable; ${loserSide.report.name} effectively isn't.`;
  }
  return `${winnerSide.report.time_estimate} vs. ${loserSide.report.time_estimate}.`;
}

function formatTimeDelta(a: CompareSide, b: CompareSide, winner: Winner): string | null {
  if (winner === "tie") return null;
  const aDays = parseTimeToDays(a.report.time_estimate);
  const bDays = parseTimeToDays(b.report.time_estimate);
  if (aDays == null || bDays == null) return null;
  if (aDays === Infinity || bDays === Infinity) return "delta · finite vs. ∞";
  const winnerDays = winner === "a" ? aDays : bDays;
  const loserDays = winner === "a" ? bDays : aDays;
  if (winnerDays <= 0) return null;
  const ratio = Math.round(loserDays / winnerDays);
  if (ratio < 2) return null;
  return `delta −${ratio}× faster`;
}

function costNarration(
  winner: Winner,
  winnerSide: CompareSide,
  loserSide: CompareSide,
): string {
  if (winner === "tie") return "monthly floor is roughly the same on both sides.";
  const winnerCost = winnerSide.monthly_floor_usd ?? 0;
  const loserCost = loserSide.monthly_floor_usd ?? 0;
  if (winnerCost > 0 && loserCost > 0) {
    const ratio = Math.round(loserCost / winnerCost);
    if (ratio >= 3) {
      return `${loserSide.report.name} costs ~${ratio}× more per month to keep alive.`;
    }
  }
  return `${winnerSide.report.name} costs less per month to keep the lights on.`;
}

export function CostStrip({ a, b, cost_delta }: Props) {
  const costWinner = pickCostWinner(cost_delta);
  const timeWinner = pickTimeWinner(a, b);

  return (
    <CompareCard>
      <CardHead title="cost + time, side by side." badge="floor" />

      <div className="grid grid-cols-1 md:grid-cols-2">
        <Quad
          label="monthly floor"
          a={a}
          b={b}
          aValue={formatMonthly(a)}
          bValue={formatMonthly(b)}
          winner={costWinner}
          deltaLabel={formatCostDelta(cost_delta)}
          narration={(w, l) => costNarration(costWinner, w, l)}
          isLast={false}
        />
        <Quad
          label="time to clone"
          a={a}
          b={b}
          aValue={a.report.time_estimate}
          bValue={b.report.time_estimate}
          winner={timeWinner}
          deltaLabel={formatTimeDelta(a, b, timeWinner)}
          narration={(w, l) => timeNarration(timeWinner, a, b, w, l)}
          isLast={true}
        />
      </div>
    </CompareCard>
  );
}

function Quad({
  label,
  a,
  b,
  aValue,
  bValue,
  winner,
  deltaLabel,
  narration,
  isLast,
}: {
  label: string;
  a: CompareSide;
  b: CompareSide;
  aValue: string;
  bValue: string;
  winner: Winner;
  deltaLabel: string | null;
  narration: (winnerSide: CompareSide, loserSide: CompareSide) => string;
  isLast: boolean;
}) {
  const winnerSide = winner === "a" ? a : winner === "b" ? b : a;
  const loserSide = winner === "a" ? b : a;

  return (
    <div
      className={`px-7 py-6 ${isLast ? "" : "border-r-0 md:border-r-[2.5px] border-ink border-b-[2.5px] md:border-b-0"}`}
    >
      <div className="flex justify-between items-center font-mono text-[10.5px] font-bold tracking-[0.18em] uppercase text-muted mb-5">
        <span>{label}</span>
        {winner !== "tie" ? (
          <span className="bg-ink text-accent px-2 py-[3px]">
            {winnerSide.report.name} wins
          </span>
        ) : (
          <span className="text-muted">tie</span>
        )}
      </div>

      <div className="grid grid-cols-[1fr_28px_1fr] items-end gap-2.5">
        <Half side={a} value={aValue} isWinner={winner === "a"} winnerExists={winner !== "tie"} />
        <span className="font-mono text-[18px] text-ink text-center pb-3">→</span>
        <Half side={b} value={bValue} isWinner={winner === "b"} winnerExists={winner !== "tie"} />
      </div>

      <div className="flex items-center gap-2.5 mt-5 pt-3.5 border-t-[1.5px] border-dashed border-ink flex-wrap">
        {deltaLabel && (
          <span className="bg-accent text-ink border-2 border-ink shadow-[2px_2px_0_0_var(--color-ink)] px-2 py-[3px] font-mono text-[11px] font-bold tracking-[0.12em] uppercase">
            {deltaLabel}
          </span>
        )}
        <span className="font-display text-[13.5px] text-muted">
          {narration(winnerSide, loserSide)}
        </span>
      </div>
    </div>
  );
}

function Half({
  side,
  value,
  isWinner,
  winnerExists,
}: {
  side: CompareSide;
  value: string;
  isWinner: boolean;
  winnerExists: boolean;
}) {
  // When there's a winner, the loser greys out so the eye lands fast.
  const colorCls = !winnerExists
    ? "text-ink"
    : isWinner
      ? "text-ink"
      : "text-muted opacity-70";
  // The bare `∞` glyph in Space Grotesk is intrinsically smaller than letter
  // shapes — render it bigger and on its own line so the column visually
  // balances with a multi-word counterpart like "6 weeks".
  const isInfinity = value.trim() === "∞";
  return (
    <div className="min-w-0">
      <div className="font-mono text-[10.5px] font-bold tracking-[0.18em] uppercase text-muted mb-1.5 truncate">
        {side.report.name}
      </div>
      {isInfinity ? (
        <div
          className={`font-display font-bold text-[64px] md:text-[80px] tracking-[-0.04em] leading-[0.9] ${colorCls}`}
          aria-label="effectively infinite"
        >
          ∞
        </div>
      ) : (
        <div
          className={`font-display font-bold text-[44px] md:text-[52px] tracking-[-0.04em] leading-[0.9] [overflow-wrap:anywhere] ${colorCls}`}
        >
          {value}
        </div>
      )}
    </div>
  );
}
