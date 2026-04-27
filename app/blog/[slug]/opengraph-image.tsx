import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/blog/posts";
import { formatPostDate } from "@/lib/blog/formatters";

export const alt = "saaspocalypse blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const INK = "#0a0a0a";
const CREAM = "#f4f1e8";
const PAPER = "#ffffff";
const LIME = "#c6ff00";

type Params = Promise<{ slug: string }>;

export default async function Image({ params }: { params: Params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    console.error(`[og:blog] no post found for slug "${slug}" — fallback`);
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
            }}
          >
            post not found
          </div>
        </div>
      ),
      { ...size },
    );
  }

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
            <span style={{ opacity: 0.6, display: "flex" }}>/ the blog</span>
          </div>
          <div style={{ opacity: 0.6, display: "flex" }}>
            ▸ {sanitize(post.category)}
          </div>
        </div>

        {/* Tags */}
        <div style={{ display: "flex", gap: 10, marginTop: 32 }}>
          {post.tags.slice(0, 3).map((t) => (
            <span
              key={t}
              style={{
                display: "flex",
                background: LIME,
                border: `2px solid ${INK}`,
                padding: "4px 12px",
                fontSize: 16,
                fontWeight: 700,
                letterSpacing: "0.05em",
              }}
            >
              #{sanitize(t)}
            </span>
          ))}
        </div>

        {/* Title */}
        <div
          style={{
            display: "flex",
            marginTop: 28,
            fontSize: 64,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.03em",
            flex: 1,
          }}
        >
          {truncate(post.title, 140)}
        </div>

        {/* Excerpt card */}
        <div
          style={{
            display: "flex",
            background: PAPER,
            border: `2.5px solid ${INK}`,
            padding: "20px 22px",
            fontSize: 22,
            lineHeight: 1.35,
            marginBottom: 24,
            opacity: 0.9,
          }}
        >
          {truncate(post.excerpt, 220)}
        </div>

        {/* Foot */}
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
          <div style={{ display: "flex", gap: 24 }}>
            <span style={{ display: "flex" }}>by {post.author}</span>
            <span style={{ display: "flex", opacity: 0.4 }}>·</span>
            <span style={{ display: "flex" }}>{formatPostDate(post.date)}</span>
            <span style={{ display: "flex", opacity: 0.4 }}>·</span>
            <span style={{ display: "flex" }}>{post.read_time} read</span>
          </div>
          <div style={{ opacity: 0.6, display: "flex" }}>
            saaspocalypse.dev
          </div>
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

function truncate(s: string, n: number): string {
  const clean = sanitize(s);
  if (clean.length <= n) return clean;
  return `${clean.slice(0, n - 3).trimEnd()}...`;
}
