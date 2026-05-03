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

export type CommoditizationLevel = 0 | 1 | 2 | 3 | 4 | 5;

export type StackComponent = {
  slug: string;
  display_name: string;
  category: ComponentCategory;
  commoditization_level: CommoditizationLevel;
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

export type Capability = {
  slug: string;
  display_name: string;
  category: CapabilityCategory;
  match_patterns: string[];
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
