import {
  getActiveScoringPatterns,
  getAllScoringWeights,
  type ScoringPatternRow,
} from "@/lib/db/scoring_config";
import {
  DEFAULT_SCORING_CONFIG,
  DEFAULT_WEIGHTS,
  type PatternEntry,
  type ScoringConfig,
  type WeightMap,
} from "./scoring_defaults";

/**
 * Cached in-process snapshot of the scoring config. The first call
 * triggers a DB load; subsequent calls within CACHE_TTL_MS return the
 * cached snapshot. On DB failure, falls back to DEFAULT_SCORING_CONFIG.
 *
 * Pass `force = true` from admin recompute paths so calibration edits
 * affect the next recompute without waiting for cache expiry.
 */

const CACHE_TTL_MS = 5 * 60 * 1000;

let cached: ScoringConfig | null = null;
let cachedAt = 0;

export async function getCachedScoringConfig(force = false): Promise<ScoringConfig> {
  const now = Date.now();
  if (!force && cached && now - cachedAt < CACHE_TTL_MS) return cached;
  try {
    cached = await loadScoringConfigFromDb();
    cachedAt = now;
    return cached;
  } catch (e) {
    console.error("[scoring] DB config load failed, using defaults:", e);
    cached = DEFAULT_SCORING_CONFIG;
    cachedAt = now;
    return cached;
  }
}

/**
 * Force-clear the in-process cache. Used by admin write endpoints after
 * pattern / weight edits so the next request sees the new config.
 */
export function invalidateScoringConfigCache(): void {
  cached = null;
  cachedAt = 0;
}

/**
 * Read all active patterns + every weight row from the DB and assemble a
 * `ScoringConfig`. Patterns whose regex is invalid are silently skipped
 * (and logged); the same pattern would be unusable in scoring anyway.
 *
 * Missing weight keys fall back to DEFAULT_WEIGHTS so rolling out a new
 * knob in code doesn't require a schema dance — the seed script can fill
 * the row at deploy time.
 */
export async function loadScoringConfigFromDb(): Promise<ScoringConfig> {
  const [patternRows, weightRows] = await Promise.all([
    getActiveScoringPatterns(),
    getAllScoringWeights(),
  ]);

  const patterns = patternRowsToEntries(patternRows);
  const weights: WeightMap = { ...DEFAULT_WEIGHTS };
  for (const row of weightRows) {
    weights[row.key] = Number(row.value);
  }

  // If the DB is empty (pre-seed), fall back to defaults wholesale rather
  // than scoring with a half-empty config.
  if (patterns.length === 0) {
    return DEFAULT_SCORING_CONFIG;
  }

  return { patterns, weights };
}

function patternRowsToEntries(rows: ScoringPatternRow[]): PatternEntry[] {
  const out: PatternEntry[] = [];
  for (const row of rows) {
    const isRegex = row.kind !== "distribution_authoritative_domain";
    let regex: RegExp | null = null;
    if (isRegex) {
      try {
        regex = new RegExp(row.pattern, "i");
      } catch (e) {
        console.error(
          `[scoring] invalid regex in scoring_patterns row ${row.id} (${row.kind}: ${row.pattern}):`,
          e,
        );
        continue;
      }
    }
    out.push({
      id: row.id,
      axis: row.axis,
      kind: row.kind,
      pattern: row.pattern,
      weight: Number(row.weight),
      status: row.status,
      evidence: row.evidence,
      regex,
    });
  }
  return out;
}
