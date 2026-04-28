import { resolveCname } from "node:dns/promises";
import type { FetchResult } from "./fetch";

const CNAME_TIMEOUT_MS = 1500;

export type DetectedStack = {
  hosting?: string;
  framework?: string;
  cms?: string;
  analytics?: string[];
  payments?: string[];
  auth?: string[];
  support?: string[];
  cdn?: string[];
  email?: string[];
  raw_signals: {
    /** Allow-listed response headers from the final hop (lowercased keys). */
    headers: Record<string, string>;
    /** Cookie names only — values are stripped before this point. */
    cookies: string[];
    /** Up to ~10 unique third-party script src URLs. */
    bundle_paths: string[];
    /** Raw <meta name="generator" content="…"> values. */
    meta_generators: string[];
    cname?: string;
  };
};

/** Headers we surface in raw_signals + match against. Strict allowlist; nothing else is read. */
const HEADER_ALLOWLIST = new Set([
  "server",
  "x-powered-by",
  "x-vercel-id",
  "x-vercel-cache",
  "x-nf-request-id",
  "x-amz-cf-id",
  "x-served-by",
  "x-fastly-request-id",
  "fly-request-id",
  "cf-ray",
  "via",
  "x-shopify-stage",
]);

type Signals = {
  domain: string;
  finalHost: string;
  headers: Record<string, string>;
  cookieNames: string[];
  bundlePaths: string[];
  metaGenerators: string[];
  rawHead: string;
};

type Detector = {
  category: keyof Omit<DetectedStack, "raw_signals">;
  name: string;
  match: (s: Signals) => boolean;
};

const has = (h: Record<string, string>, key: string): boolean => key in h;
const headerIncludes = (h: Record<string, string>, key: string, needle: RegExp): boolean =>
  typeof h[key] === "string" && needle.test(h[key]);
const bundleMatches = (paths: string[], needle: RegExp): boolean =>
  paths.some((p) => needle.test(p));
const cookieMatches = (cookies: string[], needle: RegExp): boolean =>
  cookies.some((c) => needle.test(c));
const headHas = (raw: string, needle: RegExp): boolean => needle.test(raw);
const generatorMatches = (gens: string[], needle: RegExp): boolean =>
  gens.some((g) => needle.test(g));

