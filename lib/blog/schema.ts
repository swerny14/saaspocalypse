export const BLOG_CATEGORIES = ["essays", "build-log", "confessions"] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export type BlogBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "callout"; text: string };

export type Post = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  read_time: string;
  tags: string[];
  category: BlogCategory;
  author: "saaspocalypse";
  featured?: boolean;
  body?: BlogBlock[];
};

export const CATEGORY_LABELS: Record<BlogCategory | "all", string> = {
  all: "all",
  essays: "essays",
  "build-log": "build-log",
  confessions: "confessions",
};

export function isBlogCategory(s: string | undefined): s is BlogCategory {
  return !!s && (BLOG_CATEGORIES as readonly string[]).includes(s);
}
