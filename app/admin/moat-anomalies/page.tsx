import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/auth";
import { getAllReports } from "@/lib/db/reports";
import { getAllCapabilities } from "@/lib/db/capabilities";
import { detectAnomalies } from "@/lib/normalization/moat_anomalies";
import { AnomalyTriage, type CapabilityOption, type FlaggedRow } from "./AnomalyTriage";
import { RecomputeAllButton } from "./RecomputeAllButton";

export const dynamic = "force-dynamic";

export default async function MoatAnomaliesPage() {
  if (!(await isAdmin())) redirect("/admin/login?next=/admin/moat-anomalies");

  const [reports, capabilities] = await Promise.all([
    getAllReports(10_000),
    getAllCapabilities(),
  ]);

  const flagged = detectAnomalies(reports);
  const flaggedBySlug = new Map(flagged.map((f) => [f.report.slug, f]));
  const totalScored = reports.filter((r) => r.moat).length;

  const capabilityOptions: CapabilityOption[] = capabilities.map((c) => ({
    slug: c.slug,
    display_name: c.display_name,
    category: c.category,
    pattern_count: c.match_patterns.length,
    moat_tags: c.moat_tags,
  }));

  // Build rows for EVERY scored report — flagged ones carry their anomaly
  // list, unflagged ones come through with empty anomalies. The client
  // component filters which subset to render based on toggle state, so the
  // curator can always sweep manually beyond the heuristic-flagged set.
  const allRows: FlaggedRow[] = reports
    .filter((r) => r.moat)
    .map((r) => {
      const flag = flaggedBySlug.get(r.slug);
      return {
        slug: r.slug,
        name: r.name,
        tagline: r.tagline,
        tier: r.tier,
        score: r.score,
        moat: {
          aggregate: r.moat!.aggregate,
          capital: r.moat!.capital,
          technical: r.moat!.technical,
          network: r.moat!.network,
          switching: r.moat!.switching,
          data_moat: r.moat!.data_moat,
          regulatory: r.moat!.regulatory,
        },
        review_status: r.moat!.review_status,
        reviewed_at: r.moat!.reviewed_at,
        audit_summary: r.moat!.audit_summary,
        audit_suggestions: r.moat!.audit_suggestions,
        audited_at: r.moat!.audited_at,
        anomalies: (flag?.anomalies ?? []).map((a) => ({
          reason: a.reason,
          explanation: a.explanation,
          axes: a.axes,
        })),
        verdict_excerpt: {
          take: r.take,
          take_sub: r.take_sub,
          challenges: r.challenges.map((c) => ({
            diff: c.diff,
            name: c.name,
            note: c.note,
          })),
          est_cost_lines: r.est_cost.map((l) => ({
            line: l.line,
            cost: typeof l.cost === "number" ? l.cost.toString() : l.cost,
          })),
        },
      };
    });

  // Default-view anomaly rows = flagged + still pending review.
  const pendingAnomalyCount = allRows.filter(
    (r) => r.anomalies.length > 0 && r.review_status === "pending",
  ).length;
  const verifiedAnomalyCount = allRows.filter(
    (r) => r.anomalies.length > 0 && r.review_status === "verified",
  ).length;
  const nonAnomalyCount = allRows.filter((r) => r.anomalies.length === 0).length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-ink">Moat anomalies</h1>
        <p className="mt-1 text-sm text-muted">
          Reports whose moat score and buildability tier don&apos;t agree with each
          other. Usually means the verdict text uses phrasing the current
          capability patterns don&apos;t match — fix by adding a pattern to an
          existing capability, or promoting a new capability when the gap is
          structural.
        </p>
        <p className="mt-2 text-xs text-muted">
          {pendingAnomalyCount} flagged + pending · {verifiedAnomalyCount}{" "}
          flagged + verified · {nonAnomalyCount} no anomaly ·{" "}
          {totalScored} reports scored · {reports.length - totalScored} unscored.
          Switch queues below to triage pending vs. inspect already-verified
          rows; &ldquo;Mark verified&rdquo; moves a row into the verified queue.
        </p>
      </div>

      <div className="mb-5">
        <RecomputeAllButton />
      </div>

      {totalScored === 0 ? (
        <div className="bru bg-paper-alt p-6 text-center text-sm text-muted">
          No reports scored yet. Run recompute to populate moat scores.
        </div>
      ) : (
        <AnomalyTriage rows={allRows} capabilities={capabilityOptions} />
      )}
    </div>
  );
}
