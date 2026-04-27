import Link from "next/link";
import type { Post } from "@/lib/blog/schema";
import { formatPostDate } from "@/lib/blog/formatters";

type Props = { post: Post };

export function PostCard({ post }: Props) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group border-[2.5px] border-ink bg-paper p-[20px_22px] min-h-[260px] flex flex-col gap-3 no-underline text-ink transition-all duration-150 hover:-translate-x-[2px] hover:-translate-y-[2px] hover:shadow-[4px_4px_0_0_var(--color-ink)]"
    >
      <div className="text-right font-mono text-[10px] font-bold tracking-[0.15em] uppercase opacity-70">
        {formatPostDate(post.date)}
      </div>

      <h3 className="font-display font-bold text-[22px] tracking-[-0.015em] leading-[1.15] text-balance m-0">
        {post.title}
      </h3>

      <p className="font-display text-sm leading-[1.55] opacity-75 m-0 flex-1">
        {post.excerpt}
      </p>

      <div className="flex justify-between items-center border-t border-dashed border-ink pt-2.5 font-mono text-[10px] opacity-65">
        <div className="flex gap-1.5 truncate">
          {post.tags.slice(0, 2).map((t) => (
            <span key={t}>#{t}</span>
          ))}
        </div>
        <span className="shrink-0">{post.read_time}</span>
      </div>
    </Link>
  );
}
