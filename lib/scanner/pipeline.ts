import { normalizeUrl, InvalidDomainError } from "@/lib/domain";
import {
  getReportByDomain,
  incrementReportViewCount,
  insertReport,
  type StoredReport,
} from "@/lib/db/reports";
import {
  acquireDomainLock,
  releaseDomainLock,
  getScanRateLimiter,
} from "@/lib/ratelimit";
import { logError } from "@/lib/error_log";
import { fetchAndCleanHomepage, FetchError, type FetchResult } from "./fetch";
import { detectStack, formatDetectedStackForLLM, type DetectedStack } from "./fingerprint";
import { callClaudeForVerdict } from "./llm";
import {
  collectExternalDistributionSignals,
  combineDistributionSignals,
  type ExternalDistributionSignals,
} from "./distribution";
import type { ScanErrorReason, ScanEvent } from "./events";
import { STEP_LABELS } from "./events";
import { USER_SCAN_MESSAGES } from "./user_messages";
import { projectReport } from "@/lib/normalization/engine";
import { persistProjection, persistDistributionSignals } from "@/lib/db/projections";
import { weakestAxis, type MoatScore } from "@/lib/normalization/moat";
import {
  scoreMoatWithLLM,
  type MoatJudgment,
} from "@/lib/normalization/moat_llm";
import { persistMoatScore } from "@/lib/db/moat_scores";
import { loadEngineContextFromDb } from "@/lib/db/taxonomy_loader";
import {
  tierFromWedgeScore,
  wedgeScoreFromAggregate,
  type LLMVerdict,
  type VerdictReport,
} from "./schema";

export type ScanInput = { url: string; ip: string; signal?: AbortSignal };
export type ScanEmitter = (event: ScanEvent) => void | Promise<void>;

const LOCK_TTL_SECONDS = 60;
const LOCK_POLL_TOTAL_MS = 30_000;
const LOCK_POLL_INTERVAL_MS = 1_000;

/**
 * Emit a generic user-facing error + log the internal detail server-side.
 * User never sees stack traces / Zod issues / DB errors.
 */
async function emitScanError(
  emit: ScanEmitter,
  reason: ScanErrorReason,
  internalMessage: string,
  ctx: { url: string; domain?: string; ip?: string },
  detail?: Record<string, unknown>,
): Promise<void> {
  await logError({
    scope: "scan",
    reason,
    refSlug: ctx.domain ?? null,
    message: internalMessage,
    detail: { url: ctx.url, ip: ctx.ip, ...detail },
  });
  await emit({
    type: "error",
    reason,
    message: USER_SCAN_MESSAGES[reason],
  });
}

/**
 * Merge the LLM-emitted slice with server-computed wedge fields. Centralized
 * so insertReport always sees a fully-shaped VerdictReport regardless of
 * whether moat scoring succeeded — when moat is null, we land at SOFT/100
 * (the LLM survived but no walls were modeled, so default to "wide open"
 * over silently failing the scan).
 */
function buildVerdictReport(
  llmVerdict: LLMVerdict,
  moat: { aggregate: number } | null,
  weakest: VerdictReport["weakest_moat_axis"],
): VerdictReport {
  const wedge_score = moat ? wedgeScoreFromAggregate(moat.aggregate) : 100;
  const tier = tierFromWedgeScore(wedge_score);
  return {
    ...llmVerdict,
    wedge_score,
    tier,
    weakest_moat_axis: weakest,
  };
}

