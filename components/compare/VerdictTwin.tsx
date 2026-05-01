import type { CompareSide } from "@/lib/db/compare";

type Props = {
  a: CompareSide;
  b: CompareSide;
  score_delta: number;
};

const TIER_BG: Record<string, string> = {
  SOFT: "var(--color-accent)",
  CONTESTED: "var(--color-sticky)",
  FORTRESS: "var(--color-coral)",
};

function scoreColor(score: number): string {
  if (score >= 70) return "var(--color-success)";
  if (score >= 40) return "var(--color-warning)";
  return "var(--color-coral)";
}

function fillColor(score: number): string {
  if (score >= 70) return "var(--color-success)";
  if (score >= 40) return "var(--color-ink)";
  return "var(--color-coral)";
}

function formatDelta(delta: number): string {
  if (delta === 0) return "±0";
  return delta > 0 ? `+${delta}` : `${delta}`;
}

export function VerdictTwin({ a, b, score_delta }: Props) {
  return (
    <section className="bg-paper border-[2.5px] border-ink shadow-[6px_6px_0_0_var(--color-ink)] overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_86px_1fr]">
        <SidePanel side={a} align="left" />
        <Gutter delta={score_delta} />
        <SidePanel side={b} align="right" />
      </div>
    </section>
  );
}

function SidePanel({ side, align }: { side: CompareSide; align: "left" | "right" }) {
  const r = side.report;
  const tierBg = TIER_BG[r.tier] ?? "var(--color-paper)";
  const score = r.wedge_score;
  const pct = Math.max(0, Math.min(100, score));

  return (
    <div
      className={`px-7 py-6 md:px-8 md:py-7 min-h-[240px] flex flex-col ${
        align === "right" ? "bg-paper-alt" : "bg-paper"
      }`}
    >
      <div className="flex justify-between items-start gap-3.5 mb-4">
        <div className="font-mono text-[10.5px] font-bold tracking-[0.18em] uppercase text-muted leading-[1.55]">
          clone time
          <br />
          <span className="text-ink">{r.time_estimate}</span>
        </div>
        <span
          className="font-mono text-[11px] font-bold tracking-[0.16em] uppercase px-2.5 py-1 border-2 border-ink shadow-[2px_2px_0_0_var(--color-ink)] whitespace-nowrap text-ink"
          style={{ background: tierBg }}
        >
          {r.tier.toLowerCase()}
        </span>
      </div>

      <h2 className="font-display font-bold text-[40px] md:text-[52px] tracking-[-0.04em] leading-[0.95] m-0 mb-1.5 [overflow-wrap:anywhere]">
        {r.name}
      </h2>
      <p className="font-display text-[15px] font-medium text-muted m-0 mb-5 [text-wrap:pretty] line-clamp-2">
        {r.tagline}
      </p>

      <div className="flex items-baseline gap-3.5 mb-3.5 mt-auto">
        <span
          className="font-display font-bold text-[80px] md:text-[96px] leading-[0.85] tracking-[-0.06em]"
          style={{ color: scoreColor(score) }}
        >
          {score}
        </span>
        <span className="font-display font-medium text-[22px] tracking-[-0.03em] opacity-50">
          / 100
        </span>
      </div>

      <div className="relative h-[6px] bg-bg border-[1.5px] border-ink mb-3.5">
        <i
          className="absolute inset-y-0 left-0 block"
          style={{ width: `${pct}%`, background: fillColor(score) }}
        />
        <i className="absolute inset-y-0 w-[1.5px] bg-ink opacity-25" style={{ left: "25%" }} />
        <i className="absolute inset-y-0 w-[1.5px] bg-ink opacity-25" style={{ left: "50%" }} />
        <i className="absolute inset-y-0 w-[1.5px] bg-ink opacity-25" style={{ left: "75%" }} />
      </div>

      <div className="flex justify-between items-center font-mono text-[10.5px] font-bold tracking-[0.18em] uppercase text-muted">
        <span>wedge score</span>
        <a
          href={`/r/${r.slug}`}
          className="text-ink no-underline border-b-2 border-ink pb-[1px] hover:text-coral hover:border-coral"
        >
          full report ↗
        </a>
      </div>
    </div>
  );
}

function Gutter({ delta }: { delta: number }) {
  return (
    <div
      className="hidden md:flex border-l-[2.5px] border-r-[2.5px] border-ink flex-col items-center justify-between py-4"
      style={{
        background:
          "repeating-linear-gradient(45deg, var(--color-bg) 0 6px, transparent 6px 12px), var(--color-paper)",
      }}
    >
      <span className="font-mono text-[18px] font-bold text-ink leading-none">→</span>
      <span
        className="font-display font-bold text-[56px] tracking-[-0.04em] text-ink leading-none"
        style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
        aria-label={`score delta ${formatDelta(delta)}`}
      >
        vs
      </span>
      <span className="font-mono text-[18px] font-bold text-ink leading-none">←</span>
    </div>
  );
}
