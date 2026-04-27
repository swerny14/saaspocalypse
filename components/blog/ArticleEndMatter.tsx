import Link from "next/link";
import type { Post } from "@/lib/blog/schema";

type Props = {
  category: Post["category"];
  prev: Post | null;
  next: Post | null;
};

export function ArticleEndMatter({ category, prev, next }: Props) {
  return (
    <div className="border-t-[2.5px] border-ink mt-10 pt-6 flex flex-wrap justify-between items-center gap-4">
      <div className="font-mono text-xs opacity-70">
        ▸ filed under:{" "}
        <Link
          href={`/blog?cat=${category}`}
          className="font-bold opacity-100 text-ink no-underline hover:underline"
        >
          {category}
        </Link>
      </div>
      <div className="flex gap-2.5">
        <NavBtn href={prev ? `/blog/${prev.slug}` : null} variant="prev">
          ← prev
        </NavBtn>
        <NavBtn href={next ? `/blog/${next.slug}` : null} variant="next">
          next →
        </NavBtn>
      </div>
    </div>
  );
}

function NavBtn({
  href,
  variant,
  children,
}: {
  href: string | null;
  variant: "prev" | "next";
  children: React.ReactNode;
}) {
  const base =
    "font-mono text-xs font-bold tracking-[0.1em] uppercase py-2 px-3.5 border-2 border-ink no-underline";
  const palette =
    variant === "next" ? "bg-ink text-accent" : "bg-paper text-ink";
  if (!href) {
    return (
      <span
        aria-disabled="true"
        className={`${base} ${palette} opacity-40 cursor-not-allowed`}
      >
        {children}
      </span>
    );
  }
  return (
    <Link href={href} className={`${base} ${palette}`}>
      {children}
    </Link>
  );
}
