import type { LLMVerdict, EstCostLine } from "@/lib/scanner/schema";
import type { DetectedStack } from "@/lib/scanner/fingerprint";
import {
  STACK_COMPONENTS,
  FINGERPRINT_NAME_OVERRIDES,
  CAPABILITIES,
  MARKET_SEGMENTS,
  BUSINESS_MODELS,
  type StackComponent,
  type Capability,
  type MarketSegment,
  type BusinessModel,
} from "./taxonomy";

/**
 * Bump when the engine's output schema changes (new fields, new logic that
 * would yield different rows for the same input). The recompute script reads
 * `report_attributes.projection_version` to find rows that need to be redone.
 */
export const PROJECTION_VERSION = 1;

export type ComponentSource = "fingerprint" | "text_match" | "both";

export type ProjectedComponent = {
  component_slug: string;
  source: ComponentSource;
};

export type ProjectedCapability = {
  capability_slug: string;
  confidence: number;
  evidence_field: string;
};

export type ProjectedAttributes = {
  segment_slug: string | null;
  business_model_slug: string | null;
  monthly_floor_usd: number | null;
  is_usage_based: boolean;
  capital_intensity_bucket: "low" | "mid" | "high" | null;
  projection_version: number;
};

export type ProjectedUnknown = {
  raw_term: string;
  normalized_term: string;
  suggested_category: "stack_component" | "capability" | "unknown";
};

export type ReportProjection = {
  components: ProjectedComponent[];
  capabilities: ProjectedCapability[];
  attributes: ProjectedAttributes;
  unknowns: ProjectedUnknown[];
};

/* ───────────────────────── engine context ──────────────────────────────── */

/**
 * Pre-built indexes + raw taxonomy bundled into one object that gets threaded
 * through the helper functions. Built once from TS imports at module load
 * (DEFAULT_ENGINE_CONTEXT) so production scans pay no per-call setup cost.
 * Admin tooling can build a fresh context from DB rows so live taxonomy edits
 * affect scoring immediately without a redeploy — see
 * lib/db/taxonomy_loader.ts::loadEngineContextFromDb.
 */
export type EngineContext = {
  stackComponents: StackComponent[];
  capabilities: Capability[];
  marketSegments: MarketSegment[];
  businessModels: BusinessModel[];
  fingerprintOverrides: Record<string, string>;
  /** display_name → slug, lowercased. */
  stackByDisplay: Map<string, string>;
  /** Longest-alias-first array of (alias, slug). */
  stackAliasIndex: Array<{ alias: string; slug: string }>;
  /** Longest-pattern-first array of (pattern, slug). */
  capabilityPatternIndex: Array<{ pattern: string; slug: string }>;
};

export type EngineTaxonomy = {
  stack_components: StackComponent[];
  capabilities: Capability[];
  market_segments: MarketSegment[];
  business_models: BusinessModel[];
  fingerprint_overrides: Record<string, string>;
};

export function buildEngineContext(taxonomy: EngineTaxonomy): EngineContext {
  const stackByDisplay = new Map<string, string>();
  for (const c of taxonomy.stack_components) {
    stackByDisplay.set(c.display_name.toLowerCase(), c.slug);
  }

  const stackAliasIndex: Array<{ alias: string; slug: string }> = [];
  for (const c of taxonomy.stack_components) {
    for (const a of c.aliases) stackAliasIndex.push({ alias: a.toLowerCase(), slug: c.slug });
  }
  // Longer aliases first so "google analytics 4" wins over "google analytics".
  stackAliasIndex.sort((a, b) => b.alias.length - a.alias.length);

  const capabilityPatternIndex: Array<{ pattern: string; slug: string }> = [];
  for (const c of taxonomy.capabilities) {
    for (const p of c.match_patterns) {
      capabilityPatternIndex.push({ pattern: p.toLowerCase(), slug: c.slug });
    }
  }
  capabilityPatternIndex.sort((a, b) => b.pattern.length - a.pattern.length);

  return {
    stackComponents: taxonomy.stack_components,
    capabilities: taxonomy.capabilities,
    marketSegments: taxonomy.market_segments,
    businessModels: taxonomy.business_models,
    fingerprintOverrides: taxonomy.fingerprint_overrides,
    stackByDisplay,
    stackAliasIndex,
    capabilityPatternIndex,
  };
}

