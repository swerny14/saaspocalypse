import type { NextRequest } from "next/server";
import type Stripe from "stripe";
import { getStripe, guidePriceCents, isStripeConfigured } from "@/lib/stripe";
import {
  getPurchaseBySessionId,
  markPurchasePaidBySessionId,
} from "@/lib/db/purchases";
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
  const isProd = process.env.NODE_ENV === "production";

  if (!isStripeConfigured()) {
    await logError({
      scope: "webhook",
      reason: "stripe_not_configured",
      message: "Webhook received but STRIPE_SECRET_KEY is missing",
    });
    // In dev, swallow so a hand-replayed event doesn't loop. In prod a missing
    // key means we'd silently lose payments — return 500 so Stripe retries
    // once we fix the config.
    if (isProd) return jsonError(500, "stripe not configured");
    return Response.json({ received: true, note: "stripe not configured" });
  }

  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    await logError({
      scope: "webhook",
      reason: "webhook_secret_missing",
      message: "STRIPE_WEBHOOK_SECRET not set",
    });
    if (isProd) return jsonError(500, "webhook secret missing");
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

  // Defense-in-depth: Stripe locks line items server-side once a session is
  // created, so a tampered amount shouldn't be possible. Still, refuse to
  // grant access if the totals don't match what we charge.
  const expected = guidePriceCents();
  if (
    typeof session.amount_total !== "number" ||
    session.amount_total < expected ||
    (session.currency ?? "").toLowerCase() !== "usd"
  ) {
    await logError({
      scope: "webhook",
      reason: "amount_mismatch",
      message: "Session totals didn't match expected guide price",
      detail: {
        stripe_session_id: session.id,
        amount_total: session.amount_total,
        currency: session.currency,
        expected_cents: expected,
      },
    });
    return jsonError(400, "amount mismatch");
  }

  const updated = await markPurchasePaidBySessionId(session.id);
  if (!updated) {
    // Either the row was already promoted (duplicate webhook delivery) or it
    // never existed. Distinguish so we don't double-send the magic link.
    const existing = await getPurchaseBySessionId(session.id);
    if (existing && existing.status === "paid") {
      return Response.json({ received: true, note: "already paid" });
    }
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
    .eq("id", updated.report_id)
    .maybeSingle();

  const slug = (reportRow?.slug as string | undefined) ?? "";
  const reportName = (reportRow?.name as string | undefined) ?? "your product";
  const origin = originFromRequest(req);
  const magicLink = `${origin}/r/${slug}/guide?t=${updated.access_token}`;

  try {
    await sendGuideMagicLink({
      email: updated.email,
      reportName,
      magicLink,
    });
  } catch (e) {
    // Non-blocking — purchase is already marked paid. Log and move on; the
    // user can use /api/purchase/resend to re-send.
    await logError({
      scope: "webhook",
      reason: "email_send",
      refId: updated.id,
      refSlug: slug,
      message: e instanceof Error ? e.message : String(e),
    });
  }

  return Response.json({ received: true });
}
