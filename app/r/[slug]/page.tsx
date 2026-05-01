import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VerdictReport } from "@/components/VerdictReport";
import { SimilarProducts } from "@/components/SimilarProducts";
import { TrackView } from "@/components/TrackView";
import { getReportBySlug } from "@/lib/db/reports";
import {
  reportTitle,
  reportOgTitle,
  reportDescription,
  reportCanonical,
} from "@/lib/seo/meta";
import { reportJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";

export const revalidate = 3600;
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { slug } = await params;
  const report = await getReportBySlug(slug);
  if (!report) {
    return { title: "verdict not found · saaspocalypse" };
  }

  const title = reportTitle(report);
  const ogTitle = reportOgTitle(report);
  const description = reportDescription(report);
  const canonical = reportCanonical(report.slug);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title: ogTitle,
      description,
      url: canonical,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
    },
  };
}

export default async function ReportPage({ params }: { params: Params }) {
  const { slug } = await params;
  const report = await getReportBySlug(slug);
  if (!report) notFound();

  return (
    <main className="bg-bg min-h-screen py-10">
      <div className="container">
        <VerdictReport
          report={report}
          comparisons={
            <SimilarProducts sourceId={report.id} sourceSlug={report.slug} />
          }
        />
        <TrackView slug={report.slug} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(reportJsonLd(report)) }}
        />
      </div>
    </main>
  );
}