export async function runScan(
  input: ScanInput,
  emit: ScanEmitter,
): Promise<void> {
  // 1. Normalize.
  await emit({ type: "step", step: "normalize", label: STEP_LABELS.normalize });
  let domain: string;
  try {
    domain = normalizeUrl(input.url);
  } catch (e) {
    const detail = e instanceof InvalidDomainError ? e.reason : String(e);
    await emitScanError(emit, "invalid_url", detail, {
      url: input.url,
      ip: input.ip,
    });
    return;
  }

  // 2. Cache check.
  const cached = await getReportByDomain(domain);
  if (cached) {
    incrementReportViewCount(cached.slug).catch((e) =>
      logError({
        scope: "view",
        reason: "increment_failed",
        refSlug: cached.slug,
        message: e instanceof Error ? e.message : String(e),
        detail: { source: "scan_cache_hit" },
      }),
    );
    await emit({ type: "done", cached: true, slug: cached.slug, report: cached });
    return;
  }

  // 3. Rate limit the IP.
  const limiter = getScanRateLimiter();
  if (limiter) {
    const result = await limiter.limit(input.ip);
    if (!result.success) {
      await emitScanError(
        emit,
        "rate_limited",
        `IP ${input.ip} exceeded hourly scan limit`,
        { url: input.url, domain, ip: input.ip },
      );
      return;
    }
  }

  // 4. Acquire domain lock.
  const gotLock = await acquireDomainLock(domain, LOCK_TTL_SECONDS);
  if (!gotLock) {
    const waited = await waitForDbResult(domain);
    if (waited) {
      await emit({ type: "done", cached: false, slug: waited.slug, report: waited });
      return;
    }
    await emitScanError(
      emit,
      "internal",
      `Domain lock held by another scanner and DB never produced a result after ${LOCK_POLL_TOTAL_MS}ms`,
      { url: input.url, domain, ip: input.ip },
    );
    return;
  }

  try {
    // 5. Fetch + clean homepage HTML.
    await emit({ type: "step", step: "fetch", label: STEP_LABELS.fetch });
    let fetched: FetchResult;
    try {
      fetched = await fetchAndCleanHomepage(`https://${domain}`);
    } catch (e) {
      const reason: ScanErrorReason =
        e instanceof FetchError ? "fetch_failed" : "internal";
      await emitScanError(
        emit,
        reason,
        e instanceof Error ? e.message : String(e),
        { url: input.url, domain, ip: input.ip },
        { fetchErrorKind: e instanceof FetchError ? e.kind : undefined },
      );
      return;
    }
    if (!fetched.cleaned || fetched.cleaned.length < 100) {
      await emitScanError(
        emit,
        "empty_html",
        `Homepage produced only ${fetched.cleaned?.length ?? 0} chars of readable text`,
        { url: input.url, domain, ip: input.ip },
      );
      return;
    }

    // 6. Fingerprint stack from headers/cookies/HTML/CNAME. Soft-fail.
    await emit({ type: "step", step: "fingerprint", label: STEP_LABELS.fingerprint });
    let detectedStack: DetectedStack | null = null;
    try {
      detectedStack = await detectStack(fetched, domain);
    } catch (e) {
      await logError({
        scope: "scan",
        reason: "internal",
        refSlug: domain,
        message: `fingerprint detection failed: ${e instanceof Error ? e.message : String(e)}`,
        detail: { url: input.url, ip: input.ip },
      });
    }
    const detectedSignals = detectedStack ? formatDetectedStackForLLM(detectedStack) : "";

    const engineContext = await loadEngineContextFromDb();

    // Kick off the external distribution-signal SERP call. Network-bound
    // and independent of the LLM, so it runs in parallel and finalizes when
    // we hit the moat-scoring step. Returns null on SERP failure — the
    // distribution axis ends up uncomputable in that case but the rest of
    // the pipeline proceeds.
    const externalDistributionPromise: Promise<ExternalDistributionSignals | null> =
      collectExternalDistributionSignals(domain, input.signal);

    // 7. Call Claude (internally validates + retries). Returns LLMVerdict
    // — the wedge thesis + supporting analytical content. The displayed
    // wedge_score and tier are NOT here; they're derived server-side from
    // the moat aggregate after step 9.
    await emit({ type: "step", step: "analyze", label: STEP_LABELS.analyze });
    const llmOut = await callClaudeForVerdict({
      domain,
      html: fetched.cleaned,
      detectedSignals,
      signal: input.signal,
    });
    if (llmOut.kind === "error") {
      await emitScanError(emit, llmOut.reason, llmOut.message, {
        url: input.url,
        domain,
        ip: input.ip,
      });
      return;
    }

    // 8. Project + score moat (in-memory) BEFORE the DB insert. We need
    // the moat aggregate to derive wedge_score + tier + weakest_axis,
    // which are required NOT NULL columns on `reports`. Soft-fail policy:
    // if any of project / distribution / moat fail, we still insert with
    // a SOFT/100/null fallback rather than killing the user-visible
    // report — the recompute script will rebuild on next run.
    await emit({ type: "step", step: "verdict", label: STEP_LABELS.verdict });

    const projection = projectReport(
      llmOut.verdict,
      detectedStack,
      engineContext.context,
    );

    let externals: ExternalDistributionSignals | null = null;
    try {
      externals = await externalDistributionPromise;
    } catch (e) {
      await logError({
        scope: "scan",
        reason: "distribution_collect_failed",
        refSlug: domain,
        message: e instanceof Error ? e.message : String(e),
        detail: { url: input.url },
      });
    }
    const distribution = combineDistributionSignals(
      externals,
      fetched,
      projection.attributes,
    );

    let moat: MoatScore | null = null;
    let moatJudgment: MoatJudgment | null = null;
    try {
      const scored = await scoreMoatWithLLM({
        verdict: llmOut.verdict,
        distribution,
        detectedStack,
        signal: input.signal,
      });
      if (scored.kind === "error") {
        await emitScanError(emit, "internal", scored.message, {
          url: input.url,
          domain,
          ip: input.ip,
        });
        return;
      }
      moat = scored.score;
      moatJudgment = scored.judgment;
    } catch (e) {
      await emitScanError(emit, "internal", e instanceof Error ? e.message : String(e), {
        url: input.url,
        domain,
        ip: input.ip,
      });
      return;
    }

    const verdictReport = buildVerdictReport(
      llmOut.verdict,
      moat ? { aggregate: moat.aggregate } : null,
      moat ? weakestAxis(moat) : null,
    );

    // 9. Insert with the fully-shaped verdict (LLM fields + server-
    // computed wedge fields). After this, we persist the projection and
    // moat-score rows that reference the new id.
    let row: StoredReport;
    try {
      row = await insertReport(domain, verdictReport, detectedStack);
    } catch (e) {
      // Race: another worker beat us to the insert.
      const existing = await getReportByDomain(domain);
      if (existing) {
        await emit({
          type: "done",
          cached: false,
          slug: existing.slug,
          report: existing,
        });
        return;
      }
      await emitScanError(
        emit,
        "internal",
        e instanceof Error ? e.message : String(e),
        { url: input.url, domain, ip: input.ip },
      );
      return;
    }

    try {
      await persistProjection(row.id, projection);
    } catch (e) {
      await logError({
        scope: "scan",
        reason: "projection_failed",
        refId: row.id,
        refSlug: row.slug,
        message: e instanceof Error ? e.message : String(e),
        detail: { url: input.url },
      });
    }

    try {
      await persistDistributionSignals(row.id, distribution);
    } catch (e) {
      await logError({
        scope: "scan",
        reason: "distribution_persist_failed",
        refId: row.id,
        refSlug: row.slug,
        message: e instanceof Error ? e.message : String(e),
        detail: { url: input.url },
      });
    }

    if (moat) {
      try {
        await persistMoatScore(
          row.id,
          moat,
          moatJudgment,
        );
        // Attach the freshly-computed score to the row so the SSE `done`
        // event carries it — otherwise the inline-rendered VerdictReport
        // would show no moat block until the user reloads. Fresh scans
        // start as 'pending' review status (matches DB default).
        row.moat = {
          ...moat,
          computed_at: new Date().toISOString(),
          review_status: "pending",
          reviewed_at: null,
          score_judgment: moatJudgment,
        };
      } catch (e) {
        await logError({
          scope: "scan",
          reason: "moat_persist_failed",
          refId: row.id,
          refSlug: row.slug,
          message: e instanceof Error ? e.message : String(e),
          detail: { url: input.url },
        });
      }
    }

    await emit({ type: "done", cached: false, slug: row.slug, report: row });
  } finally {
    await releaseDomainLock(domain);
  }
}

async function waitForDbResult(domain: string): Promise<StoredReport | null> {
  const start = Date.now();
  while (Date.now() - start < LOCK_POLL_TOTAL_MS) {
    await new Promise((r) => setTimeout(r, LOCK_POLL_INTERVAL_MS));
    const row = await getReportByDomain(domain);
    if (row) return row;
  }
  return null;
}
