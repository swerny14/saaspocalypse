import type { StoredMoatScore } from "@/lib/db/moat_scores";
import type { MoatAxis } from "@/lib/scanner/schema";

const AXES: Array<{ key: MoatAxis; label: string }> = [
  { key: "capital", label: "C" },
  { key: "technical", label: "T" },
  { key: "network", label: "N" },
  { key: "switching", label: "S" },
  { key: "data_moat", label: "D" },
  { key: "regulatory", label: "R" },
  { key: "distribution", label: "X" },
];

function severityClass(score: number): string {
  if (score >= 7) return "bg-coral";
  if (score >= 4) return "bg-ink";
  if (score >= 1) return "bg-muted";
  return "bg-ink/15";
}

/**
 * Tiny vertical-bars view of all 7 moat axes, matching the colour scale used
 * by `MoatBreakdown`. Designed for the full-leaderboard rows — a compact
 * visual cue that shows WHY a row sits where it does without forcing the
 * user to click into the report.
 */
export function MoatSparkline({ moat }: { moat: StoredMoatScore | null }) {
  if (!moat) {
    return (
      <div className="font-mono text-[10px] text-muted opacity-60">no moat data</div>
    );
  }

  return (
    <div
      className="flex items-end gap-[3px] h-[34px]"
      aria-label="Moat axis breakdown"
    >
      {AXES.map(({ key, label }) => {
        const raw = moat[key];
        const score = typeof raw === "number" ? raw : 0;
        const isMissing = raw == null;
        const heightPct = isMissing ? 8 : Math.max(8, (score / 10) * 100);
        const cls = isMissing ? "bg-ink/10" : severityClass(score);
        return (
          <div
            key={key}
            className="w-[8px] flex flex-col items-center justify-end h-full"
            title={`${key}: ${isMissing ? "n/a" : score.toFixed(1)}`}
          >
            <div
              className={`w-full ${cls}`}
              style={{ height: `${heightPct}%` }}
            />
            <div className="font-mono text-[8px] text-muted mt-[2px] leading-none">
              {label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
