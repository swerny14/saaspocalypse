import { ImageResponse } from "next/og";

export const alt = "saaspocalypse blog — field notes from the apocalypse";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const INK = "#0a0a0a";
const CREAM = "#f4f1e8";
const LIME = "#c6ff00";
const CORAL = "#ff6b4a";

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
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
            / the blog
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 32,
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 700,
              lineHeight: 0.95,
              letterSpacing: "-0.04em",
              display: "flex",
              flexDirection: "column",
            }}
          >
            <span style={{ display: "flex" }}>field notes from</span>
            <span style={{ display: "flex", marginTop: 8 }}>
              <span
                style={{
                  background: LIME,
                  padding: "0 18px",
                  display: "flex",
                }}
              >
                the apocalypse.
              </span>
            </span>
          </div>
          <div
            style={{
              marginTop: 32,
              fontSize: 24,
              opacity: 0.75,
              maxWidth: 880,
              lineHeight: 1.4,
              display: "flex",
            }}
          >
            essays, build logs, and confessions from indie hackers who
            probably shouldn&apos;t be left alone with a dev server.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderTop: `2.5px solid ${INK}`,
            paddingTop: 18,
            fontSize: 17,
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex", gap: 14 }}>
            <span
              style={{
                display: "flex",
                background: CORAL,
                border: `2px solid ${INK}`,
                padding: "4px 12px",
              }}
            >
              ESSAYS
            </span>
            <span
              style={{
                display: "flex",
                background: LIME,
                border: `2px solid ${INK}`,
                padding: "4px 12px",
              }}
            >
              OPINION
            </span>
            <span
              style={{
                display: "flex",
                background: "#ffffff",
                border: `2px solid ${INK}`,
                padding: "4px 12px",
              }}
            >
              BUILD-LOG
            </span>
            <span
              style={{
                display: "flex",
                background: "#ffd84d",
                border: `2px solid ${INK}`,
                padding: "4px 12px",
              }}
            >
              ROASTS
            </span>
          </div>
          <div style={{ opacity: 0.6, display: "flex" }}>
            saaspocalypse.dev/blog
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
