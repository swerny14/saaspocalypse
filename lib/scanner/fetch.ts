import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class FetchError extends Error {
  constructor(
    message: string,
    public readonly kind: "timeout" | "status" | "network" | "ssrf",
  ) {
    super(message);
    this.name = "FetchError";
  }
}

const MAX_RESPONSE_BYTES = 200 * 1024; // 200KB raw HTML cap
const MAX_TEXT_CHARS = 20_000; // ~5K tokens once handed to Claude
// 200K matches MAX_RESPONSE_BYTES so the un-stripped slice covers the whole
// fetched response. The earlier 50K cap silently truncated before the
// footer of any SPA-heavy homepage (Stripe, Linear, Notion all ~150–250KB
// of <head> + inline scripts before the body), making community-channel
// detection in lib/scanner/distribution.ts systematically miss social links
// in the footer. Renaming would churn callsites; the variable name is
// retained but the cap is now "raw response" rather than "head only".
const MAX_RAW_HEAD_CHARS = 200_000;
const FETCH_TIMEOUT_MS = 10_000;
const MAX_REDIRECTS = 3;
const UA =
  "Mozilla/5.0 (compatible; SaaspocalypseBot/1.0; +https://www.saaspocalypse.dev)";
// Fallback UA used only after a 403 with our identifying UA. Some WAFs
// (Cloudflare, Akamai) reject anything with "bot" in the UA string regardless
// of intent. We try once more looking like a normal browser before giving up.
const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

export type FetchResult = {
  /** Cleaned, truncated text — what Claude sees. */
  cleaned: string;
  /** First ~50KB of un-stripped HTML — for fingerprint regex (script src, meta tags, inline configs). */
  rawHead: string;
  /** Response headers from the final hop, lowercased keys. set-cookie collapsed (use setCookies for names). */
  headers: Record<string, string>;
  /** Raw Set-Cookie header values from the final hop (one entry per cookie). */
  setCookies: string[];
  /** URL of the final hop after redirects. */
  finalUrl: string;
};

/**
 * Fetch the homepage of `url` and return cleaned text plus raw signals
 * (headers, set-cookies, un-stripped HTML head, final URL) for downstream
 * fingerprinting. Strips scripts/styles/svg/comments from `cleaned`, preserves
 * rough block structure with newlines, decodes common HTML entities, and caps
 * the cleaned output at 20KB.
 *
 * Follows redirects manually (up to 3 hops) and resolves each hop's
 * hostname to verify it doesn't point at a private/internal IP. Without
 * this check, a SaaS that 301s to http://169.254.169.254/ (cloud metadata)
 * or http://10.0.0.x/ would let us inadvertently exfiltrate internal data.
 */
export async function fetchAndCleanHomepage(url: string): Promise<FetchResult> {
  let current = url;
  let useBrowserUa = false;

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    await assertPublicTarget(current);

    let res: Response;
    try {
      res = await fetch(current, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          "User-Agent": useBrowserUa ? BROWSER_UA : UA,
          Accept: "text/html,*/*;q=0.8",
        },
        redirect: "manual",
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

    // WAF bot-block retry: if the identifying UA got a 403, retry the same
    // hop once with a browser UA before giving up. Only flips on the first
    // 403 we see — a second 403 with the browser UA falls through to the
    // normal !res.ok branch.
    if (res.status === 403 && !useBrowserUa) {
      useBrowserUa = true;
      hop -= 1;
      continue;
    }

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (!location) {
        throw new FetchError(`HTTP ${res.status} without Location`, "status");
      }
      // Resolve the next URL relative to the current one so we handle
      // path-only Location headers correctly.
      let next: URL;
      try {
        next = new URL(location, current);
      } catch {
        throw new FetchError("redirect Location wasn't a valid URL", "status");
      }
      if (next.protocol !== "http:" && next.protocol !== "https:") {
        throw new FetchError(
          `redirect to non-HTTP scheme: ${next.protocol}`,
          "ssrf",
        );
      }
      current = next.toString();
      continue;
    }

    if (!res.ok) {
      throw new FetchError(`HTTP ${res.status}`, "status");
    }

    const buf = await res.arrayBuffer();
    const clipped =
      buf.byteLength > MAX_RESPONSE_BYTES ? buf.slice(0, MAX_RESPONSE_BYTES) : buf;
    const html = new TextDecoder("utf-8", { fatal: false }).decode(clipped);

    // Project headers to a plain lowercased object. Set-Cookie collapses to a
    // single comma-joined value here — read it via getSetCookie() instead.
    const headers: Record<string, string> = {};
    res.headers.forEach((value, key) => {
      headers[key.toLowerCase()] = value;
    });
    const setCookies =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [];

    return {
      cleaned: cleanHtml(html),
      rawHead: html.length > MAX_RAW_HEAD_CHARS ? html.slice(0, MAX_RAW_HEAD_CHARS) : html,
      headers,
      setCookies,
      finalUrl: current,
    };
  }

  throw new FetchError("too many redirects", "status");
}

