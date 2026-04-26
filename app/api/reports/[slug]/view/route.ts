import { NextResponse, type NextRequest } from "next/server";
import { incrementReportViewCount } from "@/lib/db/reports";
import { getViewRateLimiter } from "@/lib/ratelimit";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";

type Params = Promise<{ slug: string }>;

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest, ctx: { params: Params }) {
  const { slug } = await ctx.params;
  if (!slug || typeof slug !== "string") {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const limiter = getViewRateLimiter();
  if (limiter) {
    const ip = getClientIp(req);
    const { success } = await limiter.limit(`${ip}:${slug}`);
    if (!success) {
      return NextResponse.json({ ok: true, throttled: true });
    }
  }

  try {
    await incrementReportViewCount(slug);
  } catch (e) {
    await logError({
      scope: "view",
      reason: "increment_failed",
      refSlug: slug,
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
