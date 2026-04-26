import type { DirectoryTier } from "./tiers";
import { TIER_STYLES } from "./tiers";

export function TierBadge({ tier, size = "md" }: { tier: DirectoryTier; size?: "sm" | "md" | "lg" }) {
  const t = TIER_STYLES[tier];
  const cls =
    size === "sm"
      ? "text-[10px] px-2 py-[3px]"
      : size === "lg"
        ? "text-[14px] px-3.5 py-1.5"
        : "text-[11px] px-2.5 py-1";
  return (
    <span
      className={`inline-block whitespace-nowrap font-mono font-bold tracking-[0.12em] border-2 border-ink ${cls}`}
      style={{ background: t.bg, color: t.fg }}
    >
      {t.label}
    </span>
  );
}
