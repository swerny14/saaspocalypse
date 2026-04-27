import type { Post } from "@/lib/blog/schema";
import { formatPostDate } from "@/lib/blog/formatters";

type Props = { post: Post };

export function ArticleHeader({ post }: Props) {
  return (
    <header className="mb-8">
      <div className="flex flex-wrap gap-2 mb-[18px]">
        {post.tags.map((t) => (
          <span
            key={t}
            className="font-mono text-[11px] font-bold py-[3px] px-2.5 border-2 border-ink bg-accent tracking-[0.05em]"
          >
            #{t}
          </span>
        ))}
      </div>
      <h1 className="font-display font-bold text-[clamp(36px,7vw,56px)] leading-[1.0] tracking-[-0.03em] text-balance m-0">
        {post.title}
      </h1>
      <div className="flex flex-wrap gap-x-[22px] gap-y-1 font-mono text-xs font-bold tracking-[0.1em] uppercase opacity-70 pt-4 border-t border-ink mt-5">
        <span>by {post.author}</span>
        <span>{formatPostDate(post.date)}</span>
        <span>{post.read_time} read</span>
        <span className="ml-auto opacity-50">scroll for more cope</span>
      </div>
    </header>
  );
}
