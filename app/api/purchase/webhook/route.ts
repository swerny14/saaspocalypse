import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, isStripeConfigured } from "@/lib/stripe";
import { markPurchasePaidBySessionId } from "@/lib/db/purchases";
import { getSupabaseAdmin } from "@/lib/db/supabase";
import { sendGuideMagicLink } from "@/lib/email";
import { logError } from "@/lib/error_log";

export const runtime = "nodejs";

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
  if (!isStripeConfigured()) {
    await logError({
      scope: "webhook",
      reason: "stripe_not_configured",
      message: "Webhook received but STRIPE_SECRET_KEY is missing",
    });
    // Stripe retries on 5xx; return 200 so we don't loop while misconfigured.
    return Response.json({ received: true, note: "stripe not configured" });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    await logError({
      scope: "webhook",
      reason: "webhook_secret_missing",
      message: "STRIPE_WEBHOOK_SECRET not set",
    });
    return Response.json({ received: true, note: "webhook secret not set" });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return jsonError(400, "missing signature");

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, sig, secret);
  } catch (e) {
    await logError({
      scope: "webhook",
      reason: "signature_verify",
      message: e instanceof Error ? e.message : String(e),
    });
    return jsonError(400, "invalid signature");
  }

  if (event.type !== "checkout.session.completed") {
    // Acknowledge and ignore other events.
    return Response.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  if (session.payment_status !== "paid") {
    return Response.json({ received: true, note: "session not paid" });
  }

  const purchase = await markPurchasePaidBySessionId(session.id);
  if (!purchase) {
    await logError({
      scope: "webhook",
      reason: "purchase_not_found",
      message: "No matching pending purchase for completed session",
      detail: {
        stripe_session_id: session.id,
        customer_email: session.customer_email,
      },
    });
    return jsonError(404, "no matching purchase");
  }

  // Pull report for a nicer email subject.
  const admin = getSupabaseAdmin();
  const { data: reportRow } = await admin
    .from("reports")
    .select("name,slug")
    .eq("id", purchase.report_id)
    .maybeSingle();

  const slug = (reportRow?.slug as string | undefined) ?? "";
  const reportName = (reportRow?.name as string | undefined) ?? "your product";
  const origin = originFromRequest(req);
  const magicLink = `${origin}/r/${slug}/guide?t=${purchase.access_token}`;

  try {
    await sendGuideMagicLink({
      email: purchase.email,
      reportName,
      magicLink,
    });
  } catch (e) {
    // Non-blocking — purchase is already marked paid. Log and move on; the
    // user can use /api/purchase/resend to re-send.
    await logError({
      scope: "webhook",
      reason: "email_send",
      refId: purchase.id,
      refSlug: slug,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  return Response.json({ received: true });
}
