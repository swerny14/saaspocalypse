export class FetchError extends Error {
  constructor(
    message: string,
    public readonly kind: "timeout" | "status" | "network",
  ) {
    super(message);
    this.name = "FetchError";
  }
}

const MAX_RESPONSE_BYTES = 200 * 1024; // 200KB raw HTML cap
const MAX_TEXT_CHARS = 20_000; // ~5K tokens once handed to Claude
const FETCH_TIMEOUT_MS = 10_000;
const UA =
  "Mozilla/5.0 (compatible; SaaspocalypseBot/1.0; +https://saaspocalypse.biz)";

/**
 * Fetch the homepage of `url` and return its cleaned, truncated text.
 * Strips scripts/styles/svg/comments, preserves rough block structure with
 * newlines, decodes common HTML entities, and caps output at 20KB.
 */
export async function fetchAndCleanHomepage(url: string): Promise<string> {
  let res: Response;
  try {
    res = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": UA, Accept: "text/html,*/*;q=0.8" },
      redirect: "follow",
    });
  } catch (e) {
    if (e instanceof Error && e.name === "TimeoutError") {
      throw new FetchError("fetch timed out", "timeout");
    }
    throw new FetchError(
      e instanceof Error ? e.message : "network error",
      "network",
    );
  }

  if (!res.ok) {
    throw new FetchError(`HTTP ${res.status}`, "status");
  }

  const buf = await res.arrayBuffer();
  const clipped = buf.byteLength > MAX_RESPONSE_BYTES ? buf.slice(0, MAX_RESPONSE_BYTES) : buf;
  const html = new TextDecoder("utf-8", { fatal: false }).decode(clipped);

  return cleanHtml(html);
}

export function cleanHtml(html: string): string {
  let out = html;

  // 1. Strip noise entirely (with their content).
  out = out.replace(/<!--[\s\S]*?-->/g, " ");
  out = out.replace(/<script\b[\s\S]*?<\/script>/gi, " ");
  out = out.replace(/<style\b[\s\S]*?<\/style>/gi, " ");
  out = out.replace(/<svg\b[\s\S]*?<\/svg>/gi, " ");
  out = out.replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ");

  // 2. Insert newlines at block boundaries so structure isn't lost when tags are stripped.
  out = out.replace(
    /<\/?(p|div|section|article|header|footer|nav|main|h[1-6]|li|ul|ol|br|hr|tr|td|th|pre|blockquote|figcaption|dd|dt)\b[^>]*>/gi,
    "\n",
  );

  // 3. Strip remaining tags.
  out = out.replace(/<[^>]+>/g, " ");

  // 4. Decode a handful of common entities (a full entity decoder is overkill here).
  out = out
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'");

  // 5. Collapse horizontal whitespace, preserve newlines, drop empty lines.
  out = out
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");

  // 6. Truncate.
  if (out.length > MAX_TEXT_CHARS) {
    out = out.slice(0, MAX_TEXT_CHARS);
  }

  return out;
}
