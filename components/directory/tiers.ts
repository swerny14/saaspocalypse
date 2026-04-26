/**
 * Directory tier presentation tokens. Includes QUARTER (a planned future tier)
 * which is rendered in the sidebar but disabled today since no reports exist
 * with that tier. When QUARTER is added to the schema, the row activates
 * automatically.
 */

export type DirectoryTier = "WEEKEND" | "MONTH" | "QUARTER" | "DON'T";

export const DIRECTORY_TIERS: DirectoryTier[] = ["WEEKEND", "MONTH", "QUARTER", "DON'T"];

export const TIER_STYLES: Record<DirectoryTier, { bg: string; fg: string; label: string }> = {
  WEEKEND: { bg: "#b6f24a", fg: "#0a0a0a", label: "WEEKEND" },
  MONTH: { bg: "#ffd84d", fg: "#0a0a0a", label: "A MONTH" },
  QUARTER: { bg: "#ffa066", fg: "#0a0a0a", label: "A QUARTER" },
  "DON'T": { bg: "#ef4444", fg: "#0a0a0a", label: "DON'T" },
};
