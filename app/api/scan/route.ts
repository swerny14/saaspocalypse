import type { NextRequest } from "next/server";
import { runScan } from "@/lib/scanner/pipeline";
import { sseFormat, type ScanEvent } from "@/lib/scanner/events";

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
        await runScan({ url, ip }, emit);
      } catch (e) {
        emit({
          type: "error",
          reason: "internal",
          message: e instanceof Error ? e.message : "Unknown error",
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
