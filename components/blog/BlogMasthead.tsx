import { BLOG_MASTHEAD } from "@/lib/blog/content";
import { getAllPosts } from "@/lib/blog/posts";

export function BlogMasthead() {
  const count = getAllPosts().length;
  return (
    <div className="border-b-[2.5px] border-ink pb-6 mb-7">
      <div className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase opacity-60 mb-2.5">
        the blog · {count} posts on file · updated roughly weekly
      </div>
      <h1 className="font-display font-bold text-[clamp(48px,7vw,76px)] leading-[0.92] tracking-[-0.045em] m-0">
        {BLOG_MASTHEAD.title_lead}
        <br />
        <span className="bg-ink text-accent px-3.5 inline-block rotate-[-1.5deg]">
          {BLOG_MASTHEAD.highlight}
        </span>
      </h1>
      <p className="font-display text-base leading-[1.5] opacity-75 max-w-[640px] mt-5 mb-0">
        {BLOG_MASTHEAD.subtitle}
      </p>
    </div>
  );
}
