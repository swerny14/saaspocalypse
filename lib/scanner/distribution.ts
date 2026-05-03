import type { FetchResult } from "./fetch";
import type { ProjectedAttributes } from "@/lib/normalization/engine";

/**
 * Phase 1 of the wedge-frame pivot — distribution-axis signal collection.
 *
 * Single source of truth: the Serper.dev SERP payload for a brand-name
 * search. We extract seven sub-signals from one call:
 *
 *   1. SERP own-domain count — how many top-10 organic results belong to
 *      the product's own domain. Curved scoring because brand-disambiguated
 *      SERPs typically have only 4–6 organic slots and the rest go to
 *      Wikipedia / Crunchbase / news / disambiguators. (kept from prior
 *      revisions)
 *   2. Knowledge Graph presence — Google generates a `knowledgeGraph` panel
 *      only for entities it considers significant. Strongest single
 *      indicator we can derive that "this is a real brand."
 *   3. Wikipedia in top 10 — independent third-party validation of brand
 *      significance. Wikipedia is famously selective on notability.
 *   4. Top organic owned — Google's #1 result for your name is YOU and not
 *      a squatter / lookalike / competitor.
 *   5. Sitelinks present — Google trusts the domain enough to expand the
 *      top organic result with sub-page sitelinks.
 *   6. Total results — log-bucketed proxy for global mention volume.
 *   7. Has news / topStories — currently active in the news cycle.
 *
 * We deliberately KILLED these earlier signals after first-corpus calibration:
 *
 *   - Blog cadence — anti-correlated with brand strength in our corpus.
 *     Indie hackers blog more than incumbents to compensate for the
 *     distribution they don't have. Stripe / Slack / Mailchimp / Notion
 *     never tripped it; pictory.ai / linear.app / kiro.dev did. Noise.
 *   - Community channels in footer — measures "did the design team add
 *     social icons", not distribution. Notion / Figma / Vercel show zero
 *     channels because their footer choice; that doesn't make their
 *     distribution weak. Replaced (effectively) by Knowledge Graph
 *     presence, which is the brand-recognition signal we actually want.
 *   - Domain age — corrupted by vintage-domain purchases. Stripe (1995),
 *     Slack (1992), Loom (1997), Notion (1997) all bought their domains
 *     decades after the company was founded. The signal measures "had
 *     cash to buy a 4-letter domain", not brand longevity.
 *
 * `pricing_gate` (demo vs public) is still derived from the projection
 * locally and persisted on `report_attributes` for diagnostics, but is
 * NOT scored — its scoring direction is genuinely contested (Stripe has
 * public pricing AND massive distribution).
 *
 * Failure posture: if SERP fails entirely (missing API key, network
 * error), `collectExternalDistributionSignals` returns null and the
 * distribution axis is uncomputable. There's no graceful-degradation
 * fallback — every scored sub-signal comes from this single call.
 *
 * Cost: ~$0.001 per scan (one Serper call). Latency: ~1s, runs in
 * parallel with the LLM call so it doesn't extend the critical path.
 */

const SERP_TIMEOUT_MS = 5_000;

export type ExternalDistributionSignals = {
  /** Count of own-domain results in the top 10. */
  serp_own_domain_count: number;
  /** Total organic-results count returned by Serper. Established brands
   *  consistently get 7 (Google compresses for entity-confident queries);
   *  weak / noise queries get the full 10. The scored signal is
   *  `organic_count < 10`. */
  organic_count: number;
  /** Google emitted a `knowledgeGraph` panel for this brand search. */
  knowledge_graph_present: boolean;
  /** A wikipedia.org link appears in the top 10 organic results.
   *  Diagnostic only — folded into authoritative_third_party_count. */
  has_wikipedia: boolean;
  /** Distinct authoritative third-party domains appearing in top 10.
   *  See AUTHORITATIVE_DOMAINS for the curated list. The scorer gates
   *  this count by top_organic_owned to suppress false positives where
   *  a weak brand's name matches a popular industry term. */
  authoritative_third_party_count: number;
  /** organic[0].link is on the report's domain. */
  top_organic_owned: boolean;
  /** organic[0].sitelinks is non-empty. Strong Google trust signal —
   *  fires for nearly every established brand even when KG doesn't. */
  has_sitelinks: boolean;
  /** peopleAlsoAsk is non-empty. DIAGNOSTIC ONLY — debug data showed PAA
   *  fires for any brand-name keyword that happens to overlap with a
   *  popular industry term, regardless of actual brand recognition.
   *  Saaspocalypse-dev triggers 4 PAA items (about the SaaS industry
   *  trend) while ChatGPT triggers zero. Not a brand signal. */
  paa_present: boolean;
  /** relatedSearches is non-empty. DIAGNOSTIC ONLY — Serper returns 8
   *  related searches for every query observed, regardless of brand. */
  related_searches_present: boolean;
  /** Google's `searchInformation.totalResults`. DIAGNOSTIC ONLY — Serper
   *  doesn't return searchInformation for the queries we tested, so this
   *  is null in practice. Google removed result counts from many SERPs. */
  total_results: number | null;
  /** topStories is non-empty. DIAGNOSTIC ONLY — Serper doesn't return
   *  topStories for any of the brand queries we tested. Always false. */
  has_news: boolean;
};

