import { getSupabaseAnon } from "./supabase";
import type { StoredReport } from "./reports";

/**
 * Leaderboard surfaces. Slugs are URL-stable — used in `/leaderboards/[board]`
 * and as the `?board=` param on the landing mini-leaderboard. New boards are
 * additive: extend the union and the BOARDS table together.
 */
export const LEADERBOARD_SLUGS = [
  "softest-walls",
  "fortress-50",
  "most-watched",
  "freshly-scanned",
] as const;
export type LeaderboardSlug = (typeof LEADERBOARD_SLUGS)[number];

export type LeaderboardBoard = {
  slug: LeaderboardSlug;
  /** Lowercase-deadpan title (rendered as-is, no transform). */
  title: string;
  /** Mono-caps tab label. Rendered uppercase via Tailwind. */
  tabLabel: string;
  /** One-liner that explains what makes this board interesting. */
  blurb: string;
};

export const BOARDS: Record<LeaderboardSlug, LeaderboardBoard> = {
  "softest-walls": {
    slug: "softest-walls",
    title: "softest walls.",
    tabLabel: "softest walls",
    blurb: "where AI-assisted indies should be aiming.",
  },
  "fortress-50": {
    slug: "fortress-50",
    title: "the fortress 50.",
    tabLabel: "fortress 50",
    blurb: "thick walls, deep moats. don't bother — or know what you're up against.",
  },
  "most-watched": {
    slug: "most-watched",
    title: "most watched.",
    tabLabel: "most watched",
    blurb: "what other indies are scoping right now.",
  },
  "freshly-scanned": {
    slug: "freshly-scanned",
    title: "fresh meat.",
    tabLabel: "fresh meat",
    blurb: "out of the scanner, still warm.",
  },
};

export type LeaderboardEntry = StoredReport & { rank: number };

type SortSpec = { column: string; ascending: boolean };

const SORT_BY_BOARD: Record<LeaderboardSlug, SortSpec> = {
  "softest-walls": { column: "wedge_score", ascending: false },
  "fortress-50": { column: "wedge_score", ascending: true },
  "most-watched": { column: "view_count", ascending: false },
  "freshly-scanned": { column: "created_at", ascending: false },
};

const REPORT_COLUMNS =
  "*, moat:report_moat_scores(rubric_version, capital, technical, network, switching, data_moat, regulatory, distribution, aggregate, computed_at, review_status, reviewed_at, score_judgment)";

function rankRows(rows: unknown[]): LeaderboardEntry[] {
  return (rows as StoredReport[]).map((r, i) => ({ ...r, rank: i + 1 }));
}

export async function getLeaderboard(
  slug: LeaderboardSlug,
  limit = 50,
): Promise<LeaderboardEntry[]> {
  const sb = getSupabaseAnon();
  if (!sb) return [];
  const sort = SORT_BY_BOARD[slug];
  const { data, error } = await sb
    .from("reports")
    .select(REPORT_COLUMNS)
    .order(sort.column, { ascending: sort.ascending })
    .limit(limit);
  if (error) {
    console.error(`[leaderboards] getLeaderboard(${slug}) failed`, error);
    return [];
  }
  return data ? rankRows(data) : [];
}

/**
 * Batched fetch for the landing mini-leaderboard. Issues one query per board
 * in parallel so we always serve the freshest top-N for each surface. Cheap
 * because each query selects ≤ perBoard rows; totalrows ~= 4 × perBoard.
 */
export async function getMiniLeaderboards(
  perBoard = 5,
): Promise<Record<LeaderboardSlug, LeaderboardEntry[]>> {
  const results = await Promise.all(
    LEADERBOARD_SLUGS.map((slug) => getLeaderboard(slug, perBoard)),
  );
  const out = {} as Record<LeaderboardSlug, LeaderboardEntry[]>;
  LEADERBOARD_SLUGS.forEach((slug, i) => {
    out[slug] = results[i];
  });
  return out;
}