/** Module-load default — what production scans use. */
export const DEFAULT_ENGINE_CONTEXT: EngineContext = buildEngineContext({
  stack_components: STACK_COMPONENTS,
  capabilities: CAPABILITIES,
  market_segments: MARKET_SEGMENTS,
  business_models: BUSINESS_MODELS,
  fingerprint_overrides: FINGERPRINT_NAME_OVERRIDES,
});

/* ───────────────────────── helpers ──────────────────────────────────────── */

/**
 * Resolve a fingerprinter-emitted name (e.g. "Vercel", "GA4") to a canonical
 * slug. Returns null when the name doesn't map — we'd rather miss a component
 * than mis-attribute one. Override map wins over display-name match.
 */
function fingerprintToSlug(name: string, ctx: EngineContext): string | null {
  const override = ctx.fingerprintOverrides[name];
  if (override) return override;
  return ctx.stackByDisplay.get(name.toLowerCase()) ?? null;
}

/**
 * Whole-word, case-insensitive presence test. Avoids "ai" matching "main",
 * "stripe" matching "stripes", etc. Anchors are `[^a-z0-9]` rather than `\b`
 * because `\b` treats periods/dashes as word boundaries which is wrong for
 * "next.js" / "fly.io".
 */
function containsPhrase(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const idx = haystack.indexOf(needle);
  if (idx === -1) return false;
  const before = idx === 0 ? "" : haystack[idx - 1];
  const after = haystack[idx + needle.length] ?? "";
  const isBoundary = (ch: string): boolean => ch === "" || /[^a-z0-9]/.test(ch);
  return isBoundary(before) && isBoundary(after);
}

function joinReportText(verdict: LLMVerdict): {
  full: string;
  byField: Record<string, string>;
} {
  const byField: Record<string, string> = {
    name: verdict.name,
    tagline: verdict.tagline,
    take: verdict.take,
    take_sub: verdict.take_sub,
    challenges: verdict.challenges.map((c) => `${c.name}. ${c.note}`).join(". "),
    est_cost: verdict.est_cost.map((l) => l.line).join(". "),
  };
  const full = Object.values(byField).join(" \n ").toLowerCase();
  return { full, byField: lowerAll(byField) };
}

function lowerAll(o: Record<string, string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(o)) out[k] = v.toLowerCase();
  return out;
}

/**
 * Project the canonical stack components onto a report. Two-source merge:
 * fingerprint always wins on conflict, text matches add coverage. Returns
 * deduped rows with the right `source` flag.
 */
function projectComponents(
  verdict: LLMVerdict,
  detectedStack: DetectedStack | null,
  fullText: string,
  ctx: EngineContext,
): ProjectedComponent[] {
  const fromFingerprint = new Set<string>();
  if (detectedStack) {
    const fpStrings: Array<string | undefined> = [
      detectedStack.hosting,
      detectedStack.framework,
      detectedStack.cms,
      ...(detectedStack.cdn ?? []),
      ...(detectedStack.payments ?? []),
      ...(detectedStack.auth ?? []),
      ...(detectedStack.analytics ?? []),
      ...(detectedStack.support ?? []),
      ...(detectedStack.email ?? []),
    ];
    for (const name of fpStrings) {
      if (!name) continue;
      const slug = fingerprintToSlug(name, ctx);
      if (slug) fromFingerprint.add(slug);
    }
  }

  const fromText = new Set<string>();
  // Search the full report text plus the LLM-authored `stack` array. The
  // stack array is shorter and noisier, but high-signal — it's literally a
  // list of named components.
  const stackText = verdict.stack.join(" ").toLowerCase();
  const haystacks = [fullText, stackText];
  for (const { alias, slug } of ctx.stackAliasIndex) {
    if (fromText.has(slug)) continue;
    if (haystacks.some((h) => containsPhrase(h, alias))) fromText.add(slug);
  }

  const all = new Set<string>([...fromFingerprint, ...fromText]);
  const out: ProjectedComponent[] = [];
  for (const slug of all) {
    const inFp = fromFingerprint.has(slug);
    const inText = fromText.has(slug);
    const source: ComponentSource = inFp && inText ? "both" : inFp ? "fingerprint" : "text_match";
    out.push({ component_slug: slug, source });
  }
  return out;
}

/**
 * Project capabilities. Scan each text field independently so we can record
 * which field the evidence came from — useful for the unknowns review queue
 * and for future "explainable" report views.
 */
