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
import { fetchAndCleanHomepage, FetchError } from "./fetch";
import { callClaudeForVerdict } from "./llm";
import type { ScanErrorReason, ScanEvent } from "./events";
import { STEP_LABELS } from "./events";
import { USER_SCAN_MESSAGES } from "./user_messages";

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
    let html: string;
    try {
      html = await fetchAndCleanHomepage(`https://${domain}`);
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
    if (!html || html.length < 100) {
      await emitScanError(
        emit,
        "empty_html",
        `Homepage produced only ${html?.length ?? 0} chars of readable text`,
        { url: input.url, domain, ip: input.ip },
      );
      return;
    }

    // 6. Call Claude (internally validates + retries).
    await emit({ type: "step", step: "analyze", label: STEP_LABELS.analyze });
    const llmOut = await callClaudeForVerdict({ domain, html, signal: input.signal });
    if (llmOut.kind === "error") {
      await emitScanError(emit, llmOut.reason, llmOut.message, {
        url: input.url,
        domain,
        ip: input.ip,
      });
      return;
    }

    // 7. Insert + announce.
    await emit({ type: "step", step: "verdict", label: STEP_LABELS.verdict });
    let row: StoredReport;
    try {
      row = await insertReport(domain, llmOut.verdict);
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
