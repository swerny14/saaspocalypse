import type { StoredReport } from "@/lib/db/reports";
import type { SimilarityCandidate } from "./similarity";
import { similarityScore, buildCorpusWeights } from "./similarity";

/**
 * Detect pairs of reports that the text heuristic thinks SHOULD be similar
 * but the deterministic engine doesn't surface — usually because the
 * taxonomy is missing a descriptor capability that would catch them.
 *
 * Pure function. No LLM, no DB. Caller persists the results.
 *
 * Algorithm:
 *   1. For each report, build a token set from name + tagline only
 *      (lowercased, stopwords removed, ≥3 chars). The take / take_sub are
 *      INTENTIONALLY EXCLUDED — they carry buildability-judgment prose
 *      ("you'd spend a month wiring auth", "the actual moat is crawl
 *      infrastructure") which is high-entropy per product and drowns the
 *      shared category vocabulary in non-overlapping words. Tagline carries
 *      the densest category signal; name disambiguates.
 *   2. For each unordered pair (canonical: report_a.id < report_b.id), compute
 *      text-Jaccard over the token sets AND the deterministic engine score.
 *   3. A gap = high text-Jaccard but low engine score.
 *
 * Tunables:
 *   - MIN_TEXT_SIMILARITY: pairs below this threshold aren't even candidates
 *     for being "should-be-similar" — too little textual overlap.
 *   - MAX_ENGINE_SCORE: pairs above this threshold are already converging in
 *     the engine, so no gap.
 *   - MIN_TEXT_ENGINE_GAP: alternative trigger — flag pairs where text
 *     overlap is meaningfully higher than engine score, even if the engine
 *     score is moderate. Catches the ahrefs/semrush case where both share
 *     generic-infra capabilities but no descriptor names their category;
 *     engine scores in the 0.15–0.30 range when they should be 0.5+.
 *
 * A pair is flagged when MIN_TEXT_SIMILARITY clears AND EITHER the engine
 * score is below MAX_ENGINE_SCORE OR the text-vs-engine gap exceeds
 * MIN_TEXT_ENGINE_GAP. The two rules together catch both "no overlap at
 * all" cases and "moderate overlap but should be much higher" cases.
 *
 * Defaults err toward surfacing more candidates — the LLM suggestion step
 * filters out true non-actions ("coincidental text overlap, no descriptor
 * fits"), so a moderately noisy queue is preferable to a curator missing
 * real gaps.
 */

export type SimilarityGapCandidate = {
  report_a_id: string;
  report_b_id: string;
  report_a_slug: string;
  report_b_slug: string;
  text_similarity: number;
  engine_score: number;
  shared_capability_slugs: string[];
};

export const MIN_TEXT_SIMILARITY = 0.2;
export const MAX_ENGINE_SCORE = 0.1;
export const MIN_TEXT_ENGINE_GAP = 0.1;

const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "has",
  "have", "in", "is", "it", "its", "not", "of", "on", "or", "that", "the", "this",
  "to", "was", "were", "will", "with", "what", "you", "your", "yours", "we", "our",
  "they", "them", "their", "his", "hers", "him", "her", "do", "does", "did", "done",
  "if", "than", "then", "there", "here", "when", "where", "which", "who", "whom",
  "how", "why", "all", "any", "some", "no", "yes", "can", "could", "should", "would",
  "may", "might", "must", "into", "out", "up", "down", "over", "under", "again",
  "very", "just", "even", "also", "more", "most", "less", "least", "much", "such",
  "make", "made", "makes", "thing", "things", "one", "two", "way", "like", "get",
  "got", "go", "going", "gone", "come", "came", "see", "seen", "say", "said",
  "use", "used", "using", "uses", "really", "actually", "still", "yet", "already",
  "weekend", "month", "decade", "year", "years", "build", "built", "building",
  "builder", "saas", "tool", "tools", "platform", "product", "products", "ui",
  "thing", "code", "page", "site", "app", "user", "users", "people", "team",
  "teams", "company", "real", "right", "without", "between", "first", "last",
]);

