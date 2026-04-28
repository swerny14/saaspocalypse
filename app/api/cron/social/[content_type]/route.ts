import type { NextRequest } from "next/server";
import { runDailySocial, type PipelineMode } from "@/lib/social/pipeline";
import type { ContentType } from "@/lib/db/social_posts";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const ALLOWED: ContentType[] = ["report", "original"];

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ content_type: string }> },
): Promise<Response> {
  const auth = req.headers.get("authorization");
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return new Response("CRON_SECRET not configured", { status: 500 });
  }
  if (auth !== `Bearer ${expected}`) {
    return new Response("unauthorized", { status: 401 });
  }
  const { content_type } = await params;
  if (!ALLOWED.includes(content_type as ContentType)) {
    return new Response(`unknown content_type: ${content_type}`, { status: 400 });
  }

  const url = new URL(req.url);
  const mode: PipelineMode =
    url.searchParams.get("dry") === "1" ? "dry_run" : "live";

  const result = await runDailySocial({
    content_type: content_type as ContentType,
    mode,
  });

  const status = result.kind === "failed" ? 500 : 200;
  return Response.json(result, { status });
}
