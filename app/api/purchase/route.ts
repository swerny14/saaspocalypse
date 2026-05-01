import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getReportBySlug } from "@/lib/db/reports";
import {
  createPaidPurchase,
  createPendingPurchase,
} from "@/lib/db/purchases";
import {
  createGuideCheckoutSession,
  guidePriceCents,
  isDevBypass,
  isStripeConfigured,
} from "@/lib/stripe";
import { sendGuideMagicLink } from "@/lib/email";
import { logError } from "@/lib/error_log";
import { getPurchaseRateLimiter } from "@/lib/ratelimit";

export const runtime = "nodejs";

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}

const BodySchema = z.object({
  slug: z.string().min(1),
  email: z.email(),
  accepted: z.literal(true),
  terms_version: z.string().min(1).max(64),
  privacy_version: z.string().min(1).max(64),
});

// User-facing copy. Internal detail is logged to error_log server-side.
const USER_MSG = {
  bad_request: "That request didn't look right. Refresh and try again.",
  not_found: "Report not found. Refresh the page and try again.",
  server: "We couldn't start checkout. Try again in a moment.",
  config: "Checkout isn't available right now. Try again later.",
  rate_limited:
    "Too many checkout attempts from your network. Give it an hour.",
} as const;

function generateAccessToken(): string {
  return randomBytes(32).toString("base64url");
}

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

export async function POST(req: NextRequest) {
  // Rate-limit before parsing the body so a flood of malformed POSTs can't
  // burn cycles + log spam first.
  const ip = getClientIp(req);
  const limiter = getPurchaseRateLimiter();
  if (limiter) {
    const { success } = await limiter.limit(ip);
    if (!success) {
      return jsonError(429, USER_MSG.rate_limited);
    }
  }

  let raw: unknown;
  try {
    raw = await req.json();
  } catch (e) {
    await logError({
      scope: "purchase",
      reason: "bad_request",
      message: e instanceof Error ? e.message : "JSON parse failed",
    });
    return jsonError(400, USER_MSG.bad_request);
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    await logError({
      scope: "purchase",
      reason: "bad_request",
      message: `body validation: ${parsed.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ")}`,
    });
    return jsonError(400, USER_MSG.bad_request);
  }
  const { slug } = parsed.data;
  const email = parsed.data.email.toLowerCase();
  const consent = {
    terms_version: parsed.data.terms_version,
    privacy_version: parsed.data.privacy_version,
    terms_accepted_at: new Date().toISOString(),
  };

  const report = await getReportBySlug(slug);
  if (!report) {
    await logError({
      scope: "purchase",
      reason: "report_not_found",
      refSlug: slug,
      message: `No report matched slug`,
    });
    return jsonError(404, USER_MSG.not_found);
  }

  // Wedge-frame Phase 2: every tier including FORTRESS gets a guide. The
  // build-guide LLM applies tier-specific framing (wedge play vs. clone)
  // via lib/build_guide/llm.ts.

  const amountCents = guidePriceCents();
  const accessToken = generateAccessToken();
  const origin = originFromRequest(req);

  // Dev bypass: skip Stripe, mark paid immediately, email the magic link.
  if (isDevBypass() || !isStripeConfigured()) {
    if (!isDevBypass() && !isStripeConfigured()) {
      await logError({
        scope: "purchase",
        reason: "stripe_not_configured",
        refId: report.id,
        refSlug: report.slug,
        message: "STRIPE_SECRET_KEY missing and not in dev bypass",
      });
      return jsonError(500, USER_MSG.config);
    }
    try {
      await createPaidPurchase({
        report_id: report.id,
        email,
        amount_cents: amountCents,
        access_token: accessToken,
        consent,
      });
    } catch (e) {
      await logError({
        scope: "purchase",
        reason: "db_insert",
        refId: report.id,
        refSlug: report.slug,
        message: e instanceof Error ? e.message : String(e),
      });
      return jsonError(500, USER_MSG.server);
    }
    const magicLink = `${origin}/r/${report.slug}/guide?t=${accessToken}`;
    await sendGuideMagicLink({
      email,
      reportName: report.name,
      magicLink,
    });
    return Response.json({ mode: "dev_bypass", redirect: magicLink });
  }

  // Real Stripe flow.
  let session;
  try {
    session = await createGuideCheckoutSession({
      email,
      reportSlug: report.slug,
      reportName: report.name,
      accessToken,
      origin,
    });
  } catch (e) {
    await logError({
      scope: "purchase",
      reason: "stripe_session_create",
      refId: report.id,
      refSlug: report.slug,
      message: e instanceof Error ? e.message : String(e),
    });
    return jsonError(500, USER_MSG.server);
  }

  try {
    await createPendingPurchase({
      report_id: report.id,
      email,
      amount_cents: amountCents,
      access_token: accessToken,
      stripe_session_id: session.id,
      consent,
    });
  } catch (e) {
    await logError({
      scope: "purchase",
      reason: "db_insert",
      refId: report.id,
      refSlug: report.slug,
      message: e instanceof Error ? e.message : String(e),
      detail: { stripe_session_id: session.id },
    });
    return jsonError(500, USER_MSG.server);
  }

  if (!session.url) {
    await logError({
      scope: "purchase",
      reason: "stripe_no_url",
      refId: report.id,
      refSlug: report.slug,
      message: "Stripe session created but no url returned",
      detail: { stripe_session_id: session.id },
    });
    return jsonError(500, USER_MSG.server);
  }

  return Response.json({ mode: "stripe", redirect: session.url });
}
