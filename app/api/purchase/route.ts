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

export const runtime = "nodejs";

const BodySchema = z.object({
  slug: z.string().min(1),
  email: z.email(),
});

// User-facing copy. Internal detail is logged to error_log server-side.
const USER_MSG = {
  bad_request: "That request didn't look right. Refresh and try again.",
  not_found: "Report not found. Refresh the page and try again.",
  dont_tier:
    "We don't sell build guides for DON'T-tier products (for everyone's sake).",
  server: "We couldn't start checkout. Try again in a moment.",
  config: "Checkout isn't available right now. Try again later.",
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

  if (report.score < 30) {
    // Intentional user-facing rejection, not a system error — skip error_log.
    return jsonError(400, USER_MSG.dont_tier);
  }

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