/**
 * Refuse to fetch any URL whose hostname resolves to a non-public address.
 * Covers: literal IPs in the Location header, hostnames that DNS-resolve to
 * RFC1918, loopback, link-local (incl. AWS metadata 169.254.169.254), or IPv6
 * equivalents. Throws FetchError(kind: "ssrf") on rejection.
 */
async function assertPublicTarget(rawUrl: string): Promise<void> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new FetchError("malformed URL", "ssrf");
  }
  // Strip brackets that URL keeps around bare IPv6 hosts.
  const host = parsed.hostname.replace(/^\[|\]$/g, "");

  if (isIP(host)) {
    if (!isPublicIp(host)) {
      throw new FetchError(`refusing to fetch private IP ${host}`, "ssrf");
    }
    return;
  }

  let records: { address: string; family: number }[];
  try {
    records = await lookup(host, { all: true });
  } catch (e) {
    throw new FetchError(
      `DNS lookup failed for ${host}: ${e instanceof Error ? e.message : String(e)}`,
      "network",
    );
  }
  for (const r of records) {
    if (!isPublicIp(r.address)) {
      throw new FetchError(
        `${host} resolves to non-public address ${r.address}`,
        "ssrf",
      );
    }
  }
}

/** True iff `addr` is a globally-routable unicast address. */
function isPublicIp(addr: string): boolean {
  const family = isIP(addr);
  if (family === 4) return isPublicIPv4(addr);
  if (family === 6) return isPublicIPv6(addr);
  return false;
}

function isPublicIPv4(addr: string): boolean {
  const parts = addr.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return false;
  }
  const [a, b] = parts as [number, number, number, number];
  // 0.0.0.0/8 — "this network"
  if (a === 0) return false;
  // 10.0.0.0/8 — RFC1918 private
  if (a === 10) return false;
  // 127.0.0.0/8 — loopback
  if (a === 127) return false;
  // 169.254.0.0/16 — link-local (AWS/GCP/Azure metadata)
  if (a === 169 && b === 254) return false;
  // 172.16.0.0/12 — RFC1918 private
  if (a === 172 && b >= 16 && b <= 31) return false;
  // 192.168.0.0/16 — RFC1918 private
  if (a === 192 && b === 168) return false;
  // 100.64.0.0/10 — CGNAT
  if (a === 100 && b >= 64 && b <= 127) return false;
  // 224.0.0.0/4 — multicast; 240.0.0.0/4 — reserved
  if (a >= 224) return false;
  return true;
}

function isPublicIPv6(addr: string): boolean {
  const lower = addr.toLowerCase();
  // Loopback (::1) and unspecified (::)
  if (lower === "::1" || lower === "::") return false;
  // IPv4-mapped (::ffff:a.b.c.d) — re-validate the embedded v4
  const v4Mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4Mapped) return isPublicIPv4(v4Mapped[1]);
  // fc00::/7 — Unique Local Addresses
  if (lower.startsWith("fc") || lower.startsWith("fd")) return false;
  // fe80::/10 — link-local
  if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) {
    return false;
  }
  // ff00::/8 — multicast
  if (lower.startsWith("ff")) return false;
  return true;
}

export function cleanHtml(html: string): string {
  let out = html;
  const metadataText = extractMetadataText(html);

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

  if (metadataText) {
    out = `${metadataText}\n${out}`;
  }

  // 5. Collapse horizontal whitespace, preserve newlines, drop empty lines.
  const seen = new Set<string>();
  out = out
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter((line) => {
      if (!line || seen.has(line)) return false;
      seen.add(line);
      return true;
    })
    .join("\n");

  // 6. Truncate.
  if (out.length > MAX_TEXT_CHARS) {
    out = out.slice(0, MAX_TEXT_CHARS);
  }

  return out;
}

function extractMetadataText(html: string): string {
  const parts: string[] = [];

  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  if (title) parts.push(title);

  for (const tag of html.matchAll(/<meta\b[^>]*>/gi)) {
    const rawTag = tag[0];
    const key =
      getHtmlAttr(rawTag, "name") ??
      getHtmlAttr(rawTag, "property") ??
      getHtmlAttr(rawTag, "itemprop");
    if (!key || !isUsefulMetaKey(key)) continue;

    const content = getHtmlAttr(rawTag, "content");
    if (content) parts.push(content);
  }

  return normalizeExtractedText(parts.join("\n"));
}

function isUsefulMetaKey(key: string): boolean {
  return /^(description|og:(title|description|site_name)|twitter:(title|description)|application-name|keywords)$/i.test(
    key,
  );
}

function getHtmlAttr(tag: string, name: string): string | null {
  const unquotedValue = "[^\\s\"'=<>`]+";
  const attr = tag.match(
    new RegExp(
      `${escapeRegExp(name)}\\s*=\\s*("([^"]*)"|'([^']*)'|(${unquotedValue}))`,
      "i",
    ),
  );
  return attr?.[2] ?? attr?.[3] ?? attr?.[4] ?? null;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&apos;/gi, "'")
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}