function projectCapabilities(
  byField: Record<string, string>,
  ctx: EngineContext,
): ProjectedCapability[] {
  const best: Record<string, ProjectedCapability> = {};
  for (const { pattern, slug } of ctx.capabilityPatternIndex) {
    if (best[slug]) continue;
    let evidenceField: string | null = null;
    for (const [field, text] of Object.entries(byField)) {
      if (containsPhrase(text, pattern)) {
        evidenceField = evidenceField ? "multiple" : field;
      }
    }
    if (evidenceField) {
      best[slug] = {
        capability_slug: slug,
        confidence: 1.0,
        evidence_field: evidenceField,
      };
    }
  }
  return Object.values(best);
}

/**
 * Score a free-text taxonomy (segments, models) by how many of its patterns
 * appear in the haystack. Highest score wins. Tie or zero hits → null.
 */
function bestMatch(
  haystack: string,
  table: Array<{ slug: string; match_patterns: string[] }>,
): string | null {
  let bestSlug: string | null = null;
  let bestScore = 0;
  let tied = false;
  for (const row of table) {
    let score = 0;
    for (const p of row.match_patterns) {
      if (containsPhrase(haystack, p.toLowerCase())) score += 1;
    }
    if (score > bestScore) {
      bestSlug = row.slug;
      bestScore = score;
      tied = false;
    } else if (score === bestScore && score > 0) {
      tied = true;
    }
  }
  if (bestScore === 0 || tied) return null;
  return bestSlug;
}

/**
 * Parse a single est_cost row's `cost` field into a USD number. Returns null
 * for `???` / non-numeric strings (the caller treats those as usage-based).
 */
function costToNumber(cost: EstCostLine["cost"]): number | null {
  if (typeof cost === "number") return cost >= 0 ? cost : null;
  const s = cost.trim().toLowerCase();
  if (!s || s === "???" || s.includes("usage") || s.includes("variable")) return null;
  // Strip $ , and trailing /mo etc., then try parsing.
  const cleaned = s.replace(/[$,]/g, "").replace(/\/(mo|month|yr|year).*$/, "").trim();
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function projectAttributes(
  verdict: LLMVerdict,
  capabilitySlugs: Set<string>,
  fullText: string,
  byField: Record<string, string>,
  ctx: EngineContext,
): ProjectedAttributes {
  const segment_slug = bestMatch(fullText, ctx.marketSegments);

  // Business model: prefer matches against the structured `current_cost` row
  // (cleaner signal — it literally describes the pricing) plus the est_cost
  // lines, then fall back to the full body. Note marketplace capability
  // strongly biases the model.
  const pricingText = [
    `${verdict.current_cost.label} ${verdict.current_cost.unit}`,
    typeof verdict.current_cost.price === "string" ? verdict.current_cost.price : "",
    typeof verdict.current_cost.annual === "string" ? verdict.current_cost.annual : "",
    byField.est_cost,
  ]
    .join(" ")
    .toLowerCase();
  let business_model_slug = bestMatch(pricingText, ctx.businessModels);
  if (!business_model_slug) business_model_slug = bestMatch(fullText, ctx.businessModels);
  if (capabilitySlugs.has("marketplace")) business_model_slug = "marketplace";

  // Cost parsing: sum every numeric line. If at least one line is non-numeric,
  // flag as usage-based. monthly_floor_usd is null only when EVERY line is
  // non-numeric (pure usage-based).
  let fixedSum = 0;
  let hadNumeric = false;
  let hadUsage = false;
  for (const line of verdict.est_cost) {
    const n = costToNumber(line.cost);
    if (n === null) hadUsage = true;
    else {
      fixedSum += n;
      hadNumeric = true;
    }
  }
  const monthly_floor_usd = hadNumeric ? Math.round(fixedSum * 100) / 100 : null;
  const is_usage_based = hadUsage;

  let capital_intensity_bucket: "low" | "mid" | "high" | null = null;
  if (monthly_floor_usd !== null) {
    if (monthly_floor_usd < 50) capital_intensity_bucket = "low";
    else if (monthly_floor_usd < 500) capital_intensity_bucket = "mid";
    else capital_intensity_bucket = "high";
  }

  return {
    segment_slug,
    business_model_slug,
    monthly_floor_usd,
    is_usage_based,
    capital_intensity_bucket,
    projection_version: PROJECTION_VERSION,
  };
}

/**
 * Atomize an LLM stack item into one or more candidate terms. The LLM often
 * packs multiple tools into a single array entry — `"Reddit API + X API v2
 * (reply polling)"` is two tools plus a use note, `"Kafka/Redpanda"` is two
 * alternative tools the LLM is hedging between, `"Postgres & Redis"` is two
 * stores, `"Kafka or Redpanda"` likewise. We strip parentheticals, split on
 * `+` / `,` / `/` / `&` or whitespace-bounded `or`, and emit each part as
 * its own candidate. `/` is safe here because the LLM doesn't emit URLs or
 * paths in `verdict.stack` — only product names. The `or` match requires
 * surrounding whitespace so it doesn't slice "ProseMirror" or "Mongor".
 * If splitting yields a single result we return the original entry verbatim
 * so descriptive parens are preserved for the review-queue UI ("Vercel Pro
 * (edge + analytics)" stays one row).
 */
function atomizeStackItem(raw: string): Array<{ raw: string; norm: string }> {
  const term = raw.trim();
  if (!term) return [];
  const stripped = term.replace(/\([^)]*\)/g, "").trim();
  const parts = stripped
    .split(/\s*[+,/&]\s*|\s+or\s+/i)
    .map((s) => s.trim())
    .filter(Boolean);
  if (parts.length > 1) {
    return parts.map((p) => ({ raw: p, norm: p.toLowerCase() }));
  }
  return [{ raw: term, norm: term.toLowerCase() }];
}

