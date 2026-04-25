import type { StoredReport } from "@/lib/db/reports";
import {
  getBuildGuideByReportId,
  insertBuildGuide,
  type StoredBuildGuide,
} from "@/lib/db/build_guides";
import { acquireDomainLock, releaseDomainLock } from "@/lib/ratelimit";
import { logError } from "@/lib/error_log";
import { generateBuildGuide, GUIDE_MODEL } from "./llm";

export type GuideStepId = "check_cache" | "draft" | "prompts" | "persist";

export const GUIDE_STEP_LABELS: Record<GuideStepId, string> = {
  check_cache: "Checking for an existing guide...",
  draft: "Drafting architecture + step outline...",
  prompts: "Writing copy-paste LLM prompts...",
  persist: "Saving your guide...",
};

export const GUIDE_STEP_ORDER: GuideStepId[] = [
  "check_cache",
  "draft",
  "prompts",
  "persist",
];

export type GuideErrorReason =
  | "invalid_token"
  | "purchase_not_paid"
  | "token_mismatch"
  | "report_missing"
  | "generation_failed"
  | "internal";

export const USER_GUIDE_MESSAGES: Record<GuideErrorReason, string> = {
  invalid_token:
    "This link is invalid. Re-open the original email or request a new one.",
  purchase_not_paid:
    "Your payment is still processing. Give it a minute, then refresh.",
  token_mismatch: "This link is for a different report.",
  report_missing:
    "We can't find that report anymore. Contact support if you've paid.",
  generation_failed:
    "Guide generation hit a snag. Refresh to retry — your purchase is still valid.",
  internal:
    "Something broke on our end. Your purchase is still valid — refresh to retry.",
};

export type GuideEvent =
  | { type: "step"; step: GuideStepId; label: string }
  | { type: "done"; cached: boolean; guide: StoredBuildGuide }
  | { type: "error"; reason: GuideErrorReason; message: string };

export type GuideEmitter = (event: GuideEvent) => void | Promise<void>;

const LOCK_TTL_SECONDS = 120;
const LOCK_POLL_TOTAL_MS = 60_000;
const LOCK_POLL_INTERVAL_MS = 1_500;

export function sseFormatGuide(event: GuideEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`;
}

/**
 * Emit a generic user-facing error + persist the internal detail. User
 * never sees stack traces, LLM raw errors, or DB error codes.
 */
async function emitGuideError(
  emit: GuideEmitter,
  reason: GuideErrorReason,
  internalMessage: string,
  ctx: { reportId?: string | null; reportSlug?: string | null },
  detail?: Record<string, unknown>,
): Promise<void> {
  await logError({
    scope: "guide_gen",
    reason,
    refId: ctx.reportId ?? null,
    refSlug: ctx.reportSlug ?? null,
    message: internalMessage,
    detail,
  });
  await emit({
    type: "error",
    reason,
    message: USER_GUIDE_MESSAGES[reason],
  });
}

export async function runGuideGeneration(
  report: StoredReport,
  emit: GuideEmitter,
): Promise<void> {
  const t0 = Date.now();
  console.log(`[guide_pipeline] start · report=${report.slug} id=${report.id}`);

  await emit({
    type: "step",
    step: "check_cache",
    label: GUIDE_STEP_LABELS.check_cache,
  });

  const cached = await getBuildGuideByReportId(report.id);
  if (cached) {
    console.log(`[guide_pipeline] cache hit · ${Date.now() - t0}ms`);
    await emit({ type: "done", cached: true, guide: cached });
    return;
  }

  const lockKey = `guide:${report.domain}`;
  const gotLock = await acquireDomainLock(lockKey, LOCK_TTL_SECONDS);
  if (!gotLock) {
    const waited = await waitForGuide(report.id);
    if (waited) {
      await emit({ type: "done", cached: false, guide: waited });
      return;
    }
    await emitGuideError(
      emit,
      "generation_failed",
      `Domain lock held and DB never produced a result after ${LOCK_POLL_TOTAL_MS}ms`,
      { reportId: report.id, reportSlug: report.slug },
    );
    return;
  }

  try {
    // Re-check after acquiring the lock — another worker may have finished while we waited.
    const doubleCheck = await getBuildGuideByReportId(report.id);
    if (doubleCheck) {
      await emit({ type: "done", cached: true, guide: doubleCheck });
      return;
    }

    await emit({ type: "step", step: "draft", label: GUIDE_STEP_LABELS.draft });
    console.log(`[guide_pipeline] calling Claude...`);
    const llmOut = await generateBuildGuide(report);
    if (llmOut.kind === "error") {
      await emitGuideError(
        emit,
        "generation_failed",
        llmOut.message,
        { reportId: report.id, reportSlug: report.slug },
      );
      return;
    }
    console.log(`[guide_pipeline] LLM ok · ${Date.now() - t0}ms total`);

    await emit({ type: "step", step: "prompts", label: GUIDE_STEP_LABELS.prompts });
    await emit({
      type: "step",
      step: "persist",
      label: GUIDE_STEP_LABELS.persist,
    });

    let stored: StoredBuildGuide;
    try {
      stored = await insertBuildGuide(report.id, llmOut.guide, {
        model: GUIDE_MODEL,
        input_tokens: llmOut.usage.input_tokens,
        output_tokens: llmOut.usage.output_tokens,
      });
      console.log(`[guide_pipeline] inserted · guide_id=${stored.id}`);
    } catch (e) {
      const existing = await getBuildGuideByReportId(report.id);
      if (existing) {
        await emit({ type: "done", cached: false, guide: existing });
        return;
      }
      await emitGuideError(
        emit,
        "internal",
        e instanceof Error ? e.message : String(e),
        { reportId: report.id, reportSlug: report.slug },
      );
      return;
    }

    console.log(`[guide_pipeline] emitting done · ${Date.now() - t0}ms total`);
    await emit({ type: "done", cached: false, guide: stored });
  } finally {
    await releaseDomainLock(lockKey);
  }
}

async function waitForGuide(reportId: string): Promise<StoredBuildGuide | null> {
  const start = Date.now();
  while (Date.now() - start < LOCK_POLL_TOTAL_MS) {
    await new Promise((r) => setTimeout(r, LOCK_POLL_INTERVAL_MS));
    const guide = await getBuildGuideByReportId(reportId);
    if (guide) return guide;
  }
  return null;
}