export type DistributionSignals = {
  /** All-or-nothing — when SERP failed, every field below is null. The
   *  scorer treats null external signals as "axis uncomputable" and
   *  returns null for the distribution axis. */
  serp_own_domain_count: number | null;
  organic_count: number | null;
  knowledge_graph_present: boolean | null;
  has_wikipedia: boolean | null;
  authoritative_third_party_count: number | null;
  top_organic_owned: boolean | null;
  has_sitelinks: boolean | null;
  paa_present: boolean | null;
  related_searches_present: boolean | null;
  total_results: number | null;
  has_news: boolean | null;
  /** Always set (derived locally from the projection's monthly_floor_usd).
   *  Diagnostic only — not scored. */
  pricing_gate: "demo" | "public";
};

/* ───────────────────────── SERP fetch + extraction ───────────────────── */

type SerperOrganicResult = {
  link?: string;
  title?: string;
  snippet?: string;
  date?: string;
  sitelinks?: Array<{ title?: string; link?: string }>;
};

type SerperResponse = {
  organic?: SerperOrganicResult[];
  knowledgeGraph?: Record<string, unknown>;
  topStories?: Array<{ link?: string; title?: string; date?: string; source?: string }>;
  peopleAlsoAsk?: Array<{ question?: string; link?: string; snippet?: string }>;
  relatedSearches?: Array<{ query?: string }>;
  searchInformation?: {
    totalResults?: string;
  };
  answerBox?: { link?: string };
};

/**
 * Brand-ecosystem authoritative-domain list.
 *
 * Suffix-matched (subdomains count). Three blended categories:
 *   1. Authority directories
 *   2. Tech / business press
 *   3. Brand ecosystem (app stores, YouTube, X, Reddit, GitHub)
 *
 * The scorer GATES the count on `top_organic_owned` to suppress false
 * positives where a weak brand's name overlaps a popular industry term.
 */
export const DEFAULT_AUTHORITATIVE_DOMAINS: ReadonlyArray<string> = [
  // Authority directories
  "wikipedia.org",
  "linkedin.com",
  "crunchbase.com",
  "g2.com",
  "capterra.com",
  "trustpilot.com",
  "pitchbook.com",
  "glassdoor.com",
  "builtin.com",
  "producthunt.com",
  "ycombinator.com",
  // Tech / business press
  "bloomberg.com",
  "reuters.com",
  "wsj.com",
  "ft.com",
  "nytimes.com",
  "cnbc.com",
  "fortune.com",
  "businessinsider.com",
  "forbes.com",
  "techcrunch.com",
  "theinformation.com",
  "venturebeat.com",
  "axios.com",
  "theverge.com",
  "wired.com",
  "arstechnica.com",
  "engadget.com",
  "fastcompany.com",
  "zdnet.com",
  "pcmag.com",
  "bbc.com",
  // Brand ecosystem
  "apps.apple.com",
  "play.google.com",
  "youtube.com",
  "x.com",
  "twitter.com",
  "reddit.com",
  "github.com",
];

/**
 * Single Serper call — returns null if the call failed for any reason
 * (missing API key, timeout, non-200, parse failure). On success, extracts
 * all seven scored sub-signals from the same payload.
 *
 * SERP query uses the brand root from the domain (`notion.so` → `notion`).
 * For dictionary-word brands ("stripe", "linear", "notion") this triggers
 * Google's brand disambiguation, which is what we want — Knowledge Graph
 * + Wikipedia + sitelinks all light up when Google identifies the brand
 * as the primary entity for the query.
 */
export async function collectExternalDistributionSignals(
  domain: string,
  signal?: AbortSignal,
  authoritativeDomains: ReadonlyArray<string> = DEFAULT_AUTHORITATIVE_DOMAINS,
): Promise<ExternalDistributionSignals | null> {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) return null;

  const query = domain.split(".")[0] || domain;

  const ctrl = new AbortController();
  const timeoutId = setTimeout(() => ctrl.abort(), SERP_TIMEOUT_MS);
  signal?.addEventListener("abort", () => ctrl.abort(), { once: true });

  let res: Response;
  try {
    res = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ q: query, num: 10 }),
      signal: ctrl.signal,
    });
  } catch {
    clearTimeout(timeoutId);
    return null;
  }
  clearTimeout(timeoutId);
  if (!res.ok) return null;

  let data: SerperResponse;
  try {
    data = (await res.json()) as SerperResponse;
  } catch {
    return null;
  }

  return extractSignals(data, domain, authoritativeDomains);
}

