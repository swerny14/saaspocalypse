import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BlogShell } from "@/components/blog/BlogShell";
import { Breadcrumb } from "@/components/blog/Breadcrumb";
import { ArticleHeader } from "@/components/blog/ArticleHeader";
import { ArticleBody } from "@/components/blog/ArticleBody";
import { ArticleEndMatter } from "@/components/blog/ArticleEndMatter";
import { NewsletterBlock } from "@/components/blog/NewsletterBlock";
import {
  getAdjacentPosts,
  getPostBySlug,
  getPublishedPosts,
} from "@/lib/blog/posts";
import {
  blogPostCanonical,
  blogPostDescription,
  blogPostTitle,
} from "@/lib/seo/blogMeta";
import { blogPostJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";

export const revalidate = 3600;
export const dynamicParams = false;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  return getPublishedPosts().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post || !post.body) {
    return { title: "post not found · saaspocalypse" };
  }

  const title = blogPostTitle(post);
  const description = blogPostDescription(post);
  const canonical = blogPostCanonical(post.slug);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: post.title,
      description,
      url: canonical,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      tags: post.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
    },
  };
}

export default async function BlogPostPage({ params }: { params: Params }) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post || !post.body) notFound();

  const { prev, next } = getAdjacentPosts(slug);

  return (
    <BlogShell width="article">
      <Breadcrumb category={post.category} />
      <article>
        <ArticleHeader post={post} />
        <ArticleBody blocks={post.body} />
      </article>
      <ArticleEndMatter category={post.category} prev={prev} next={next} />
      <NewsletterBlock compact />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(blogPostJsonLd(post)) }}
      />
    </BlogShell>
  );
}
