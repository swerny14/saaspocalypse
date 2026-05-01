import { ImageResponse } from "next/og";
import { getReportBySlug, type StoredReport } from "@/lib/db/reports";
import { TIER_FG } from "@/lib/scanner/schema";

export const alt = "saaspocalypse head-to-head";
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

type Params = Promise<{ pair: string }>;

function parsePair(pair: string): { a: string; b: string } | null {
  const parts = pair.split("-vs-");
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  if (!a || !b || a === b) return null;
  if (a > b) return null;
  return { a, b };
}

export default async function Image({ params }: { params: Params }) {
  const { pair } = await params;
  const parsed = parsePair(pair);
  if (!parsed) return fallback(`pair: ${pair}`);

  const [a, b] = await Promise.all([
    getReportBySlug(parsed.a),
    getReportBySlug(parsed.b),
  ]);
  if (!a || !b) return fallback(`pair: ${pair}`);

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
            <span style={{ opacity: 0.6, display: "flex" }}>head-to-head</span>
          </div>
          <div style={{ opacity: 0.6, display: "flex", fontSize: 16 }}>
            wedge comparison
          </div>
        </div>

        {/* Body — split panels */}
        <div style={{ display: "flex", flex: 1, position: "relative" }}>
          <Side report={a} align="left" />
          <Divider score_delta={b.wedge_score - a.wedge_score} />
          <Side report={b} align="right" />
        </div>
      </div>
    ),
    { ...size },
  );
}

function Side({ report, align }: { report: StoredReport; align: "left" | "right" }) {
  const tierColor = TIER_FG[report.tier];
  const tierBg = TIER_BG[report.tier];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        padding: "40px 48px",
        background: tierBg,
        alignItems: align === "right" ? "flex-end" : "flex-start",
        textAlign: align === "right" ? "right" : "left",
      }}
    >
      <div
        style={{
          display: "flex",
          background: INK,
          color: tierColor,
          padding: "5px 14px",
          fontFamily: "monospace",
          fontWeight: 700,
          fontSize: 18,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          marginBottom: 18,
        }}
      >
        {report.tier}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 180,
          fontWeight: 700,
          lineHeight: 0.85,
          letterSpacing: "-0.05em",
          color: tierColor,
          marginBottom: 14,
        }}
      >
        {String(report.wedge_score)}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 38,
          fontWeight: 700,
          lineHeight: 1.05,
          letterSpacing: "-0.02em",
          marginBottom: 8,
          maxWidth: 460,
        }}
      >
        {sanitize(report.name)}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 18,
          opacity: 0.65,
          fontFamily: "monospace",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
        }}
      >
        {sanitize(report.time_estimate)}
      </div>
    </div>
  );
}

function Divider({ score_delta }: { score_delta: number }) {
  const sign = score_delta === 0 ? "=" : score_delta > 0 ? "+" : "-";
  const abs = Math.abs(score_delta);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: CREAM,
        borderLeft: `2.5px solid ${INK}`,
        borderRight: `2.5px solid ${INK}`,
        padding: "20px 28px",
        minWidth: 130,
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 30,
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          opacity: 0.5,
          marginBottom: 12,
        }}
      >
        vs
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: "-0.04em",
          color: INK,
        }}
      >
        {`${sign}${abs}`}
      </div>
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
          comparison not found
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
