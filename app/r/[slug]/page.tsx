import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { VerdictReport } from "@/components/VerdictReport";
import { getReportBySlug } from "@/lib/db/reports";

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

  const title = `${report.name} — ${report.tier}, ${report.score}/100 · saaspocalypse`;
  const description =
    report.take.length > 180 ? `${report.take.slice(0, 177)}…` : report.take;
  const canonical = `/r/${report.slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: "article",
    },
    twitter: {
      card: "summary_large_image",
      title,
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
        <VerdictReport report={report} />
      </div>
    </main>
  );
}
