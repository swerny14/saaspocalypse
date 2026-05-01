import type { BlogCategory, Post } from "../schema";
import { post as notionClone14Hours } from "./notion-clone-14-hours";
import { post as noOriginalSaasIdeas } from "./no-original-saas-ideas";
import { post as buildVsBuySolo } from "./build-vs-buy-solo";
import { post as slowTaxOfStacks } from "./slow-tax-of-stacks";

const RAW_POSTS: Post[] = [
  notionClone14Hours,
  noOriginalSaasIdeas,
  buildVsBuySolo,
  slowTaxOfStacks,
];

const POSTS: Post[] = [...RAW_POSTS].sort(
  (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
);

const featured = POSTS.filter((p) => p.featured);
if (featured.length !== 1) {
  throw new Error(
    `lib/blog/posts: expected exactly one featured post, found ${featured.length}.`,
  );
}

export function getAllPosts(): Post[] {
  return POSTS;
}

export function getPostBySlug(slug: string): Post | null {
  return POSTS.find((p) => p.slug === slug) ?? null;
}

export function getFeaturedPost(): Post {
  return featured[0];
}

export function getPostsByCategory(cat: BlogCategory | "all"): Post[] {
  if (cat === "all") return POSTS;
  return POSTS.filter((p) => p.category === cat);
}

export function getPublishedPosts(): Post[] {
  return POSTS.filter((p) => Array.isArray(p.body) && p.body.length > 0);
}

export function getAdjacentPosts(slug: string): {
  prev: Post | null;
  next: Post | null;
} {
  const published = getPublishedPosts();
  const i = published.findIndex((p) => p.slug === slug);
  if (i === -1) return { prev: null, next: null };
  return {
    prev: i + 1 < published.length ? published[i + 1] : null,
    next: i > 0 ? published[i - 1] : null,
  };
}