function extractSignals(
  data: SerperResponse,
  domain: string,
  authoritativeDomains: ReadonlyArray<string>,
): ExternalDistributionSignals {
  const organic = Array.isArray(data.organic) ? data.organic.slice(0, 10) : [];

  let ownCount = 0;
  let topOwned = false;
  let hasSitelinks = false;
  let hasWikipedia = false;
  const authoritativeHits = new Set<string>();

  organic.forEach((r, i) => {
    if (typeof r.link !== "string") return;
    let host: string;
    try {
      host = new URL(r.link).hostname.toLowerCase();
    } catch {
      return;
    }
    const isOwn = host === domain || host.endsWith(`.${domain}`);
    if (isOwn) {
      ownCount += 1;
      if (i === 0) topOwned = true;
      if (i === 0 && Array.isArray(r.sitelinks) && r.sitelinks.length > 0) {
        hasSitelinks = true;
      }
      return;
    }
    // Strip a leading www. for matching authoritative suffixes.
    const normalized = host.replace(/^www\./, "");
    if (normalized === "wikipedia.org" || normalized.endsWith(".wikipedia.org")) {
      hasWikipedia = true;
    }
    for (const auth of authoritativeDomains) {
      if (normalized === auth || normalized.endsWith(`.${auth}`)) {
        authoritativeHits.add(auth);
        break;
      }
    }
  });

  return {
    serp_own_domain_count: ownCount,
    organic_count: organic.length,
    knowledge_graph_present: isNonEmptyObject(data.knowledgeGraph),
    has_wikipedia: hasWikipedia,
    authoritative_third_party_count: authoritativeHits.size,
    top_organic_owned: topOwned,
    has_sitelinks: hasSitelinks,
    paa_present: Array.isArray(data.peopleAlsoAsk) && data.peopleAlsoAsk.length > 0,
    related_searches_present:
      Array.isArray(data.relatedSearches) && data.relatedSearches.length > 0,
    total_results: parseTotalResults(data.searchInformation?.totalResults),
    has_news: Array.isArray(data.topStories) && data.topStories.length > 0,
  };
}

function isNonEmptyObject(v: unknown): boolean {
  return !!v && typeof v === "object" && !Array.isArray(v) && Object.keys(v).length > 0;
}

function parseTotalResults(raw: string | undefined): number | null {
  if (!raw) return null;
  // Strip everything except digits — Google formats with commas.
  const cleaned = raw.replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  const n = Number.parseInt(cleaned, 10);
  return Number.isFinite(n) ? n : null;
}

/* ───────────────────── Final assembly (post-projection) ──────────────── */

/**
 * Combine externally-collected signals with locally-derivable diagnostics.
 * `_fetched` is unused now (community detection was killed) but kept in
 * the signature so callers don't need to change. The projection's
 * `monthly_floor_usd` is the only locally-derived signal still tracked.
 *
 * When `external` is null (SERP call failed), the entire SERP-derived
 * signal set is null and the scorer returns null for the distribution
 * axis. pricing_gate still gets set so it's persisted as a diagnostic.
 */
export function combineDistributionSignals(
  external: ExternalDistributionSignals | null,
  _fetched: FetchResult,
  attributes: ProjectedAttributes,
): DistributionSignals {
  const pricing_gate: "demo" | "public" =
    attributes.monthly_floor_usd === null ? "demo" : "public";
  if (!external) {
    return {
      serp_own_domain_count: null,
      organic_count: null,
      knowledge_graph_present: null,
      has_wikipedia: null,
      authoritative_third_party_count: null,
      top_organic_owned: null,
      has_sitelinks: null,
      paa_present: null,
      related_searches_present: null,
      total_results: null,
      has_news: null,
      pricing_gate,
    };
  }
  return {
    serp_own_domain_count: external.serp_own_domain_count,
    organic_count: external.organic_count,
    knowledge_graph_present: external.knowledge_graph_present,
    has_wikipedia: external.has_wikipedia,
    authoritative_third_party_count: external.authoritative_third_party_count,
    top_organic_owned: external.top_organic_owned,
    has_sitelinks: external.has_sitelinks,
    paa_present: external.paa_present,
    related_searches_present: external.related_searches_present,
    total_results: external.total_results,
    has_news: external.has_news,
    pricing_gate,
  };
}
