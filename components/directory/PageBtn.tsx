import Link from "next/link";
import type { ReactNode } from "react";

type Props = {
  href?: string;
  active?: boolean;
  disabled?: boolean;
  children: ReactNode;
};

export function PageBtn({ href, active, disabled, children }: Props) {
  const base =
    "px-3.5 py-[7px] border-2 border-ink font-mono text-xs font-bold tracking-[0.1em] uppercase no-underline";

  if (disabled || !href) {
    return (
      <span
        className={`${base} ${
          active ? "bg-ink text-accent" : "bg-paper text-ink"
        } opacity-40 cursor-not-allowed`}
      >
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      className={`${base} ${
        active ? "bg-ink text-accent" : "bg-paper text-ink hover:bg-bg"
      }`}
    >
      {children}
    </Link>
  );
}
