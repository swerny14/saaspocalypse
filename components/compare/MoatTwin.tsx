import type { CompareSide } from "@/lib/db/compare";
import type { MoatAxisDiff } from "@/lib/normalization/compare";

type Props = {
  a: CompareSide;
  b: CompareSide;
  moat_diff: MoatAxisDiff[];
};

const AXIS_LABELS: Record<Exclude<MoatAxisDiff["axis"], "aggregate">, string> = {
  capital: "capital",
  technical: "technical",
  network: "network",
  switching: "switching",
  data_moat: "data",
  regulatory: "regulatory",
};

/** Severity colors. Applied uniformly to both sides per axis — no "leader gets
 * coral" special case. The bars are meant to be readable as a category, not a
 * race winner. */
function fillFor(score: number | null): string {
  if (score == null) return "var(--color-bg)";
  if (score >= 7) return "var(--color-coral)";
  if (score >= 4) return "var(--color-ink)";
  if (score >= 1) return "#888";
  return "#d8d4c4";
}

function aggSeverityWord(score: number | null): string {
  if (score == null) return "no score";
  if (score < 3) return "shallow ditch";
  if (score < 5) return "shallow moat";
  if (score < 7) return "real moat";
  return "deep moat";
}

function formatNum(n: number | null): string {
  if (n == null) return "—";
  return n.toFixed(1);
}

function formatAxisDelta(delta: number | null): {
  text: string;
  cls: string;
} {
  if (delta == null) return { text: "—", cls: "text-muted" };
  const rounded = Math.round(delta * 10) / 10;
  if (Math.abs(rounded) < 0.05) return { text: "±0", cls: "text-muted" };
  if (rounded > 0) return { text: `+${rounded.toFixed(1)} →`, cls: "text-success" };
  return { text: `${rounded.toFixed(1)} →`, cls: "text-coral" };
}

function formatHeadDelta(delta: number | null): { text: string; tie: boolean } {
  if (delta == null) return { text: "no score", tie: true };
  const rounded = Math.round(delta * 10) / 10;
  if (Math.abs(rounded) < 0.5) return { text: `tie · ±${Math.abs(rounded).toFixed(1)}`, tie: true };
  const sign = rounded > 0 ? "+" : "";
  return { text: `${sign}${rounded.toFixed(1)}`, tie: false };
}

export function MoatTwin({ a, b, moat_diff }: Props) {
  const aggregate = moat_diff.find((d) => d.axis === "aggregate");
  const axes = moat_diff.filter((d) => d.axis !== "aggregate");
  const head = formatHeadDelta(aggregate?.delta ?? null);
  // Canonical alphabetical compare path so the methodology page's
  // back-link round-trips correctly. Slugs come from the report rows.
  const [first, second] =
    a.report.slug < b.report.slug
      ? [a.report.slug, b.report.slug]
      : [b.report.slug, a.report.slug];
  const methodologyHref = `/methodology?from=${encodeURIComponent(`/compare/${first}-vs-${second}`)}`;

  return (
    <section className="bg-paper border-[2.5px] border-ink shadow-[6px_6px_0_0_var(--color-ink)] mb-0">
      <CardHead title="how deep is each moat." badge="moat">
        <div className="font-mono text-[10.5px] font-bold tracking-[0.18em] uppercase text-muted flex items-center gap-3">
          <span
            className={`px-2 py-[3px] border-2 border-ink shadow-[2px_2px_0_0_var(--color-ink)] tracking-[0.14em] ${
              head.tie ? "bg-accent text-ink" : "bg-ink text-accent"
            }`}
          >
            {head.text}
          </span>
          <a
            href={methodologyHref}
            className="text-ink no-underline border-b-2 border-ink pb-[1px] hover:text-coral hover:border-coral hidden sm:inline"
          >
            methodology →
          </a>
        </div>
      </CardHead>

      {/* Aggregate strip */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_130px_1fr] border-b-[2.5px] border-ink items-stretch">
        <AggCol side={a} delta={aggregate?.delta ?? null} variant="left" />
        <AggCenter delta={aggregate?.delta ?? null} />
        <AggCol side={b} delta={aggregate?.delta ?? null} variant="right" />
      </div>

      {/* Per-axis rows */}
      <div>
        {axes.map((axis, i) => (
          <AxisRow
            key={axis.axis}
            label={AXIS_LABELS[axis.axis as keyof typeof AXIS_LABELS]}
            a={axis.a}
            b={axis.b}
            delta={axis.delta}
            isLast={i === axes.length - 1}
          />
        ))}
      </div>
    </section>
  );
}

