import type { Metadata } from "next";
import { BlogShell } from "@/components/blog/BlogShell";
import { BlogIndex } from "@/components/blog/BlogIndex";
import {
  getFeaturedPost,
  getPostsByCategory,
} from "@/lib/blog/posts";
import { isBlogCategory, type BlogCategory } from "@/lib/blog/schema";
import {
  blogIndexCanonical,
  blogIndexDescription,
  blogIndexTitle,
} from "@/lib/seo/blogMeta";
import { blogIndexJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";

export const revalidate = 3600;

type Search = { cat?: string };
type Params = Promise<Search>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Params;
}): Promise<Metadata> {
  const { cat } = await searchParams;
  const baseTitle = blogIndexTitle();
  const title = isBlogCategory(cat)
    ? `${cat} — saaspocalypse blog`
    : baseTitle;
  const description = blogIndexDescription();
  const canonical = blogIndexCanonical();

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const { cat: catRaw } = await searchParams;
  const activeCat: BlogCategory | "all" = isBlogCategory(catRaw) ? catRaw : "all";
  const featured = getFeaturedPost();

  const allInCat = getPostsByCategory(activeCat);
  const showFeatured =
    activeCat === "all" || featured.category === activeCat;
  const posts = showFeatured
    ? allInCat.filter((p) => p.slug !== featured.slug)
    : allInCat;

  return (
    <BlogShell width="index">
      <BlogIndex
        featured={featured}
        posts={posts}
        activeCat={activeCat}
        showFeatured={showFeatured}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(blogIndexJsonLd()) }}
      />
    </BlogShell>
  );
}
