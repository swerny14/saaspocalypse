import { ImageResponse } from "next/og";
import { getReportBySlug } from "@/lib/db/reports";
import { TIER_FG } from "@/lib/scanner/schema";

export const alt = "saaspocalypse verdict";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Cache for 1 hour. Matches the report page's ISR cadence — we're fine if
// social previews lag the canonical view by up to an hour.
export const revalidate = 3600;

const INK = "#0a0a0a";
const CREAM = "#f4f1e8";
const PAPER = "#ffffff";
const LIME = "#c6ff00";
const TIER_BG: Record<string, string> = {
  SOFT: "#dcfce7",
  CONTESTED: "#fef9c3",
  FORTRESS: "#fee2e2",
};

type Params = Promise<{ slug: string }>;

export default async function Image({ params }: { params: Params }) {
  const { slug } = await params;
  const report = await getReportBySlug(slug);

  if (!report) {
    console.error(`[og:report] no report found for slug "${slug}" — rendering fallback`);
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
            verdict not found
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 22,
              opacity: 0.6,
              letterSpacing: "0.05em",
            }}
          >
            slug: {slug}
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const tierColor = TIER_FG[report.tier];
  const tierBg = TIER_BG[report.tier];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: CREAM,
          display: "flex",
          flexDirection: "column",
          padding: 56,
          fontFamily: "sans-serif",
          color: INK,
        }}
      >
        {/* Header strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 18,
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
            <span style={{ opacity: 0.6, display: "flex" }}>verdict</span>
          </div>
          <div style={{ opacity: 0.6, display: "flex" }}>{sanitize(report.domain)}</div>
        </div>

        {/* Body: score + take */}
        <div
          style={{
            display: "flex",
            flex: 1,
            marginTop: 30,
            gap: 40,
          }}
        >
          {/* Score block */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              padding: "28px 28px",
              background: tierBg,
              border: `2.5px solid ${INK}`,
              minWidth: 360,
              boxShadow: `8px 8px 0 0 ${INK}`,
            }}
          >
            <div
              style={{
                fontFamily: "monospace",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                opacity: 0.75,
                display: "flex",
              }}
            >
              wedge score
            </div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 240,
                  fontWeight: 700,
                  lineHeight: 0.85,
                  letterSpacing: "-0.05em",
                  color: tierColor,
                }}
              >
                {String(report.wedge_score)}
              </div>
              <div style={{ fontSize: 40, opacity: 0.5, fontWeight: 500, display: "flex" }}>
                /100
              </div>
            </div>
            <div
              style={{
                display: "flex",
                alignSelf: "flex-start",
                background: INK,
                color: tierColor,
                padding: "6px 16px",
                fontFamily: "monospace",
                fontWeight: 700,
                fontSize: 22,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              {report.tier}
            </div>
          </div>

          {/* Name + take */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: 16,
            }}
          >
            <div
              style={{
                fontSize: 64,
                fontWeight: 700,
                lineHeight: 1,
                letterSpacing: "-0.03em",
                display: "flex",
              }}
            >
              {sanitize(report.name)}
            </div>
            <div
              style={{
                fontSize: 24,
                opacity: 0.7,
                display: "flex",
              }}
            >
              {sanitize(report.tagline)}
            </div>
            <div
              style={{
                marginTop: 14,
                padding: "20px 22px",
                background: PAPER,
                border: `2.5px solid ${INK}`,
                fontSize: 30,
                fontWeight: 500,
                lineHeight: 1.25,
                letterSpacing: "-0.01em",
                display: "flex",
              }}
            >
              {`“${truncate(report.take, 180)}”`}
            </div>
          </div>
        </div>

        {/* Foot strip */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `2.5px solid ${INK}`,
            paddingTop: 18,
            fontSize: 18,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", gap: 28 }}>
            <span style={{ display: "flex" }}>{sanitize(report.time_estimate)}</span>
            <span style={{ opacity: 0.4, display: "flex" }}>·</span>
            <span style={{ display: "flex" }}>{fmtTotal(report.est_total)}</span>
          </div>
          <div style={{ opacity: 0.6, display: "flex" }}>saaspocalypse.dev</div>
        </div>
      </div>
    ),
    { ...size },
  );
}

/**
 * Satori only embeds a basic Latin font in `next/og`. Strip any glyph it can't
 * render so we don't blow up on emoji, infinity, em-dashes, smart quotes, etc.
 */
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

function truncate(s: string, n: number): string {
  const clean = sanitize(s);
  if (clean.length <= n) return clean;
  return `${clean.slice(0, n - 3).trimEnd()}...`;
}

function fmtTotal(v: number | string): string {
  if (typeof v === "string") return sanitize(v);
  if (v === 0) return "$0/mo";
  if (v < 100) return `$${v.toFixed(2)}/mo`;
  return `$${v.toLocaleString()}/mo`;
}
