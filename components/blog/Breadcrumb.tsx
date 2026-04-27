import Link from "next/link";
import type { BlogCategory } from "@/lib/blog/schema";

type Props = { category: BlogCategory };

export function Breadcrumb({ category }: Props) {
  return (
    <nav
      aria-label="Breadcrumb"
      className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase opacity-60 mb-7"
    >
      <Link href="/blog" className="text-ink no-underline hover:underline">
        ← blog
      </Link>
      <span>&nbsp;/&nbsp;</span>
      <Link
        href={`/blog?cat=${category}`}
        className="text-ink no-underline hover:underline"
      >
        {category}
      </Link>
      <span>&nbsp;/&nbsp;</span>
      <span className="opacity-60">this one</span>
    </nav>
  );
}