function CardHead({
  title,
  badge,
  badgeVariant = "ink",
  children,
}: {
  title: string;
  badge: string;
  badgeVariant?: "ink" | "coral" | "lime";
  children?: React.ReactNode;
}) {
  const badgeCls =
    badgeVariant === "coral"
      ? "bg-coral text-ink"
      : badgeVariant === "lime"
        ? "bg-accent text-ink"
        : "bg-ink text-accent";
  return (
    <div className="flex items-center justify-between gap-3.5 px-6 py-3.5 border-b-[2.5px] border-ink bg-bg">
      <div className="flex items-baseline gap-3">
        <span
          className={`px-2 py-1 font-mono text-[10.5px] font-bold tracking-[0.18em] uppercase ${badgeCls}`}
        >
          {badge}
        </span>
        <h3 className="font-display text-[22px] sm:text-[26px] font-bold m-0 tracking-[-0.02em]">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function AggCol({
  side,
  variant,
}: {
  side: CompareSide;
  delta: number | null;
  variant: "left" | "right";
}) {
  const score = side.report.moat?.aggregate ?? null;
  const pct = score != null ? Math.max(0, Math.min(100, score * 10)) : 0;
  return (
    <div className={`px-7 py-6 ${variant === "right" ? "bg-paper-alt" : ""}`}>
      <div className="font-mono text-[10.5px] font-bold tracking-[0.18em] uppercase text-muted mb-2 truncate">
        {side.report.name} · aggregate
      </div>
      <div className="flex items-baseline gap-2.5 font-display">
        <span className="text-[40px] md:text-[46px] font-bold tracking-[-0.04em] leading-none">
          {formatNum(score)}
        </span>
        <span className="text-[18px] opacity-40">/10</span>
        <span className="ml-auto font-mono text-[10.5px] font-bold tracking-[0.16em] uppercase text-muted whitespace-nowrap">
          {aggSeverityWord(score)}
        </span>
      </div>
      <div className="relative h-[10px] bg-bg border-2 border-ink mt-3">
        <i className="absolute inset-y-0 left-0 bg-ink block" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function AggCenter({ delta }: { delta: number | null }) {
  const text =
    delta == null
      ? "—"
      : Math.abs(delta) < 0.05
        ? "±0"
        : delta > 0
          ? `+${delta.toFixed(1)}`
          : delta.toFixed(1);
  return (
    <div className="bg-ink text-accent flex flex-col items-center justify-center gap-2 py-5 px-3 border-y-[2.5px] md:border-y-0 md:border-l-[2.5px] md:border-r-[2.5px] border-ink">
      <span className="font-mono text-[10px] font-bold tracking-[0.2em] uppercase opacity-70">
        moat delta
      </span>
      <span className="font-display text-[34px] md:text-[38px] font-bold tracking-[-0.03em] leading-none text-accent">
        {text}
      </span>
    </div>
  );
}

function AxisRow({
  label,
  a,
  b,
  delta,
  isLast,
}: {
  label: string;
  a: number | null;
  b: number | null;
  delta: number | null;
  isLast: boolean;
}) {
  const aPct = a != null ? Math.max(0, Math.min(100, a * 10)) : 0;
  const bPct = b != null ? Math.max(0, Math.min(100, b * 10)) : 0;
  const aFill = fillFor(a);
  const bFill = fillFor(b);
  const aZero = a == null || a < 1;
  const bZero = b == null || b < 1;
  const d = formatAxisDelta(delta);

  return (
    <div
      className={`grid grid-cols-1 md:grid-cols-[1fr_130px_1fr] items-stretch ${
        isLast ? "" : "border-b-[1.5px] border-bg"
      }`}
    >
      {/* LEFT — bar grows toward center (right-anchored) */}
      <div className="grid grid-cols-[1fr_56px] items-center gap-4 px-6 py-3.5">
        <div className="relative h-[14px] bg-bg border-2 border-ink overflow-hidden">
          <i
            className="absolute inset-y-0 right-0 block"
            style={{ width: `${aPct}%`, background: aFill }}
          />
        </div>
        <div
          className={`font-display text-[22px] font-bold tracking-[-0.03em] leading-none text-right ${
            aZero ? "text-muted opacity-60" : "text-ink"
          }`}
        >
          {formatNum(a)}
        </div>
      </div>

      {/* CENTER axis label + mini delta */}
      <div className="bg-bg border-y-[1.5px] md:border-y-0 md:border-l-[2.5px] md:border-r-[2.5px] border-ink px-2 py-3 flex flex-col items-center justify-center gap-1">
        <span className="font-mono text-[11px] font-bold tracking-[0.18em] uppercase">
          {label}
        </span>
        <span className={`font-mono text-[10px] font-bold tracking-[0.12em] ${d.cls}`}>
          {d.text}
        </span>
      </div>

      {/* RIGHT — bar grows from left (default) */}
      <div className="grid grid-cols-[56px_1fr] items-center gap-4 px-6 py-3.5 bg-paper-alt">
        <div
          className={`font-display text-[22px] font-bold tracking-[-0.03em] leading-none text-left ${
            bZero ? "text-muted opacity-60" : "text-ink"
          }`}
        >
          {formatNum(b)}
        </div>
        <div className="relative h-[14px] bg-bg border-2 border-ink overflow-hidden">
          <i
            className="absolute inset-y-0 left-0 block"
            style={{ width: `${bPct}%`, background: bFill }}
          />
        </div>
      </div>
    </div>
  );
}
