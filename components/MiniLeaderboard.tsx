import {
  getMiniLeaderboards,
  LEADERBOARD_SLUGS,
  type LeaderboardEntry,
  type LeaderboardSlug,
} from "@/lib/db/leaderboards";
import { SectionHead } from "./SectionHead";
import { MiniLeaderboardClient } from "./MiniLeaderboardClient";
import { computeHotThreshold } from "./leaderboards/pills";

export async function MiniLeaderboard() {
  const boards = await getMiniLeaderboards(5);

  const totalRows = LEADERBOARD_SLUGS.reduce(
    (n, slug) => n + boards[slug].length,
    0,
  );
  if (totalRows === 0) {
    return (
      <section id="leaderboard" className="py-20">
        <div className="container">
          <SectionHead
            eyebrow="Live leaderboard"
            title="the leaderboard."
            sub="where the walls are thinnest in saas — ranked, not recommended."
          />
          <EmptyState />
        </div>
      </section>
    );
  }

  // The "hot" pill threshold is computed once across all visible entries so
  // it means something relative to the live cohort, not just the active tab.
  // Recomputed on every render — server-side and effectively free at this scale.
  const allEntries: LeaderboardEntry[] = LEADERBOARD_SLUGS.flatMap(
    (slug) => boards[slug],
  );
  const hotThreshold = computeHotThreshold(allEntries);

  return (
    <section id="leaderboard" className="py-20">
      <div className="container">
        <SectionHead
          eyebrow="Live leaderboard"
          title="the leaderboard."
          sub="where the walls are thinnest in saas — ranked, not recommended."
        />

        <MiniLeaderboardClient
          boards={boards}
          hotThreshold={hotThreshold}
        />
      </div>
    </section>
  );
}

function EmptyState() {
  return (
    <div className="bru bg-paper mt-10 p-10 font-mono text-sm opacity-70">
      ▸ no verdicts yet. be the first — paste a URL above.
    </div>
  );
}

export type { LeaderboardEntry, LeaderboardSlug };
