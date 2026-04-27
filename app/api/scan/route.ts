import type { NextRequest } from "next/server";
import { runScan } from "@/lib/scanner/pipeline";
import { sseFormat, type ScanEvent } from "@/lib/scanner/events";
import { USER_SCAN_MESSAGES } from "@/lib/scanner/user_messages";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";
// Cold scans (Claude + fetch) can run ~15-30s. Allow up to 60s for safety.
// Requires Vercel Pro or Fluid compute at deploy time.
export const maxDuration = 60;

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  let body: { url?: string };
  try {
    body = (await req.json()) as { url?: string };
  } catch {
    return jsonError(400, "invalid JSON body");
  }

  const url = body.url;
  if (!url || typeof url !== "string") {
    return jsonError(400, "missing url");
  }

  const ip = getClientIp(req);
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: ScanEvent) => {
        controller.enqueue(encoder.encode(sseFormat(event)));
      };
      try {
        // req.signal aborts when the client closes the SSE — propagates into
        // the Anthropic call so we don't burn tokens on abandoned scans.
        await runScan({ url, ip, signal: req.signal }, emit);
      } catch (e) {
        // Last-resort catch: runScan should map all known failures via
        // emitScanError. If we land here, it's an unhandled exception —
        // log the real detail, surface generic copy.
        await logError({
          scope: "scan",
          reason: "internal",
          message: e instanceof Error ? e.message : String(e),
          detail: { url, ip, source: "route_outer_catch" },
        });
        emit({
          type: "error",
          reason: "internal",
          message: USER_SCAN_MESSAGES.internal,
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

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}
