import Stripe from "stripe";

let _stripe: Stripe | null | undefined;

/**
 * Lazy Stripe client. Throws if called without STRIPE_SECRET_KEY — callers
 * should guard with `isStripeConfigured()` before relying on it.
 */
export function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured");
  }
  _stripe = new Stripe(key);
  return _stripe;
}

export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/** Returns price in cents, defaulting to $7. */
export function guidePriceCents(): number {
  const raw = process.env.GUIDE_PRICE_CENTS;
  if (!raw) return 700;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 700;
}

/**
 * If GUIDE_PRICE_CENTS=0 and we're not in production, skip Stripe entirely
 * and mark purchases paid directly. Useful for local dev without Stripe keys.
 */
export function isDevBypass(): boolean {
  return (
    process.env.NODE_ENV !== "production" && guidePriceCents() === 0
  );
}

export type CreateCheckoutArgs = {
  email: string;
  reportSlug: string;
  reportName: string;
  accessToken: string;
  origin: string;
};

export async function createGuideCheckoutSession(args: CreateCheckoutArgs) {
  const stripe = getStripe();
  const fixedPriceId = process.env.STRIPE_GUIDE_PRICE_ID;

  const successUrl = `${args.origin}/r/${args.reportSlug}/guide?t=${args.accessToken}&checkout=success`;
  const cancelUrl = `${args.origin}/r/${args.reportSlug}?checkout=cancelled`;

  const lineItems = fixedPriceId
    ? [{ price: fixedPriceId, quantity: 1 }]
    : [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${args.reportName} — build guide`,
              description:
                "Step-by-step build guide with ready-to-paste LLM prompts. One-time purchase.",
            },
            unit_amount: guidePriceCents(),
          },
          quantity: 1,
        },
      ];

  return stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: args.email,
    line_items: lineItems,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      report_slug: args.reportSlug,
      access_token: args.accessToken,
    },
    allow_promotion_codes: true,
  });
}
