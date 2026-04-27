import type { Post } from "@/lib/blog/schema";
import { SITE_URL, BRAND } from "./meta";

const BLOG_DESCRIPTION =
  "Field notes from indie hackers who probably shouldn't be left alone with a dev server. Essays, build logs, and confessions from the saaspocalypse.";

export function blogIndexTitle(): string {
  return `Blog — field notes from the apocalypse · ${BRAND}`;
}

export function blogIndexDescription(): string {
  return BLOG_DESCRIPTION;
}

export function blogIndexCanonical(): string {
  return `${SITE_URL}/blog`;
}

export function blogPostTitle(post: Post): string {
  return `${post.title} — ${BRAND} blog`;
}

export function blogPostDescription(post: Post): string {
  const max = 155;
  const e = post.excerpt.trim();
  if (e.length <= max) return e;
  const sliced = e.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  const cut = lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced;
  return `${cut.trimEnd()}…`;
}

export function blogPostCanonical(slug: string): string {
  return `${SITE_URL}/blog/${slug}`;
}
