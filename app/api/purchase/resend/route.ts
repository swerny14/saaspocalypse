import type { NextRequest } from "next/server";
import { z } from "zod";
import { Ratelimit } from "@upstash/ratelimit";
import { getRedis } from "@/lib/ratelimit";
import { getReportBySlug } from "@/lib/db/reports";
import { getLatestPaidPurchaseByEmailAndReport } from "@/lib/db/purchases";
import { sendGuideMagicLink } from "@/lib/email";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";

const BodySchema = z.object({
  slug: z.string().min(1),
  email: z.email(),
});

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function originFromRequest(req: NextRequest): string {
  const proto = req.headers.get("x-forwarded-proto") ?? "https";
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) return `${proto}://${host}`;
  return new URL(req.url).origin;
}

// 3 resends / hour / email. Caps abuse on a known buyer's address.
let _emailLimiter: Ratelimit | null | undefined;
function emailLimiter(): Ratelimit | null {
  if (_emailLimiter !== undefined) return _emailLimiter;
  const redis = getRedis();
  if (!redis) {
    _emailLimiter = null;
    return null;
  }
  _emailLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "saaspo:resend:email",
    analytics: false,
  });
  return _emailLimiter;
}

// 20 resends / hour / IP. Stops single-IP enumeration — the per-email cap
// alone lets a script try one address, get blocked, try a different address,
// and repeat indefinitely without ever tripping. Both must pass.
let _ipLimiter: Ratelimit | null | undefined;
function ipLimiter(): Ratelimit | null {
  if (_ipLimiter !== undefined) return _ipLimiter;
  const redis = getRedis();
  if (!redis) {
    _ipLimiter = null;
    return null;
  }
  _ipLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 h"),
    prefix: "saaspo:resend:ip",
    analytics: false,
  });
  return _ipLimiter;
}

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
    return jsonError(400, "invalid JSON body");
  }
  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) return jsonError(400, "invalid body");

  const { slug } = parsed.data;
  const email = parsed.data.email.toLowerCase();

  // Both limiters must pass. Per-IP first so a script can't burn through
  // attempts before hitting the per-email cap.
  const ipRl = ipLimiter();
  if (ipRl) {
    const { success } = await ipRl.limit(getClientIp(req));
    if (!success) {
      return jsonError(429, "Too many resend requests. Try again in an hour.");
    }
  }
  const emailRl = emailLimiter();
  if (emailRl) {
    const { success } = await emailRl.limit(email);
    if (!success) {
      return jsonError(429, "Too many resend requests. Try again in an hour.");
    }
  }

  const report = await getReportBySlug(slug);
  if (!report) return jsonError(404, "report not found");

  const purchase = await getLatestPaidPurchaseByEmailAndReport({
    email,
    report_id: report.id,
  });
  // Always return 200 for successful lookups — don't leak whether email is known.
  if (!purchase) {
    return Response.json({ ok: true });
  }

  const magicLink = `${originFromRequest(req)}/r/${report.slug}/guide?t=${purchase.access_token}`;
  try {
    await sendGuideMagicLink({
      email,
      reportName: report.name,
      magicLink,
    });
  } catch (e) {
    await logError({
      scope: "resend",
      reason: "email_send",
      refId: purchase.id,
      refSlug: report.slug,
      message: e instanceof Error ? e.message : String(e),
    });
    // Still return ok — we don't want to leak that the email exists.
  }
  return Response.json({ ok: true });
}
