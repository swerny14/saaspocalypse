import type { MarketSegment } from "./types";

/**
 * Market segments. Pattern matches against the verdict text fields. The
 * highest-scoring segment wins; ties yield no segment (null in DB).
 */
export const MARKET_SEGMENTS: MarketSegment[] = [
  {
    slug: "smb-saas",
    display_name: "SMB SaaS",
    match_patterns: ["small business", "smb", "indie", "small team", "freelancer"],
  },
  {
    slug: "dev-tools",
    display_name: "Dev tools",
    match_patterns: ["developer", "developers", "engineers", "engineering team", "ci/cd", "devtools", "dev tool", "for engineers"],
  },
  {
    slug: "consumer",
    display_name: "Consumer",
    match_patterns: ["consumer", "personal use", "individuals", "everyday users", "for everyone"],
  },
  {
    slug: "enterprise",
    display_name: "Enterprise",
    match_patterns: ["enterprise", "fortune 500", "large organizations", "global enterprise", "enterprise-grade"],
  },
  {
    slug: "creator",
    display_name: "Creator economy",
    match_patterns: ["creators", "content creators", "creator economy", "youtubers", "podcasters", "newsletter writers"],
  },
  {
    slug: "ecommerce",
    display_name: "Ecommerce",
    match_patterns: ["ecommerce", "e-commerce", "online store", "shopify", "merchants"],
  },
  {
    slug: "vertical-finance",
    display_name: "Vertical: finance",
    match_patterns: ["fintech", "finance", "banking", "trading", "investing", "wealth management"],
  },
  {
    slug: "vertical-health",
    display_name: "Vertical: health",
    match_patterns: ["healthcare", "health", "medical", "clinical", "patient", "telemedicine"],
  },
  {
    slug: "vertical-legal",
    display_name: "Vertical: legal",
    match_patterns: ["legal", "law firm", "attorneys", "compliance", "contracts"],
  },
  {
    slug: "vertical-education",
    display_name: "Vertical: education",
    match_patterns: ["education", "edtech", "students", "teachers", "schools", "learning"],
  },
];
