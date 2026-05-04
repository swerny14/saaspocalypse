import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getComparePair } from "@/lib/db/compare";
import { diffPair } from "@/lib/normalization/compare";
import { computeCompareVerdict } from "@/lib/normalization/compare_verdict";
import { TitleBlock } from "@/components/compare/TitleBlock";
import { VerdictTwin } from "@/components/compare/VerdictTwin";
import { MoatTwin } from "@/components/compare/MoatTwin";
import { CapabilityDiff } from "@/components/compare/CapabilityDiff";
import { StackDiff } from "@/components/compare/StackDiff";
import { CostStrip } from "@/components/compare/CostStrip";
import { VerdictBand } from "@/components/compare/VerdictBand";
import { CompareFooter } from "@/components/compare/CompareFooter";
import {
  compareCanonical,
  comparePageTitle,
  comparePageOgTitle,
  comparePageDescription,
} from "@/lib/seo/meta";
import { comparePageJsonLd, serializeJsonLd } from "@/lib/seo/jsonld";

export const revalidate = 3600;
export const dynamicParams = true;

type Params = Promise<{ pair: string }>;

/**
 * Parse `<a>-vs-<b>` into two slugs. Returns null when the URL doesn't have
 * exactly one ` -vs- ` separator — multi-`-vs-` URLs are rejected as 404 to
 * keep the routing surface unambiguous (we don't have any slugs containing
 * `-vs-` today, and the page is too important an SEO surface to risk
 * mis-parsing).
 */
function parsePair(pair: string): { a: string; b: string } | null {
  const parts = pair.split("-vs-");
  if (parts.length !== 2) return null;
  const [a, b] = parts;
  if (!a || !b) return null;
  return { a, b };
}

export async function generateMetadata({
  params,
}: {
  params: Params;
}): Promise<Metadata> {
  const { pair } = await params;
  const parsed = parsePair(pair);
  if (!parsed) return { title: "comparison not found · saaspocalypse" };
  const { a, b } = parsed;
  if (a === b || a > b) {
    return { title: "comparison not found · saaspocalypse" };
  }
  const comparePair = await getComparePair(a, b);
  if (!comparePair) return { title: "comparison not found · saaspocalypse" };

  const title = comparePageTitle(comparePair.a.report, comparePair.b.report);
  const ogTitle = comparePageOgTitle(comparePair.a.report, comparePair.b.report);
  const description = comparePageDescription(
    comparePair.a.report,
    comparePair.b.report,
  );
  const canonical = compareCanonical(comparePair.a.report.slug, comparePair.b.report.slug);

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

export default async function ComparePage({ params }: { params: Params }) {
  const { pair } = await params;
  const parsed = parsePair(pair);
  if (!parsed) notFound();

  const { a, b } = parsed;
  if (a === b) notFound();

  if (a > b) redirect(`/compare/${b}-vs-${a}`);

  const comparePair = await getComparePair(a, b);
  if (!comparePair) notFound();

  const diff = diffPair(comparePair);
  const verdict = computeCompareVerdict(comparePair, diff);

  const aName = comparePair.a.report.name;
  const bName = comparePair.b.report.name;

  return (
    <main className="bg-bg min-h-screen">
      <div className="max-w-[1200px] mx-auto px-5 sm:px-7 py-10">
        {/* breadcrumb top rail */}
        <div className="pb-4 font-mono text-[11px] font-medium tracking-[0.18em] uppercase text-muted">
          <a href="/directory" className="text-muted no-underline hover:text-ink">
            ← directory
          </a>
          <span className="opacity-40 px-1.5">/</span>
          <span>compare</span>
        </div>

        <TitleBlock aName={aName} bName={bName} />

        {/* Evidence sections — each card builds toward the verdict band
            below. Order: scores → walls → cost → features → plumbing →
            verdict. Concrete numbers first, abstract walls next, with
            the verdict resolving the page at the bottom. */}
        <div className="flex flex-col gap-7 sm:gap-9">
          <VerdictTwin
            a={comparePair.a}
            b={comparePair.b}
            score_delta={diff.score_delta}
          />
          <MoatTwin
            a={comparePair.a}
            b={comparePair.b}
            moat_diff={diff.moat_diff}
          />
          <CostStrip
            a={comparePair.a}
            b={comparePair.b}
            cost_delta={diff.cost_delta}
          />
          <CapabilityDiff
            diff={diff.capability_diff}
            aName={aName}
            bName={bName}
          />
          <StackDiff
            diffAll={diff.stack_diff_all}
            aName={aName}
            bName={bName}
          />
          <VerdictBand verdict={verdict} />
        </div>

        <CompareFooter a={comparePair.a} b={comparePair.b} />

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: serializeJsonLd(
              comparePageJsonLd(comparePair.a.report, comparePair.b.report),
            ),
          }}
        />
      </div>
    </main>
  );
}
