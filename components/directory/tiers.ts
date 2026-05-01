export type DirectoryTier = "SOFT" | "CONTESTED" | "FORTRESS";

export const DIRECTORY_TIERS: DirectoryTier[] = ["SOFT", "CONTESTED", "FORTRESS"];

export const TIER_STYLES: Record<DirectoryTier, { bg: string; fg: string; label: string }> = {
  SOFT: { bg: "#b6f24a", fg: "#0a0a0a", label: "SOFT" },
  CONTESTED: { bg: "#ffd84d", fg: "#0a0a0a", label: "CONTESTED" },
  FORTRESS: { bg: "#ef4444", fg: "#0a0a0a", label: "FORTRESS" },
};
