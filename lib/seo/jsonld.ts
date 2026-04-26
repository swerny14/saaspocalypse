import type { StoredReport } from "@/lib/db/reports";
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
