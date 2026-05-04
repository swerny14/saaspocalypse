import type { MetadataRoute } from "next";
import { getAllReportsForSitemap } from "@/lib/db/reports";
import { getAllNeighborPairs } from "@/lib/db/neighbors";
import { getAllPosts, getPublishedPosts } from "@/lib/blog/posts";
import { LEADERBOARD_SLUGS } from "@/lib/db/leaderboards";
import { SITE_URL } from "@/lib/seo/meta";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [reports, neighborPairs] = await Promise.all([
    getAllReportsForSitemap(),
    getAllNeighborPairs(),
  ]);
  const allPosts = getAllPosts();
  const publishedPosts = getPublishedPosts();
  const newestPostDate = allPosts[0]?.date;

  const staticEntries: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      changeFrequency: "daily",
      priority: 1.0,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/directory`,
      changeFrequency: "daily",
      priority: 0.9,
      lastModified: new Date(),
    },
    {
      url: `${SITE_URL}/blog`,
      changeFrequency: "weekly",
      priority: 0.8,
      lastModified: newestPostDate ? new Date(newestPostDate) : new Date(),
    },
    {
      url: `${SITE_URL}/methodology`,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${SITE_URL}/terms`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/privacy`,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const reportEntries: MetadataRoute.Sitemap = reports.map((r) => ({
    url: `${SITE_URL}/r/${r.slug}`,
    changeFrequency: "weekly",
    priority: 0.7,
    lastModified: new Date(r.updated_at),
  }));

  const blogEntries: MetadataRoute.Sitemap = publishedPosts.map((p) => ({
    url: `${SITE_URL}/blog/${p.slug}`,
    changeFrequency: "monthly",
    priority: 0.6,
    lastModified: new Date(p.date),
  }));

  const compareEntries: MetadataRoute.Sitemap = neighborPairs.map((p) => ({
    url: `${SITE_URL}/compare/${p.slugA}-vs-${p.slugB}`,
    changeFrequency: "weekly",
    priority: 0.65,
    lastModified: new Date(p.lastModified),
  }));

  const leaderboardEntries: MetadataRoute.Sitemap = LEADERBOARD_SLUGS.map((slug) => ({
    url: `${SITE_URL}/leaderboards/${slug}`,
    changeFrequency: "daily",
    priority: 0.8,
    lastModified: new Date(),
  }));

  return [
    ...staticEntries,
    ...reportEntries,
    ...blogEntries,
    ...compareEntries,
    ...leaderboardEntries,
  ];
}
