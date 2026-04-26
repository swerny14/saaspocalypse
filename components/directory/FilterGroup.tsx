import type { ReactNode } from "react";

export function FilterGroup({
  title,
  children,
  last,
}: {
  title: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`border-t-[2.5px] border-ink pt-3.5 pb-[18px] ${
        last ? "border-b-[2.5px]" : ""
      }`}
    >
      <div className="font-mono text-[11px] font-bold tracking-[0.18em] uppercase mb-3">
        ▸ {title}
      </div>
      {children}
    </div>
  );
}
