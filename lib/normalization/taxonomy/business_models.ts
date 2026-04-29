import type { BusinessModel } from "./types";

/**
 * Business models. Pattern matches against the verdict text fields plus the
 * structured `current_cost` row. Highest score wins; tie → null in DB.
 */
export const BUSINESS_MODELS: BusinessModel[] = [
  {
    slug: "subscription",
    display_name: "Subscription",
    match_patterns: ["subscription", "monthly plan", "annual plan", "per seat", "per user", "/mo", "/month"],
  },
  {
    slug: "freemium",
    display_name: "Freemium",
    match_patterns: ["freemium", "free tier", "free plan", "free forever", "upgrade to pro"],
  },
  {
    slug: "usage-based",
    display_name: "Usage-based",
    match_patterns: ["usage-based", "usage based", "pay as you go", "pay-as-you-go", "metered", "per request", "per call"],
  },
  {
    slug: "marketplace",
    display_name: "Marketplace / take rate",
    match_patterns: ["take rate", "marketplace fee", "platform fee", "transaction fee"],
  },
  {
    slug: "transactional",
    display_name: "Transactional",
    match_patterns: ["per transaction", "transaction fee", "% per transaction", "2.9% +"],
  },
  {
    slug: "ads",
    display_name: "Advertising",
    match_patterns: ["ad-supported", "advertising", "ad revenue", "sponsored", "ad-supported"],
  },
  {
    slug: "one-time",
    display_name: "One-time purchase",
    match_patterns: ["one-time", "lifetime", "lifetime deal", "buy once"],
  },
];
