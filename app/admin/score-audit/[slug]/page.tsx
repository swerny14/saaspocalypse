import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/auth";
import { getReportBySlug } from "@/lib/db/reports";
import { getScoreExpectationMap } from "@/lib/db/score_expectations";
import { computeScoreAudit } from "@/lib/normalization/score_audit";
import { scoreExpectationHash } from "@/lib/normalization/score_expectation_llm";
import {
  getAllScoringPatterns,
  getAllScoringWeights,
} from "@/lib/db/scoring_config";
import { ScoreAuditDrilldown } from "./Drilldown";
import { loadEngineContextFromDb } from "@/lib/db/taxonomy_loader";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

export default async function ScoreAuditDetailPage({
  params,
}: {
  params: Params;
}) {
  if (!(await isAdmin())) {
    const { slug } = await params;
    redirect(`/admin/login?next=/admin/score-audit/${slug}`);
  }
  const { slug } = await params;
  const report = await getReportBySlug(slug);
  if (!report) notFound();

  const [{ context, capabilities }, allPatterns, allWeights, expectations] = await Promise.all([
    loadEngineContextFromDb(),
    getAllScoringPatterns(),
    getAllScoringWeights(),
    getScoreExpectationMap([report.id]),
  ]);
  const auditResult = await computeScoreAudit(report, {
    context,
    catalog: capabilities,
  });
  const expectation = expectations.get(report.id) ?? null;
  const expectationStale =
    !!expectation &&
    !!report.moat &&
    (expectation.rubric_version !== report.moat.rubric_version ||
      expectation.verdict_hash !== scoreExpectationHash(report));

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-5">
        <Link
          href="/admin/score-audit"
          className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-60 no-underline text-ink hover:text-coral"
        >
          ← score workbench
        </Link>
      </div>

      <ScoreAuditDrilldown
        report={{
          id: report.id,
          slug: report.slug,
          name: report.name,
          tagline: report.tagline,
          domain: report.domain,
          tier: report.tier,
          wedge_score: report.wedge_score,
          wedge_thesis: report.wedge_thesis,
          take: report.take,
          take_sub: report.take_sub,
          review_status: report.moat?.review_status ?? "pending",
          audit_summary: report.moat?.audit_summary ?? null,
          audit_suggestions: report.moat?.audit_suggestions ?? null,
        }}
        moat={auditResult.score}
        breakdown={auditResult.breakdown}
        patterns={allPatterns.map((p) => ({
          id: p.id,
          axis: p.axis,
          kind: p.kind,
          pattern: p.pattern,
          status: p.status,
          evidence: p.evidence,
          added_by: p.added_by,
          added_at: p.added_at,
        }))}
        weights={allWeights.map((w) => ({
          key: w.key,
          value: w.value,
          description: w.description,
        }))}
        scoreExpectation={
          expectation
            ? {
                rubric_version: expectation.rubric_version,
                verdict_hash: expectation.verdict_hash,
                bands: expectation.bands,
                rationale: expectation.rationale,
                flags: expectation.flags,
                generated_at: expectation.generated_at,
                stale: expectationStale,
              }
            : null
        }
        capabilities={capabilities.map((c) => ({
          slug: c.slug,
          display_name: c.display_name,
          category: c.category,
          pattern_count: c.match_patterns.length,
          moat_tags: c.moat_tags,
        }))}
      />
    </div>
  );
}
