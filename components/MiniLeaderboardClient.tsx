"use client";

import { useState } from "react";
import Link from "next/link";
import {
  BOARDS,
  LEADERBOARD_SLUGS,
  type LeaderboardEntry,
  type LeaderboardSlug,
} from "@/lib/db/leaderboards";
import { TIER_FG } from "@/lib/scanner/schema";
import { TIER_STYLES } from "./directory/tiers";
import { HotPill, NewPill, isHot, isNew } from "./leaderboards/pills";

type Props = {
  boards: Record<LeaderboardSlug, LeaderboardEntry[]>;
  hotThreshold: number;
};

export function MiniLeaderboardClient({ boards, hotThreshold }: Props) {
  const [active, setActive] = useState<LeaderboardSlug>("softest-walls");
  const board = BOARDS[active];
  const entries = boards[active];

  return (
    <div className="mt-10">
      <TabStrip active={active} onChange={setActive} />

      <div className="bru bg-paper mt-5">
        <div className="px-6 pt-6 pb-4 border-b-2 border-dashed border-ink">
          <h3 className="font-display font-bold text-[28px] leading-none tracking-[-0.02em] m-0">
            {board.title}
          </h3>
          <p className="font-mono text-[13px] text-muted mt-2 m-0">
            {board.blurb}
          </p>
        </div>

        {entries.length === 0 ? (
          <div className="px-6 py-10 font-mono text-sm opacity-70">
            ▸ no entries yet on this board.
          </div>
        ) : (
          <ol className="m-0 p-0 list-none">
            {entries.map((entry, i) => (
              <Row
                key={entry.id}
                entry={entry}
                isLast={i === entries.length - 1}
                hotThreshold={hotThreshold}
              />
            ))}
          </ol>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-t-2 border-dashed border-ink">
          <Link
            href={`/leaderboards/${active}`}
            className="font-mono text-[13px] font-bold uppercase tracking-[0.12em] text-ink no-underline hover:text-coral transition-colors"
          >
            view full leaderboard →
          </Link>
          <Link
            href="#scanner"
            className="font-mono text-[13px] uppercase tracking-[0.12em] text-muted no-underline hover:text-ink transition-colors"
          >
            ↑ submit a scan
          </Link>
        </div>
      </div>
    </div>
  );
}

function TabStrip({
  active,
  onChange,
}: {
  active: LeaderboardSlug;
  onChange: (s: LeaderboardSlug) => void;
}) {
  return (
    <div
      role="tablist"
      aria-label="Leaderboard boards"
      className="flex flex-wrap gap-2"
    >
      {LEADERBOARD_SLUGS.map((slug) => {
        const isActive = slug === active;
        return (
          <button
            key={slug}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(slug)}
            className={`font-mono text-[12px] font-bold uppercase tracking-[0.12em] px-3.5 py-2 border-2 border-ink transition-all ${
              isActive
                ? "bg-accent text-ink shadow-[3px_3px_0_0_#0a0a0a]"
                : "bg-paper text-ink hover:bg-paper-alt hover:translate-y-[-1px]"
            }`}
          >
            {BOARDS[slug].tabLabel}
          </button>
        );
      })}
    </div>
  );
}

function Row({
  entry,
  isLast,
  hotThreshold,
}: {
  entry: LeaderboardEntry;
  isLast: boolean;
  hotThreshold: number;
}) {
  const tierColor = TIER_FG[entry.tier];
  const tier = TIER_STYLES[entry.tier];

  return (
    <li className={isLast ? "" : "border-b-2 border-dashed border-ink"}>
      <Link
        href={`/r/${entry.slug}`}
        className="grid items-center gap-4 px-6 py-4 no-underline text-ink hover:bg-paper-alt transition-colors"
        style={{
          gridTemplateColumns: "58px minmax(0,1fr) 96px 112px",
        }}
      >
        <div
          className="font-display font-bold text-[36px] leading-none tracking-[-0.04em] tabular-nums"
          style={{ color: entry.rank === 1 ? tierColor : undefined }}
        >
          {entry.rank.toString().padStart(2, "0")}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-display font-bold text-[18px] leading-tight tracking-[-0.01em] truncate">
              {entry.name}
            </div>
            {isNew(entry) && <NewPill />}
            {isHot(entry, hotThreshold) && <HotPill />}
          </div>
          <div className="font-mono text-[12px] text-muted mt-1 truncate">
            {entry.tagline}
          </div>
        </div>

        <div className="hidden sm:flex items-baseline gap-1 justify-end">
          <div
            className="font-display font-bold text-[32px] leading-none tracking-[-0.03em] tabular-nums"
            style={{ color: tierColor }}
          >
            {entry.wedge_score}
          </div>
          <div className="font-mono text-[11px] text-muted">/100</div>
        </div>

        <div className="flex justify-center">
          <span
            className="inline-block whitespace-nowrap font-mono font-bold tracking-[0.12em] border-2 border-ink text-[10px] px-2 py-[3px]"
            style={{ background: tier.bg, color: tier.fg }}
          >
            {tier.label}
          </span>
        </div>
      </Link>
    </li>
  );
}
