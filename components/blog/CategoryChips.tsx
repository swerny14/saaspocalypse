import Link from "next/link";
import { BLOG_CATEGORIES, type BlogCategory } from "@/lib/blog/schema";
import { CHIP_LABEL } from "@/lib/blog/content";

type Props = { active: BlogCategory | "all" };

const ITEMS: ReadonlyArray<{ key: BlogCategory | "all"; label: string }> = [
  { key: "all", label: "all" },
  ...BLOG_CATEGORIES.map((c) => ({ key: c, label: c })),
];

export function CategoryChips({ active }: Props) {
  return (
    <div className="flex items-center flex-wrap gap-2 mb-[22px]">
      <span className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase opacity-50 mr-1.5">
        {CHIP_LABEL}
      </span>
      {ITEMS.map(({ key, label }) => {
        const href = key === "all" ? "/blog" : `/blog?cat=${key}`;
        const isActive = key === active;
        const cls = isActive
          ? "bg-ink text-accent"
          : "bg-paper text-ink hover:bg-ink hover:text-accent";
        return (
          <Link
            key={key}
            href={href}
            className={`${cls} no-underline font-mono text-[12px] font-bold py-[5px] px-3 border-2 border-ink tracking-[0.05em] transition-colors duration-150`}
          >
            {label}
          </Link>
        );
      })}
    </div>
  );
}
