import type { LeaderboardEntry } from "@/lib/db/leaderboards";

const NEW_WINDOW_MS = 72 * 60 * 60 * 1000;

export function isNew(entry: LeaderboardEntry): boolean {
  return Date.now() - new Date(entry.created_at).getTime() < NEW_WINDOW_MS;
}

export function isHot(entry: LeaderboardEntry, threshold: number): boolean {
  return (entry.view_count ?? 0) >= threshold && Number.isFinite(threshold);
}

/**
 * 75th-percentile view_count across the supplied cohort. Anything at or above
 * the threshold gets the "hot" badge. Returns +∞ for cohorts smaller than 4
 * so the cue stays meaningful (and silent) on a sparse corpus.
 */
export function computeHotThreshold(entries: LeaderboardEntry[]): number {
  const counts = entries
    .map((e) => e.view_count ?? 0)
    .filter((n) => n > 0)
    .sort((a, b) => a - b);
  if (counts.length < 4) return Number.POSITIVE_INFINITY;
  const idx = Math.floor(counts.length * 0.75);
  return counts[Math.min(idx, counts.length - 1)];
}

export function NewPill() {
  return (
    <span className="inline-block bg-ink text-bg font-mono text-[9px] font-bold uppercase tracking-[0.12em] px-1.5 py-[2px]">
      new
    </span>
  );
}

export function HotPill() {
  return (
    <span className="inline-flex items-center gap-1 bg-coral text-paper font-mono text-[9px] font-bold uppercase tracking-[0.12em] px-1.5 py-[2px]">
      <FlameIcon />
      hot
    </span>
  );
}

export function FlameIcon({ className = "" }: { className?: string }) {
  // Heroicons "fire" — solid path, scaled to 11px to sit alongside the
  // mono-caps pill text without crowding it.
  return (
    <svg
      viewBox="0 0 24 24"
      width="11"
      height="11"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
