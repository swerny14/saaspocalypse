import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getNewsletterRateLimiter } from "@/lib/ratelimit";
import { addToAudience } from "@/lib/email";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";

const Body = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
});

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

export async function POST(req: NextRequest) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { email } = parsed.data;

  const limiter = getNewsletterRateLimiter();
  if (limiter) {
    const ip = getClientIp(req);
    const { success } = await limiter.limit(ip);
    if (!success) {
      return NextResponse.json({ ok: true, throttled: true });
    }
  }

  const result = await addToAudience(email);
  if (!result.ok) {
    await logError({
      scope: "newsletter",
      reason: "add_to_audience_failed",
      message: result.reason,
    });
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
