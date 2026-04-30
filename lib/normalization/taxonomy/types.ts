/**
 * Canonical taxonomy types for the normalization layer. The TS modules under
 * lib/normalization/taxonomy/ are the source of truth — scripts/sync_taxonomy.ts
 * mirrors them into Supabase so SQL queries can JOIN against them. To add or
 * change a canonical entity: edit the TS file, then run `pnpm tsx
 * scripts/sync_taxonomy.ts`. The DB never invents entities of its own.
 */

export type ComponentCategory =
  | "hosting"
  | "framework"
  | "ui"
  | "cms"
  | "db"
  | "payments"
  | "auth"
  | "cdn"
  | "analytics"
  | "email"
  | "support"
  | "crm"
  | "ml"
  | "search"
  | "queue"
  | "monitoring"
  | "devtools"
  | "integrations"
  | "infra";

/**
 * 0 = bespoke / DIY    1 = OSS self-hosted   2 = managed, niche
 * 3 = commodity utility (Stripe, Postgres)   4 = ubiquitous (Cloudflare, GA)
 * 5 = trivial drop-in (npm install away)
 *
 * Lower = harder to replicate = deeper potential moat for the incumbent.
 * Used by the Phase B moat-scoring engine (technical-depth axis).
 */
export type CommoditizationLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type StackComponent = {
  slug: string;
  display_name: string;
  category: ComponentCategory;
  commoditization_level: CommoditizationLevel;
  /** Lowercase synonyms — used for text matching against verdict fields. */
  aliases: string[];
};

export type CapabilityCategory =
  | "collab"
  | "content"
  | "commerce"
  | "comm"
  | "ai"
  | "infra"
  | "data"
  | "workflow"
  | "identity";

/**
 * Tags that feed the moat scoring rubric. Each tag corresponds to a flag in
 * an axis (network/switching/data/regulatory). A capability can carry zero
 * or more tags — most carry zero (they exist for catalog completeness).
 */
export type MoatTag =
  // network effects
  | "multi_sided"
  | "ugc"
  | "marketplace"
  | "viral_loop"
  // switching cost
  | "data_storage"
  | "workflow_lock_in"
  | "integration_hub"
  // data moat
  | "proprietary_dataset"
  | "training_data"
  | "behavioral"
  // regulatory
  | "hipaa"
  | "finra"
  | "gdpr_critical"
  | "licensed";

export type Capability = {
  slug: string;
  display_name: string;
  category: CapabilityCategory;
  /**
   * Lowercase phrases. Phrase matching is whole-word (regex word boundaries),
   * applied to the concatenated verdict text fields. Confidence is derived
   * from match strength — exact phrase hits score higher than partial.
   */
  match_patterns: string[];
  moat_tags: MoatTag[];
  /**
   * True when this capability defines what a product CATEGORICALLY IS
   * ("form builder", "appointment booking", "ai agent platform"), not just
   * a feature it has. The similarity engine boosts shared descriptor caps
   * 2× on top of their IDF² weight so category-defining caps outrank
   * shared infrastructure in "products like X" rankings.
   *
   * Distinct from `moat_tags: []`: most descriptors don't move moat axes
   * (the *category* "form builder" doesn't grant a moat — specific
   * capabilities like `marketplace` do), but most non-moat capabilities
   * (`pdf-generation`, `comments-mentions`, `social-login`) aren't
   * categories either — they're sub-features many products incorporate.
   *
   * Optional: omit on non-descriptors (default = false). Set true only on
   * capabilities that name a product category.
   */
  is_descriptor?: boolean;
};

export type MarketSegment = {
  slug: string;
  display_name: string;
  match_patterns: string[];
};

export type BusinessModel = {
  slug: string;
  display_name: string;
  match_patterns: string[];
};
