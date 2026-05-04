import Link from "next/link";
import {
  BOARDS,
  LEADERBOARD_SLUGS,
  type LeaderboardSlug,
} from "@/lib/db/leaderboards";

/**
 * URL-driven tab strip used on the full leaderboard pages — each tab is a
 * Link to its own route so each board is independently crawlable. Mirrors
 * the visual treatment of the mini-leaderboard's client tabs.
 */
export function LeaderboardTabs({ active }: { active: LeaderboardSlug }) {
  return (
    <div
      role="tablist"
      aria-label="Leaderboards"
      className="flex flex-wrap gap-2"
    >
      {LEADERBOARD_SLUGS.map((slug) => {
        const isActive = slug === active;
        return (
          <Link
            key={slug}
            role="tab"
            aria-selected={isActive}
            href={`/leaderboards/${slug}`}
            className={`font-mono text-[12px] font-bold uppercase tracking-[0.12em] px-3.5 py-2 border-2 border-ink no-underline transition-all ${
              isActive
                ? "bg-accent text-ink shadow-[3px_3px_0_0_#0a0a0a]"
                : "bg-paper text-ink hover:bg-paper-alt hover:translate-y-[-1px]"
            }`}
          >
            {BOARDS[slug].tabLabel}
          </Link>
        );
      })}
    </div>
  );
}
