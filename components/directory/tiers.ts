export type DirectoryTier = "WEEKEND" | "MONTH" | "DON'T";

export const DIRECTORY_TIERS: DirectoryTier[] = ["WEEKEND", "MONTH", "DON'T"];

export const TIER_STYLES: Record<DirectoryTier, { bg: string; fg: string; label: string }> = {
  WEEKEND: { bg: "#b6f24a", fg: "#0a0a0a", label: "WEEKEND" },
  MONTH: { bg: "#ffd84d", fg: "#0a0a0a", label: "A MONTH" },
  "DON'T": { bg: "#ef4444", fg: "#0a0a0a", label: "DON'T" },
};
