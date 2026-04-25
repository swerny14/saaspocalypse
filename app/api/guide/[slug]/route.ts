import type { NextRequest } from "next/server";
import { getReportBySlug } from "@/lib/db/reports";
import { getPurchaseByAccessToken } from "@/lib/db/purchases";
import {
  runGuideGeneration,
  sseFormatGuide,
  USER_GUIDE_MESSAGES,
  type GuideEvent,
  type GuideErrorReason,
} from "@/lib/build_guide/pipeline";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";
// Guide generation (cold) runs ~30-50s.
export const maxDuration = 120;

async function streamSingleError(
  reason: GuideErrorReason,
  internalMessage: string,
  slug: string,
  detail?: Record<string, unknown>,
): Promise<Response> {
  await logError({
    scope: "guide_gen",
    reason,
    refSlug: slug,
    message: internalMessage,
    detail,
  });

  const encoder = new TextEncoder();
  const event: GuideEvent = {
    type: "error",
    reason,
    message: USER_GUIDE_MESSAGES[reason],
  };
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(sseFormatGuide(event)));
      controller.close();
    },
  });
  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
}

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  const { slug } = await ctx.params;
  const token = new URL(req.url).searchParams.get("t");

  if (!token) {
    return streamSingleError("invalid_token", "missing access token in query", slug);
  }

  const purchase = await getPurchaseByAccessToken(token);
  if (!purchase) {
    return streamSingleError("invalid_token", "access token not found", slug, {
      tokenPrefix: token.slice(0, 6),
    });
  }
  if (purchase.status !== "paid") {
    return streamSingleError(
      "purchase_not_paid",
      `Purchase status=${purchase.status}`,
      slug,
      { purchaseId: purchase.id },
    );
  }

  const report = await getReportBySlug(slug);
  if (!report) {
    return streamSingleError("report_missing", "Report slug not in DB", slug, {
      purchaseId: purchase.id,
    });
  }
  if (report.id !== purchase.report_id) {
    return streamSingleError(
      "token_mismatch",
      "Purchase report_id does not match slug's report",
      slug,
      { purchaseId: purchase.id, purchaseReportId: purchase.report_id },
    );
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: GuideEvent) => {
        controller.enqueue(encoder.encode(sseFormatGuide(event)));
      };
      try {
        await runGuideGeneration(report, emit);
      } catch (e) {
        await logError({
          scope: "guide_gen",
          reason: "internal",
          refId: report.id,
          refSlug: report.slug,
          message: e instanceof Error ? e.message : String(e),
        });
        emit({
          type: "error",
          reason: "internal",
          message: USER_GUIDE_MESSAGES.internal,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      "x-accel-buffering": "no",
      connection: "keep-alive",
    },
  });
}
