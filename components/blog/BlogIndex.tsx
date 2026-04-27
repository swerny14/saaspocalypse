import type { Post, BlogCategory } from "@/lib/blog/schema";
import { BlogMasthead } from "./BlogMasthead";
import { FeaturedPost } from "./FeaturedPost";
import { CategoryChips } from "./CategoryChips";
import { PostCard } from "./PostCard";
import { NewsletterBlock } from "./NewsletterBlock";

type Props = {
  featured: Post;
  posts: Post[];
  activeCat: BlogCategory | "all";
  showFeatured: boolean;
};

export function BlogIndex({ featured, posts, activeCat, showFeatured }: Props) {
  return (
    <>
      <BlogMasthead />
      {showFeatured && <FeaturedPost post={featured} />}
      <CategoryChips active={activeCat} />

      {posts.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-3 gap-4 max-[900px]:grid-cols-2 max-[640px]:grid-cols-1">
          {posts.map((p) => (
            <PostCard key={p.slug} post={p} />
          ))}
        </div>
      )}

      <NewsletterBlock />
    </>
  );
}

function EmptyState() {
  return (
    <div className="border-[2.5px] border-ink bg-paper p-10 text-center">
      <h2 className="font-display font-bold text-2xl m-0 tracking-[-0.02em]">
        Nothing filed under that yet.
      </h2>
      <p className="font-display text-[15px] opacity-70 mt-2 mb-0">
        Try a different category.
      </p>
    </div>
  );
}
