/**
 * Small shared building blocks used by every section card on the compare
 * page. Kept private to the compare/ folder — do not import from elsewhere.
 */

export type BadgeVariant = "ink" | "coral" | "lime";
export type ColumnVariant = "a" | "b" | "shared";

export function CompareCard({ children }: { children: React.ReactNode }) {
  return (
    <section className="bg-paper border-[2.5px] border-ink shadow-[6px_6px_0_0_var(--color-ink)] overflow-hidden">
      {children}
    </section>
  );
}

export function CardHead({
  title,
  badge,
  badgeVariant = "ink",
  children,
}: {
  title: string;
  badge: string;
  badgeVariant?: BadgeVariant;
  children?: React.ReactNode;
}) {
  const badgeCls =
    badgeVariant === "coral"
      ? "bg-coral text-ink"
      : badgeVariant === "lime"
        ? "bg-accent text-ink"
        : "bg-ink text-accent";
  return (
    <div className="flex items-center justify-between gap-3.5 px-6 py-3.5 border-b-[2.5px] border-ink bg-bg flex-wrap">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className={`px-2 py-[3px] font-mono text-[10.5px] font-bold tracking-[0.18em] uppercase whitespace-nowrap leading-none ${badgeCls}`}
        >
          {badge}
        </span>
        {/* No `leading-none` on the H3 — collapsing its line-box throws off
            `items-center` because the badge's centerline ends up below the
            H3's cap-height. Natural line-height keeps the visible text
            centered against the badge. */}
        <h3 className="font-display text-[22px] sm:text-[26px] font-bold m-0 tracking-[-0.02em] truncate">
          {title}
        </h3>
      </div>
      {children && (
        <div className="font-mono text-[10.5px] font-bold tracking-[0.18em] uppercase text-muted flex items-center gap-3 flex-wrap">
          {children}
        </div>
      )}
    </div>
  );
}

export function CountBadge({
  count,
  variant,
}: {
  count: number;
  variant: ColumnVariant;
}) {
  const isZero = count === 0;
  const cls = isZero
    ? "bg-paper text-muted border-2 border-muted shadow-[3px_3px_0_0_#999]"
    : variant === "shared"
      ? "bg-accent text-ink shadow-[3px_3px_0_0_var(--color-ink)]"
      : variant === "a"
        ? "bg-coral text-ink shadow-[3px_3px_0_0_var(--color-ink)]"
        : "bg-purple text-ink shadow-[3px_3px_0_0_var(--color-ink)]";
  return (
    <span
      className={`font-display font-bold text-[28px] tracking-[-0.03em] leading-none px-2.5 py-1 ${cls}`}
    >
      {count}
    </span>
  );
}

export function TriptychCol({
  title,
  count,
  variant,
  emptyLine,
  children,
}: {
  title: string;
  count: number;
  variant: ColumnVariant;
  emptyLine?: string;
  children: React.ReactNode;
}) {
  const isShared = variant === "shared";
  return (
    <div
      className={`flex flex-col gap-3.5 px-5 py-4 md:px-6 md:py-[18px] min-h-[184px] border-r-[2.5px] border-ink last:border-r-0 max-md:border-r-0 max-md:border-b-[2.5px] max-md:last:border-b-0 ${
        isShared ? "bg-bg" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2.5">
        <span className="font-mono text-[10.5px] font-bold tracking-[0.18em] uppercase text-ink truncate">
          {title} · {count}
        </span>
        <CountBadge count={count} variant={variant} />
      </div>
      {children}
      {count === 0 && emptyLine && (
        <div className="font-mono text-[12px] text-muted mt-auto tracking-[0.05em]">
          {emptyLine}
        </div>
      )}
    </div>
  );
}

export function Tag({
  children,
  variant = "outline",
}: {
  children: React.ReactNode;
  variant?: "outline" | "solid-coral" | "solid-lime" | "solid-purple" | "solid-ink" | "muted";
}) {
  const cls =
    variant === "solid-coral"
      ? "bg-coral text-ink border-ink"
      : variant === "solid-lime"
        ? "bg-accent text-ink border-ink"
        : variant === "solid-purple"
          ? "bg-purple text-ink border-ink"
          : variant === "solid-ink"
            ? "bg-ink text-accent border-ink"
            : variant === "muted"
              ? "bg-transparent text-muted border-muted"
              : "bg-paper text-ink border-ink";
  return (
    <span
      className={`font-mono text-[11px] font-medium px-2 py-[3px] border-[1.5px] leading-[1.4] tracking-[0.02em] ${cls}`}
    >
      {children}
    </span>
  );
}
