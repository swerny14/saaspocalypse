import { ImageResponse } from "next/og";
import {
  BOARDS,
  LEADERBOARD_SLUGS,
  getLeaderboard,
  type LeaderboardSlug,
  type LeaderboardEntry,
} from "@/lib/db/leaderboards";
import { TIER_FG } from "@/lib/scanner/schema";

export const alt = "saaspocalypse leaderboard";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const INK = "#0a0a0a";
const CREAM = "#f4f1e8";
const LIME = "#c6ff00";
const TIER_BG: Record<string, string> = {
  SOFT: "#dcfce7",
  CONTESTED: "#fef9c3",
  FORTRESS: "#fee2e2",
};

type Params = Promise<{ board: string }>;

function isLeaderboardSlug(s: string): s is LeaderboardSlug {
  return (LEADERBOARD_SLUGS as readonly string[]).includes(s);
}

export default async function Image({ params }: { params: Params }) {
  const { board } = await params;
  if (!isLeaderboardSlug(board)) return fallback(`board: ${board}`);

  const meta = BOARDS[board];
  const entries = await getLeaderboard(board, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: CREAM,
          display: "flex",
          flexDirection: "column",
          fontFamily: "sans-serif",
          color: INK,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "24px 56px",
            borderBottom: `2.5px solid ${INK}`,
            fontSize: 17,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span
              style={{
                display: "flex",
                background: INK,
                color: LIME,
                padding: "4px 14px",
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: "0.05em",
              }}
            >
              saaspocalypse
            </span>
            <span style={{ opacity: 0.6, display: "flex" }}>leaderboard</span>
          </div>
          <div style={{ opacity: 0.6, display: "flex", fontSize: 16 }}>
            top {entries.length || 3}
          </div>
        </div>

        {/* Title block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "32px 56px 18px",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 64,
              fontWeight: 700,
              letterSpacing: "-0.04em",
              lineHeight: 0.95,
            }}
          >
            {sanitize(meta.title)}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              opacity: 0.7,
              marginTop: 12,
              maxWidth: 1000,
            }}
          >
            {sanitize(meta.blurb)}
          </div>
        </div>

        {/* Top-3 rows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            padding: "8px 56px 36px",
            gap: 14,
          }}
        >
          {entries.length === 0 ? (
            <EmptyRow />
          ) : (
            entries.map((e, i) => <Row key={e.id} entry={e} rank={i + 1} />)
          )}
        </div>
      </div>
    ),
    { ...size },
  );
}

function Row({ entry, rank }: { entry: LeaderboardEntry; rank: number }) {
  const tierColor = TIER_FG[entry.tier];
  const tierBg = TIER_BG[entry.tier];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        padding: "16px 22px",
        background: tierBg,
        border: `2.5px solid ${INK}`,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 56,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          color: INK,
          minWidth: 76,
        }}
      >
        {rank.toString().padStart(2, "0")}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: "-0.02em",
          }}
        >
          {sanitize(entry.name)}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 18,
            opacity: 0.65,
            marginTop: 4,
          }}
        >
          {sanitize(entry.tagline)}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            color: tierColor,
            lineHeight: 0.85,
          }}
        >
          {String(entry.wedge_score)}
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 16,
            opacity: 0.55,
            fontFamily: "monospace",
          }}
        >
          /100
        </div>
      </div>
    </div>
  );
}

function EmptyRow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        padding: "28px 22px",
        background: "#ffffff",
        border: `2.5px solid ${INK}`,
        fontSize: 22,
        opacity: 0.6,
      }}
    >
      no entries on this board yet — check back after the next scan.
    </div>
  );
}

function fallback(detail: string) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: CREAM,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: INK,
          fontFamily: "sans-serif",
          padding: 56,
        }}
      >
        <div
          style={{
            display: "flex",
            background: INK,
            color: LIME,
            padding: "8px 20px",
            fontSize: 36,
            fontWeight: 700,
            letterSpacing: "0.05em",
            marginBottom: 32,
          }}
        >
          saaspocalypse
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            marginBottom: 18,
          }}
        >
          leaderboard not found
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 22,
            opacity: 0.6,
            letterSpacing: "0.05em",
          }}
        >
          {detail}
        </div>
      </div>
    ),
    { ...size },
  );
}

function sanitize(s: string): string {
  return s
    .replace(/∞/g, "lots")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/—/g, "-")
    .replace(/–/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E]/g, "");
}