const DETECTORS: Detector[] = [
  // ── hosting (single value, first match wins) ─────────────────────────────
  { category: "hosting", name: "Vercel", match: (s) => has(s.headers, "x-vercel-id") || headerIncludes(s.headers, "server", /vercel/i) },
  { category: "hosting", name: "Netlify", match: (s) => has(s.headers, "x-nf-request-id") || headerIncludes(s.headers, "server", /netlify/i) },
  { category: "hosting", name: "Fly.io", match: (s) => has(s.headers, "fly-request-id") || headerIncludes(s.headers, "server", /^fly\//i) },
  { category: "hosting", name: "Heroku", match: (s) => headerIncludes(s.headers, "via", /heroku/i) },

  // ── cdn (multi) ─────────────────────────────────────────────────────────
  { category: "cdn", name: "Cloudflare", match: (s) => has(s.headers, "cf-ray") || headerIncludes(s.headers, "server", /cloudflare/i) },
  { category: "cdn", name: "CloudFront", match: (s) => has(s.headers, "x-amz-cf-id") || headerIncludes(s.headers, "via", /cloudfront/i) },
  { category: "cdn", name: "Fastly", match: (s) => has(s.headers, "x-fastly-request-id") || headerIncludes(s.headers, "x-served-by", /cache-/) },

  // ── framework (single) ──────────────────────────────────────────────────
  { category: "framework", name: "Next.js", match: (s) => headHas(s.rawHead, /<script[^>]+id=["']__NEXT_DATA__["']/i) || bundleMatches(s.bundlePaths, /\/_next\/static\//) || headHas(s.rawHead, /<meta[^>]+name=["']next-head-count["']/i) },
  { category: "framework", name: "Remix", match: (s) => headHas(s.rawHead, /__remixContext/) },
  { category: "framework", name: "Astro", match: (s) => bundleMatches(s.bundlePaths, /\/_astro\//) || generatorMatches(s.metaGenerators, /astro/i) },
  { category: "framework", name: "Nuxt", match: (s) => headHas(s.rawHead, /window\.__NUXT__/) || generatorMatches(s.metaGenerators, /nuxt/i) },
  { category: "framework", name: "SvelteKit", match: (s) => headHas(s.rawHead, /<script[^>]+sveltekit-data/) || generatorMatches(s.metaGenerators, /sveltekit/i) },
  { category: "framework", name: "Gatsby", match: (s) => headHas(s.rawHead, /id=["']___gatsby["']/) || generatorMatches(s.metaGenerators, /gatsby/i) },

  // ── cms (single) ────────────────────────────────────────────────────────
  { category: "cms", name: "WordPress", match: (s) => generatorMatches(s.metaGenerators, /wordpress/i) || bundleMatches(s.bundlePaths, /\/wp-content\/|\/wp-includes\//) },
  { category: "cms", name: "Webflow", match: (s) => generatorMatches(s.metaGenerators, /webflow/i) || headHas(s.rawHead, /data-wf-page=/) },
  { category: "cms", name: "Framer", match: (s) => bundleMatches(s.bundlePaths, /framerusercontent\.com|framer\.com\/m\//) || generatorMatches(s.metaGenerators, /framer/i) },
  { category: "cms", name: "Ghost", match: (s) => generatorMatches(s.metaGenerators, /^ghost/i) },
  { category: "cms", name: "Shopify", match: (s) => has(s.headers, "x-shopify-stage") || bundleMatches(s.bundlePaths, /cdn\.shopify\.com/) },
  { category: "cms", name: "Wix", match: (s) => generatorMatches(s.metaGenerators, /wix/i) || bundleMatches(s.bundlePaths, /static\.parastorage\.com/) },
  { category: "cms", name: "Squarespace", match: (s) => generatorMatches(s.metaGenerators, /squarespace/i) },

  // ── analytics (multi) ───────────────────────────────────────────────────
  { category: "analytics", name: "PostHog", match: (s) => bundleMatches(s.bundlePaths, /posthog\.com|i\.posthog\.com/) || cookieMatches(s.cookieNames, /^ph_/) || headHas(s.rawHead, /posthog\.init\(/) },
  { category: "analytics", name: "Plausible", match: (s) => bundleMatches(s.bundlePaths, /plausible\.io\/js/) },
  { category: "analytics", name: "GA4", match: (s) => bundleMatches(s.bundlePaths, /googletagmanager\.com\/gtag\/js\?id=G-/) || headHas(s.rawHead, /gtag\(['"]config['"], ?['"]G-/) },
  { category: "analytics", name: "GTM", match: (s) => bundleMatches(s.bundlePaths, /googletagmanager\.com\/gtm\.js/) },
  { category: "analytics", name: "Segment", match: (s) => bundleMatches(s.bundlePaths, /cdn\.segment\.com/) || headHas(s.rawHead, /analytics\.load\(/) },
  { category: "analytics", name: "Fathom", match: (s) => bundleMatches(s.bundlePaths, /usefathom\.com\/script\.js/) },
  { category: "analytics", name: "Mixpanel", match: (s) => bundleMatches(s.bundlePaths, /cdn\.mxpnl\.com|cdn\.mixpanel\.com/) },
  { category: "analytics", name: "Vercel Analytics", match: (s) => bundleMatches(s.bundlePaths, /\/_vercel\/insights\//) },

  // ── payments (multi) ────────────────────────────────────────────────────
  { category: "payments", name: "Stripe", match: (s) => bundleMatches(s.bundlePaths, /js\.stripe\.com/) || headHas(s.rawHead, /Stripe\(['"]pk_/) },
  { category: "payments", name: "Lemon Squeezy", match: (s) => bundleMatches(s.bundlePaths, /assets\.lemonsqueezy\.com|app\.lemonsqueezy\.com/) },
  { category: "payments", name: "Paddle", match: (s) => bundleMatches(s.bundlePaths, /cdn\.paddle\.com/) || headHas(s.rawHead, /Paddle\.Setup\(/) },

  // ── auth (multi) ────────────────────────────────────────────────────────
  { category: "auth", name: "Clerk", match: (s) => bundleMatches(s.bundlePaths, /clerk\.(com|dev|services)/) || cookieMatches(s.cookieNames, /^__clerk/) },
  { category: "auth", name: "Auth0", match: (s) => bundleMatches(s.bundlePaths, /cdn\.auth0\.com/) },
  { category: "auth", name: "WorkOS", match: (s) => bundleMatches(s.bundlePaths, /workos\.com/) },
  { category: "auth", name: "Supabase Auth", match: (s) => cookieMatches(s.cookieNames, /^sb-.*-auth-token$/) },

  // ── support (multi) ─────────────────────────────────────────────────────
  { category: "support", name: "Intercom", match: (s) => bundleMatches(s.bundlePaths, /widget\.intercom\.io|intercomcdn\.com/) },
  { category: "support", name: "Crisp", match: (s) => bundleMatches(s.bundlePaths, /client\.crisp\.chat/) },
  { category: "support", name: "Plain", match: (s) => bundleMatches(s.bundlePaths, /chat\.cdn-plain\.com|chat\.plain\.com/) },
  { category: "support", name: "HelpScout", match: (s) => bundleMatches(s.bundlePaths, /beacon-v2\.helpscout\.net/) },
];

/**
 * Run deterministic stack detection over the fetch result. Pure function plus
 * one optional CNAME DNS lookup capped at 1.5s. Never throws — DNS errors are
 * captured silently. Returns null if the fetch result is too thin to fingerprint.
 */
export async function detectStack(
  fetchResult: FetchResult,
  domain: string,
): Promise<DetectedStack> {
  const finalHost = safeHost(fetchResult.finalUrl) ?? domain;
  const cookieNames = fetchResult.setCookies
    .map((c) => c.split("=")[0]?.trim())
    .filter((n): n is string => Boolean(n) && n.length < 100);
  const bundlePaths = extractBundlePaths(fetchResult.rawHead, finalHost);
  const metaGenerators = extractMetaGenerators(fetchResult.rawHead);

  const safelistedHeaders: Record<string, string> = {};
  for (const [k, v] of Object.entries(fetchResult.headers)) {
    if (HEADER_ALLOWLIST.has(k)) safelistedHeaders[k] = v.slice(0, 200);
  }

  const signals: Signals = {
    domain,
    finalHost,
    headers: safelistedHeaders,
    cookieNames,
    bundlePaths,
    metaGenerators,
    rawHead: fetchResult.rawHead,
  };

  const detected: DetectedStack = {
    raw_signals: {
      headers: safelistedHeaders,
      cookies: cookieNames.slice(0, 30),
      bundle_paths: bundlePaths.slice(0, 10),
      meta_generators: metaGenerators.slice(0, 5),
    },
  };

  for (const det of DETECTORS) {
    if (!det.match(signals)) continue;
    const cat = det.category;
    if (cat === "hosting" || cat === "framework" || cat === "cms") {
      // Single-value categories: keep the first match, ignore subsequent ones.
      if (!detected[cat]) detected[cat] = det.name;
    } else {
      const list = (detected[cat] ?? []) as string[];
      if (!list.includes(det.name)) list.push(det.name);
      detected[cat] = list;
    }
  }

  // CNAME lookup — soft-fails on any error or timeout. The first record is
  // canonical; we only keep one for display.
  try {
    const cname = await withTimeout(resolveCname(domain), CNAME_TIMEOUT_MS);
    if (cname && cname.length > 0 && typeof cname[0] === "string") {
      detected.raw_signals.cname = cname[0];
    }
  } catch {
    // ignore — DNS without a CNAME, NXDOMAIN, timeout, etc. all soft-fail
  }

  return detected;
}

function safeHost(url: string): string | null {
  try {
    return new URL(url).hostname;
  } catch {
    return null;
  }
}

/**
 * Pull script src and link href URLs out of the raw HTML head. Drop entries
 * that point at the page's own host — they're not useful as third-party
 * fingerprints. Cap at 50 candidates; dedupe by full URL.
 */
function extractBundlePaths(rawHead: string, finalHost: string): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const re = /<(?:script|link)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']{4,300})["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawHead)) !== null) {
    const href = m[1];
    if (!href) continue;
    // Skip same-origin references — only third-party fingerprints carry signal.
    if (href.startsWith("/") && !href.startsWith("//")) {
      // Same-origin path. Keep — these are useful for /_next/static, /_astro, etc.
      if (!seen.has(href)) {
        seen.add(href);
        out.push(href);
      }
      continue;
    }
    if (href.startsWith(`https://${finalHost}`) || href.startsWith(`http://${finalHost}`)) {
      continue;
    }
    if (!seen.has(href)) {
      seen.add(href);
      out.push(href);
    }
    if (out.length >= 50) break;
  }
  return out;
}

function extractMetaGenerators(rawHead: string): string[] {
  const out: string[] = [];
  const re =
    /<meta\b[^>]*?\bname\s*=\s*["']generator["'][^>]*?\bcontent\s*=\s*["']([^"']{1,200})["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawHead)) !== null) {
    if (m[1]) out.push(m[1]);
    if (out.length >= 5) break;
  }
  return out;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    p.then(
      (v) => {
        clearTimeout(t);
        resolve(v);
      },
      (e) => {
        clearTimeout(t);
        reject(e);
      },
    );
  });
}

/**
 * Render a DetectedStack as a short bulleted block for inclusion in the LLM
 * user message. Returns an empty string when nothing was detected — the caller
 * can decide whether to omit the block entirely.
 */
export function formatDetectedStackForLLM(stack: DetectedStack): string {
  const lines: string[] = [];
  if (stack.hosting) lines.push(`- Hosting: ${stack.hosting}`);
  if (stack.framework) lines.push(`- Framework: ${stack.framework}`);
  if (stack.cms) lines.push(`- CMS: ${stack.cms}`);
  if (stack.cdn?.length) lines.push(`- CDN: ${stack.cdn.join(", ")}`);
  if (stack.payments?.length) lines.push(`- Payments: ${stack.payments.join(", ")}`);
  if (stack.auth?.length) lines.push(`- Auth: ${stack.auth.join(", ")}`);
  if (stack.analytics?.length) lines.push(`- Analytics: ${stack.analytics.join(", ")}`);
  if (stack.support?.length) lines.push(`- Support: ${stack.support.join(", ")}`);
  if (stack.email?.length) lines.push(`- Email: ${stack.email.join(", ")}`);
  if (stack.raw_signals.cname) lines.push(`- CNAME: ${stack.raw_signals.cname}`);
  return lines.join("\n");
}