function harvestUnknowns(
  verdict: LLMVerdict,
  matchedComponents: Set<string>,
  ctx: EngineContext,
): ProjectedUnknown[] {
  const aliasSet = new Set(ctx.stackAliasIndex.map((e) => e.alias));

  // Aliases of already-matched components, longest-first. Used to suppress
  // LLM stack items whose canonical is already attached but whose surrounding
  // text isn't (e.g. "Vercel Pro (edge + analytics)" → suppressed because
  // "vercel" matched from elsewhere). Without this, every parenthetical
  // descriptor on a known component becomes a noise unknown.
  const explainedAliases: string[] = [];
  for (const c of ctx.stackComponents) {
    if (!matchedComponents.has(c.slug)) continue;
    for (const a of c.aliases) explainedAliases.push(a.toLowerCase());
  }
  explainedAliases.sort((a, b) => b.length - a.length);

  const seen = new Set<string>();
  const out: ProjectedUnknown[] = [];

  for (const stackItem of verdict.stack) {
    for (const { raw, norm } of atomizeStackItem(stackItem)) {
      if (seen.has(norm)) continue;
      seen.add(norm);

      // Skip if the alias index already knows this exact term.
      if (aliasSet.has(norm)) continue;
      // Skip if a component with this display name is already matched.
      const slugFromName = ctx.stackByDisplay.get(norm);
      if (slugFromName && matchedComponents.has(slugFromName)) continue;
      // Skip if any alias of an already-matched component appears whole-word.
      let explained = false;
      for (const alias of explainedAliases) {
        if (containsPhrase(norm, alias)) {
          explained = true;
          break;
        }
      }
      if (explained) continue;

      out.push({
        raw_term: raw,
        normalized_term: norm,
        suggested_category: "stack_component",
      });
    }
  }

  return out;
}

/**
 * The whole projection — pure function. No I/O, no LLM, no async work.
 *
 * Pass an `EngineContext` to score against a non-default taxonomy (e.g. the
 * admin path that loads taxonomy from the DB so live edits affect scoring
 * before the next redeploy). Default uses the TS-bundled taxonomy.
 *
 * The output shape is intentionally easy to persist: callers map each array
 * to a junction table and the `attributes` object to a single row. See
 * lib/db/projections.ts::persistProjection for the canonical writer.
 */
export function projectReport(
  verdict: LLMVerdict,
  detectedStack: DetectedStack | null,
  ctx: EngineContext = DEFAULT_ENGINE_CONTEXT,
): ReportProjection {
  const { full, byField } = joinReportText(verdict);

  const components = projectComponents(verdict, detectedStack, full, ctx);
  const matchedComponentSlugs = new Set(components.map((c) => c.component_slug));

  const capabilities = projectCapabilities(byField, ctx);
  const capabilitySlugs = new Set(capabilities.map((c) => c.capability_slug));

  const attributes = projectAttributes(verdict, capabilitySlugs, full, byField, ctx);
  const unknowns = harvestUnknowns(verdict, matchedComponentSlugs, ctx);

  return { components, capabilities, attributes, unknowns };
}
