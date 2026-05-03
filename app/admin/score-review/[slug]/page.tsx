import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/auth";
import { getReportBySlug } from "@/lib/db/reports";
import { computeScoreReview } from "@/lib/normalization/score_review";
import { ScoreReviewDrilldown } from "./Drilldown";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export default async function ScoreReviewDetailPage({
  params,
}: {
  params: Params;
}) {
  if (!(await isAdmin())) {
    const { slug } = await params;
    redirect(`/admin/login?next=/admin/score-review/${slug}`);
  }
  const { slug } = await params;
  const report = await getReportBySlug(slug);
  if (!report) notFound();

  const auditResult = await computeScoreReview(report);
  if (!report.moat) notFound();

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5">
        <Link
          href="/admin/score-review"
          className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-60 no-underline text-ink hover:text-coral"
        >
          &lt;- score review
        </Link>
      </div>

      <ScoreReviewDrilldown
        report={{
          slug: report.slug,
          name: report.name,
          tagline: report.tagline,
          tier: report.tier,
          wedge_score: report.wedge_score,
          wedge_thesis: report.wedge_thesis,
          take: report.take,
          take_sub: report.take_sub,
          review_status: report.moat?.review_status ?? "pending",
        }}
        moat={report.moat}
        distribution={auditResult.breakdown.distribution}
        scoreJudgment={report.moat?.score_judgment ?? null}
      />
    </div>
  );
}
