import type { StoredReport } from "@/lib/db/reports";
import type { Post } from "@/lib/blog/schema";
import { SITE_URL, BRAND } from "./meta";

type JsonLd = Record<string, unknown>;

/**
 * Stringify + escape `<` so the JSON payload can't break out of the surrounding
 * <script> tag if a take ever contains the literal "</script>".
 */
export function serializeJsonLd(value: JsonLd): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

export function landingJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}#website`,
        url: SITE_URL,
        name: BRAND,
        description:
          "Paste any SaaS URL. We'll tell you if it's a weekend or a life sentence. Buildability score, stack receipt, time-to-clone, and a snarky one-liner.",
        potentialAction: {
          "@type": "SearchAction",
          target: {
            "@type": "EntryPoint",
            urlTemplate: `${SITE_URL}/?url={search_term_string}`,
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}#organization`,
        url: SITE_URL,
        name: BRAND,
        logo: `${SITE_URL}/images/logo.png`,
        sameAs: [],
      },
    ],
  };
}

export function blogIndexJsonLd(): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Blog",
    "@id": `${SITE_URL}/blog#blog`,
    url: `${SITE_URL}/blog`,
    name: `${BRAND} blog`,
    description:
      "Field notes from indie hackers who probably shouldn't be left alone with a dev server.",
    publisher: {
      "@type": "Organization",
      name: BRAND,
      url: SITE_URL,
    },
  };
}

export function blogPostJsonLd(post: Post): JsonLd {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const articleBody = post.body
    ? post.body
        .filter((b) => b.type === "p" || b.type === "callout")
        .map((b) => b.text)
        .join("\n\n")
    : undefined;

  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    mainEntityOfPage: url,
    url,
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    dateModified: post.date,
    author: {
      "@type": "Organization",
      name: BRAND,
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: BRAND,
      url: SITE_URL,
      logo: `${SITE_URL}/images/logo.png`,
    },
    keywords: post.tags.join(", "),
    articleSection: post.category,
    ...(articleBody ? { articleBody } : {}),
  };
}

export function reportJsonLd(report: StoredReport): JsonLd {
  return {
    "@context": "https://schema.org",
    "@type": "Review",
    url: `${SITE_URL}/r/${report.slug}`,
    headline: report.take,
    reviewBody: report.take_sub,
    datePublished: report.created_at,
    author: {
      "@type": "Organization",
      name: BRAND,
      url: SITE_URL,
    },
    itemReviewed: {
      "@type": "SoftwareApplication",
      name: report.name,
      applicationCategory: "BusinessApplication",
      url: `https://${report.domain}`,
    },
    reviewRating: {
      "@type": "Rating",
      ratingValue: report.score,
      bestRating: 100,
      worstRating: 0,
    },
  };
}
