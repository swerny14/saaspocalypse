import { ImageResponse } from "next/og";

export const alt = "saaspocalypse — can I build this myself?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
// Static art — render once per hour at most. Without this, every social
// crawler unfurl re-runs Satori from scratch.
export const revalidate = 3600;

const INK = "#0a0a0a";
const CREAM = "#f4f1e8";
const PAPER = "#ffffff";
const LIME = "#c6ff00";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: CREAM,
          display: "flex",
          flexDirection: "column",
          padding: "56px 64px",
          fontFamily: "sans-serif",
          color: INK,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              background: INK,
              color: LIME,
              padding: "8px 18px",
              fontSize: 30,
              fontWeight: 700,
              letterSpacing: "0.05em",
            }}
          >
            saaspocalypse
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 16,
              opacity: 0.55,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            verdict engine
          </div>
        </div>

        {/* Headline + tagline */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 28,
          }}
        >
          <div
            style={{
              fontSize: 100,
              fontWeight: 700,
              lineHeight: 1,
              letterSpacing: "-0.04em",
              display: "flex",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <span style={{ display: "flex" }}>can I</span>
            <span
              style={{
                background: INK,
                color: LIME,
                padding: "0 22px",
                transform: "rotate(-2deg)",
                display: "flex",
              }}
            >
              build
            </span>
            <span style={{ display: "flex" }}>this myself?</span>
          </div>

          <div
            style={{
              marginTop: 28,
              fontSize: 26,
              opacity: 0.75,
              maxWidth: 940,
              lineHeight: 1.35,
              display: "flex",
            }}
          >
            paste any SaaS URL. get a buildability score, stack receipt,
            time-to-clone, and a snarky one-liner.
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "auto",
            borderTop: `2.5px solid ${INK}`,
            paddingTop: 18,
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", gap: 14 }}>
            <span style={{ display: "flex", background: PAPER, border: `2px solid ${INK}`, padding: "4px 12px" }}>
              WEEKEND
            </span>
            <span style={{ display: "flex", background: PAPER, border: `2px solid ${INK}`, padding: "4px 12px" }}>
              MONTH
            </span>
            <span style={{ display: "flex", background: "#ef4444", border: `2px solid ${INK}`, padding: "4px 12px" }}>
              DON&apos;T
            </span>
          </div>
          <div style={{ display: "flex", opacity: 0.6 }}>saaspocalypse.dev</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
