import Link from "next/link";
import type { Post } from "@/lib/blog/schema";
import { FEATURED_LABELS } from "@/lib/blog/content";
import { formatPostDate } from "@/lib/blog/formatters";

type Props = { post: Post };

export function FeaturedPost({ post }: Props) {
  const href = `/blog/${post.slug}`;
  return (
    <Link
      href={href}
      className="group grid grid-cols-[1.4fr_1fr] gap-7 pb-8 mb-8 border-b-[2.5px] border-ink no-underline text-ink max-[900px]:grid-cols-1"
    >
      {/* Yellow tile */}
      <div className="bru bg-sticky p-[28px_32px] min-h-[320px] flex flex-col gap-6 max-[480px]:p-[22px_24px] max-[480px]:min-h-0 max-[480px]:gap-5">
        <div className="flex justify-between items-baseline gap-3 font-mono text-[11px] font-bold tracking-[0.15em] uppercase max-[480px]:flex-col max-[480px]:items-start max-[480px]:gap-1">
          <span>{FEATURED_LABELS.eyebrow}</span>
          <span>{formatPostDate(post.date)}</span>
        </div>
        <div className="flex-1 flex items-center">
          <div className="font-display font-bold text-[clamp(28px,5vw,44px)] tracking-[-0.025em] leading-[1.05] text-balance">
            {`“${post.title}”`}
          </div>
        </div>
        <div className="flex items-end justify-between gap-3 font-mono text-[11px] max-[480px]:flex-col max-[480px]:items-stretch max-[480px]:gap-3">
          <div className="flex flex-wrap gap-2">
            {post.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="py-[3px] px-2 border-2 border-ink bg-paper"
              >
                #{t}
              </span>
            ))}
          </div>
          <span className="opacity-60 shrink-0 max-[480px]:text-right">{post.read_time} read</span>
        </div>
      </div>

      {/* Right column */}
      <div className="flex flex-col justify-between gap-5">
        <p className="font-display text-[19px] leading-[1.5] m-0 text-pretty">
          {post.excerpt}
        </p>
        <span className="self-start bg-ink text-accent font-display font-bold text-base py-3 px-[22px] tracking-[-0.01em] group-hover:translate-x-[2px] group-hover:translate-y-[2px] transition-transform duration-150">
          {FEATURED_LABELS.cta}
        </span>
      </div>
    </Link>
  );
}
