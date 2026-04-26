import Link from "next/link";

type Props = {
  href: string;
  label: string;
  count: number;
  active?: boolean;
  disabled?: boolean;
  swatch?: string;
};

export function FilterRow({ href, label, count, active, disabled, swatch }: Props) {
  const base =
    "flex justify-between items-center px-2 py-[5px] font-mono text-xs font-bold tracking-[0.05em] uppercase border-[1.5px]";

  if (disabled) {
    return (
      <div
        className={`${base} border-transparent opacity-40 cursor-not-allowed`}
        aria-disabled
      >
        <span className="flex items-center gap-2">
          {swatch && (
            <span
              className="w-3 h-3 border-[1.5px] border-ink inline-block"
              style={{ background: swatch }}
            />
          )}
          {label}
        </span>
        <span className="opacity-50">{count}</span>
      </div>
    );
  }

  const activeCls = active
    ? "bg-ink text-accent border-ink"
    : "bg-transparent text-ink border-transparent hover:border-ink";

  return (
    <Link href={href} className={`${base} ${activeCls} no-underline`}>
      <span className="flex items-center gap-2">
        {swatch && (
          <span
            className={`w-3 h-3 border-[1.5px] inline-block ${
              active ? "border-accent" : "border-ink"
            }`}
            style={{ background: swatch }}
          />
        )}
        {label}
      </span>
      <span className={active ? "opacity-70" : "opacity-50"}>{count}</span>
    </Link>
  );
}
