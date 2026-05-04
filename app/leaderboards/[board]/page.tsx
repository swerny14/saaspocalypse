import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  BOARDS,
  LEADERBOARD_SLUGS,
  getLeaderboard,
  type LeaderboardEntry,
  type LeaderboardSlug,
} from "@/lib/db/leaderboards";
import { TIER_FG } from "@/lib/scanner/schema";
import { TIER_STYLES } from "@/components/directory/tiers";
import { LeaderboardTabs } from "@/components/leaderboards/LeaderboardTabs";
import { MoatSparkline } from "@/components/leaderboards/MoatSparkline";
import {
  HotPill,
  NewPill,
  computeHotThreshold,
  isHot,
  isNew,
} from "@/components/leaderboards/pills";
import {
  leaderboardTitle,
  leaderboardOgTitle,
  leaderboardDescription,
  leaderboardCanonical,
} from "@/lib/seo/meta";
import { leaderboardJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";

export const revalidate = 3600;
export const dynamicParams = false;

const PAGE_SIZE = 50;

/**
 * Per-board H1 in the directory/blog masthead style: a sentence-cased lead
 * with a single rotated highlight pill. Kept inline (not in BOARDS) because
 * the masthead phrasing is page-only chrome — the data layer doesn't care.
 */
const HEADLINES: Record<
  LeaderboardSlug,
  { pre: string; highlight: string; post: string }
> = {
  "softest-walls": {
    pre: "Where the walls are ",
    highlight: "thinnest",
    post: ".",
  },
  "fortress-50": {
    pre: "The ",
    highlight: "fortress 50",
    post: ".",
  },
  "most-watched": {
    pre: "What everyone's ",
    highlight: "scoping",
    post: ".",
  },
  "freshly-scanned": {
    pre: "",
    highlight: "Fresh",
    post: " out of the scanner.",
  },
};

type Params = Promise<{ board: string }>;

export function generateStaticParams() {
  return LEADERBOARD_SLUGS.map((slug) => ({ board: slug }));
}

function isLeaderboardSlug(s: string): s is LeaderboardSlug {
  return (LEADERBOARD_SLUGS as readonly string[]).includes(s);
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { board } = await params;
  if (!isLeaderboardSlug(board)) {
    return { title: "leaderboard not found · saaspocalypse" };
  }
  const meta = BOARDS[board];
  const title = leaderboardTitle(meta);
  const ogTitle = leaderboardOgTitle(meta);
  const description = leaderboardDescription(meta);
  const canonical = leaderboardCanonical(board);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default async function LeaderboardPage({ params }: { params: Params }) {
  const { board } = await params;
  if (!isLeaderboardSlug(board)) notFound();

  const meta = BOARDS[board];
  const entries = await getLeaderboard(board, PAGE_SIZE);
  const hotThreshold = computeHotThreshold(entries);

  const headline = HEADLINES[board];

  return (
    <main className="bg-bg min-h-screen">
      <div className="container py-9">
        {/* Masthead — matches /directory + /blog */}
        <div className="border-b-[2.5px] border-ink pb-6 mb-7">
          <div className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase opacity-60 mb-2.5">
            the leaderboard · {meta.tabLabel} · {entries.length} reports scanned
          </div>
          <h1 className="font-display font-bold text-[clamp(48px,7vw,76px)] leading-[0.92] tracking-[-0.045em] m-0">
            {headline.pre}
            <span className="bg-ink text-accent px-3.5 inline-block rotate-[-1.5deg]">
              {headline.highlight}
            </span>
            {headline.post}
          </h1>
          <p className="font-display text-base leading-[1.5] opacity-75 max-w-[640px] mt-5 mb-0">
            {meta.blurb}
          </p>
        </div>

        <div className="mb-6">
          <LeaderboardTabs active={board} />
        </div>

        {entries.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="bru bg-paper">
            <ol className="m-0 p-0 list-none">
              {entries.map((entry, i) => (
                <FullRow
                  key={entry.id}
                  entry={entry}
                  isLast={i === entries.length - 1}
                  hotThreshold={hotThreshold}
                />
              ))}
            </ol>
            <div className="px-6 py-4 border-t-2 border-dashed border-ink font-mono text-[11px] font-bold tracking-[0.2em] uppercase opacity-60 flex flex-wrap items-center justify-between gap-3">
              <span>showing {entries.length} of {entries.length}</span>
              <Link
                href="/directory"
                className="text-ink no-underline hover:text-coral"
              >
                full directory →
              </Link>
            </div>
          </div>
        )}

        <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/#scanner"
            className="bru-xs bg-accent text-ink no-underline px-4 py-3 font-display font-semibold text-sm whitespace-nowrap"
          >
            ↑ scan a URL
          </Link>
          <Link
            href="/methodology"
            className="font-mono text-[12px] uppercase tracking-[0.12em] text-muted no-underline hover:text-ink"
          >
            how scoring works →
          </Link>
        </div>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(
              leaderboardJsonLd({
                slug: board,
                title: meta.title,
                description: leaderboardDescription(meta),
                reports: entries,
              }),
            ),
          }}
        />
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="bru bg-paper p-10 font-mono text-sm opacity-70">
      ▸ no entries on this board yet. be the first — paste a URL on the home page.
    </div>
  );
}

function FullRow({
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
        className="grid items-center gap-3 sm:gap-4 px-4 sm:px-6 py-4 sm:py-5 no-underline text-ink hover:bg-paper-alt transition-colors grid-cols-[44px_minmax(0,1fr)_auto] sm:grid-cols-[64px_minmax(0,1fr)_96px_auto] md:grid-cols-[64px_minmax(0,1fr)_96px_96px_auto]"
      >
        <div
          className="font-display font-bold text-[32px] sm:text-[40px] leading-none tracking-[-0.04em] tabular-nums"
          style={{ color: entry.rank <= 3 ? tierColor : undefined }}
        >
          {entry.rank.toString().padStart(2, "0")}
        </div>

        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-display font-bold text-[18px] sm:text-[20px] leading-tight tracking-[-0.01em] truncate">
              {entry.name}
            </div>
            {isNew(entry) && <NewPill />}
            {isHot(entry, hotThreshold) && <HotPill />}
          </div>
          <div className="font-mono text-[12px] text-muted mt-1 truncate">
            {entry.tagline}
          </div>
          <div className="font-mono text-[11px] text-muted mt-1 flex flex-wrap gap-x-3">
            <span>{entry.time_estimate}</span>
            <span className="opacity-60">{entry.view_count ?? 0} views</span>
          </div>
        </div>

        <div className="hidden md:flex justify-center">
          <MoatSparkline moat={entry.moat} />
        </div>

        {/* Score — anchors the row visually as the headline number on every
            breakpoint. Big, tier-colored, baseline-aligned. */}
        <div className="flex items-baseline gap-1 justify-end tabular-nums">
          <div
            className="font-display font-bold text-[30px] sm:text-[34px] leading-none tracking-[-0.03em]"
            style={{ color: tierColor }}
          >
            {entry.wedge_score}
          </div>
          <div className="font-mono text-[10px] sm:text-[11px] text-muted">/100</div>
        </div>

        {/* Tier — categorical badge, hidden below sm where space is at a
            premium and the score is doing the categorical work via color. */}
        <div className="hidden sm:flex justify-center">
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
