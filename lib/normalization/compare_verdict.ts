import type { ComparePair } from "@/lib/db/compare";
import type { CompareDiff } from "./compare";

/**
 * Lightweight, deterministic verdict for the head-to-head page. Pure function
 * over the existing pair + diff — no LLM, no DB. Drives the title-block chip,
 * the sub-line, and the bottom verdict band.
 *
 * Convention: "winner" = the side that's *easier to attack* (higher wedge
 * score = thinner walls; same-score-and-tier within `TIE_THRESHOLD` is a tie).
 */

export type CompareWinner = "a" | "b" | "tie";

export type CompareVerdict = {
  winner: CompareWinner;
  /** Slug of the winner side (null on tie). */
  winner_slug: string | null;
  /** Display name of the winner (null on tie). */
  winner_name: string | null;
  /** Short uppercase chip in the title block, e.g. "ATTACK CALENDLY-ISH FIRST". */
  chip: string;
  /** One-sentence prose under the chip — concrete reasons, lowercase. */
  summary: string;
  /** Concrete supporting reasons surfaced as chips inside the verdict band.
   *  Same data as `summary`, exposed as an array so the band can render
   *  them as discrete chips. Up to 3 entries. */
  reasons: string[];
  /** Verdict-band line (may reference the `punch` phrase verbatim). */
  line: string;
  /** Emphasized lime phrase rendered inside the verdict band. */
  punch: string;
  /** CTA href + label at the right of the verdict band. */
  cta_label: string;
  cta_href: string;
};

/** Score gap below this counts as a draw when tiers also match. */
const TIE_THRESHOLD = 5;
/** Moat aggregate gap below this counts as "matched moat depth". */
const MOAT_TIE = 1.0;
/** Cost ratio above this counts as "much cheaper". */
const COST_RATIO = 1.5;

export function computeCompareVerdict(
  pair: ComparePair,
  diff: CompareDiff,
): CompareVerdict {
  const { a, b } = pair;
  const winner = pickWinner(diff.score_delta, diff.tier_match);

  if (winner === "tie") return tieVerdict(pair, diff);

  const winnerSide = winner === "a" ? a : b;
  const loserSide = winner === "a" ? b : a;
  const winnerName = displayName(winnerSide.report.name);
  const loserName = displayName(loserSide.report.name);

  const reasons = buildReasons(winnerSide, loserSide, diff, winner);
  const summary = reasons.length > 0 ? `${reasons.join(", ")}.` : "the thinner walls.";
  const punch = punchLine(winnerSide.report.tier, winnerName);
  const line = bandLine(winnerSide, loserSide, diff, winnerName, loserName, punch);

  return {
    winner,
    winner_slug: winnerSide.report.slug,
    winner_name: winnerName,
    chip: `ATTACK ${winnerName.toUpperCase()} FIRST`,
    summary,
    reasons,
    line,
    punch,
    cta_label: `read the ${winnerName} report →`,
    cta_href: `/r/${winnerSide.report.slug}`,
  };
}

function pickWinner(scoreDelta: number, tierMatch: boolean): CompareWinner {
  if (tierMatch && Math.abs(scoreDelta) < TIE_THRESHOLD) return "tie";
  if (scoreDelta > 0) return "b";
  if (scoreDelta < 0) return "a";
  return "tie";
}

function tieVerdict(pair: ComparePair, diff: CompareDiff): CompareVerdict {
  const { a, b } = pair;
  const aName = displayName(a.report.name);
  const bName = displayName(b.report.name);

  const moatDelta = aggMoat(diff);
  const moatPhrase =
    moatDelta == null
      ? "shape up similarly"
      : Math.abs(moatDelta) < MOAT_TIE
        ? "land on the same moat depth"
        : `differ by ${Math.abs(moatDelta).toFixed(1)} on aggregate moat`;

  return {
    winner: "tie",
    winner_slug: null,
    winner_name: null,
    chip: "TOO CLOSE TO CALL",
    summary: `same tier, near-identical wedge score — pick on taste.`,
    reasons: ["matched tier", "matched wedge score", moatPhrase],
    line: `${aName} and ${bName} ${moatPhrase}, sit in the same tier, and present the same wall. either is a defensible angle of attack — the choice is taste, not difficulty.`,
    punch: "either is a defensible angle of attack",
    cta_label: "read both reports →",
    cta_href: `/r/${a.report.slug}`,
  };
}

function buildReasons(
  winnerSide: ComparePair["a"],
  loserSide: ComparePair["a"],
  diff: CompareDiff,
  winner: "a" | "b",
): string[] {
  const reasons: string[] = [];

  // Tier delta wins the lead phrase when it differs.
  if (winnerSide.report.tier !== loserSide.report.tier) {
    reasons.push(`a full tier easier`);
  }

  // Cost: "lower monthly floor" if there's a clear winner.
  if (diff.cost_delta != null) {
    const winnerHasLowerCost =
      winner === "a" ? diff.cost_delta > 0 : diff.cost_delta < 0;
    if (winnerHasLowerCost) {
      const winnerCost = winnerSide.monthly_floor_usd ?? 0;
      const loserCost = loserSide.monthly_floor_usd ?? 0;
      if (loserCost > 0 && winnerCost > 0 && loserCost / winnerCost >= COST_RATIO) {
        reasons.push(`smaller monthly bill`);
      } else if (winnerCost === 0 && loserCost > 0) {
        reasons.push(`free at floor`);
      } else {
        reasons.push(`cheaper at the floor`);
      }
    }
  }

  // Moat: "matched moat depth" or "shallower moat" (easier to undercut).
  const moatDelta = aggMoat(diff);
  if (moatDelta != null) {
    if (Math.abs(moatDelta) < MOAT_TIE) {
      reasons.push(`matched moat depth`);
    } else {
      const winnerHasShallowerMoat = winner === "a" ? moatDelta > 0 : moatDelta < 0;
      if (winnerHasShallowerMoat) {
        reasons.push(`shallower moat`);
      }
    }
  }

  // Stack: smaller surface to clone is a real advantage.
  const winnerStack = winnerSide.components.length;
  const loserStack = loserSide.components.length;
  if (winnerStack > 0 && loserStack > winnerStack + 1) {
    reasons.push(`smaller stack`);
  }

  return reasons.slice(0, 3);
}

function punchLine(tier: string, name: string): string {
  if (tier === "SOFT") return `wedge into ${name} this weekend.`;
  if (tier === "CONTESTED") return `give the ${name} attack a month.`;
  return `neither is a layup — ${name} is the thinner wall.`;
}

function bandLine(
  _winner: ComparePair["a"],
  _loser: ComparePair["a"],
  _diff: CompareDiff,
  _winnerName: string,
  loserName: string,
  punch: string,
): string {
  return `same comparison surface, two different walls. ${punch} circle back to ${loserName} only if you genuinely need what it does that the other doesn't.`;
}

function aggMoat(diff: CompareDiff): number | null {
  const agg = diff.moat_diff.find((d) => d.axis === "aggregate");
  return agg?.delta ?? null;
}

/** Strip TLD-ish suffixes for chip/punch readability. `notion-ish.com` → `notion-ish`. */
function displayName(name: string): string {
  return name.replace(/\.(com|io|app|dev|co|net|ai|so)(\b|\/.*)?$/i, "");
}