function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();
  // Split on non-alphanumerics, keep words ≥3 chars and not stopwords.
  for (const raw of text.toLowerCase().split(/[^a-z0-9]+/)) {
    if (raw.length < 3) continue;
    if (STOPWORDS.has(raw)) continue;
    tokens.add(raw);
  }
  return tokens;
}

function textSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  const union = a.size + b.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * Heuristic gap detection over the corpus.
 *
 * @param reports Full StoredReport rows (need name/tagline/take/take_sub).
 * @param candidates Map<report_id, SimilarityCandidate> from
 *   `getAllSimilarityCandidates()` — keyed identically to reports.
 * @returns Sorted list of gap candidates (text-similarity desc).
 */
export function detectSimilarityGaps(
  reports: StoredReport[],
  candidates: Map<string, SimilarityCandidate>,
  options: { debug?: boolean } = {},
): SimilarityGapCandidate[] {
  // Build token sets once per report. Name + tagline only — see header
  // comment for why take/take_sub are excluded.
  const tokensById = new Map<string, Set<string>>();
  for (const r of reports) {
    const blob = `${r.name} ${r.tagline}`;
    tokensById.set(r.id, tokenize(blob));
  }

  // Engine weights are corpus-aware; build once over the full candidate set.
  const candidateList = Array.from(candidates.values());
  const weights = buildCorpusWeights(candidateList);

  // Sort reports for canonical pair ordering.
  const sorted = [...reports].sort((a, b) => a.id.localeCompare(b.id));

  const gaps: SimilarityGapCandidate[] = [];
  // Diagnostic accumulator — when options.debug, we record the top text-Jaccard
  // pairs across the corpus regardless of whether they cleared either rule, so
  // the operator can see where the noise floor sits and tune thresholds.
  const debugRows: Array<{
    pair: string;
    text: number;
    engine: number;
    gap: number;
    flag: "below_floor" | "wide_gap" | "below_floor+wide_gap" | "passes_engine";
    shared: string[];
  }> = [];

  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      const a = sorted[i];
      const b = sorted[j];
      const tokA = tokensById.get(a.id);
      const tokB = tokensById.get(b.id);
      if (!tokA || !tokB) continue;

      const textSim = textSimilarity(tokA, tokB);
      if (textSim < MIN_TEXT_SIMILARITY) continue;

      const candA = candidates.get(a.id);
      const candB = candidates.get(b.id);
      if (!candA || !candB) continue;

      const result = similarityScore(candA, candB, weights);
      const belowEngineFloor = result.score <= MAX_ENGINE_SCORE;
      const wideGap = textSim - result.score >= MIN_TEXT_ENGINE_GAP;

      if (options.debug) {
        const flag: typeof debugRows[number]["flag"] =
          belowEngineFloor && wideGap
            ? "below_floor+wide_gap"
            : belowEngineFloor
              ? "below_floor"
              : wideGap
                ? "wide_gap"
                : "passes_engine";
        debugRows.push({
          pair: `${a.slug} ↔ ${b.slug}`,
          text: Math.round(textSim * 1000) / 1000,
          engine: Math.round(result.score * 1000) / 1000,
          gap: Math.round((textSim - result.score) * 1000) / 1000,
          flag,
          shared: result.shared_capabilities,
        });
      }

      if (!belowEngineFloor && !wideGap) continue;

      gaps.push({
        report_a_id: a.id,
        report_b_id: b.id,
        report_a_slug: a.slug,
        report_b_slug: b.slug,
        text_similarity: Math.round(textSim * 1000) / 1000,
        engine_score: Math.round(result.score * 1000) / 1000,
        shared_capability_slugs: result.shared_capabilities,
      });
    }
  }

  if (options.debug) {
    debugRows.sort((x, y) => y.text - x.text);
    console.info(
      `[gaps] reports=${reports.length} candidates=${candidates.size} text>=${MIN_TEXT_SIMILARITY} pairs=${debugRows.length} flagged=${gaps.length} (engine<=${MAX_ENGINE_SCORE} OR text-engine>=${MIN_TEXT_ENGINE_GAP})`,
    );
    console.info(`[gaps] top20 by text_similarity:`, debugRows.slice(0, 20));
  }

  gaps.sort((x, y) => y.text_similarity - x.text_similarity);
  return gaps;
}
