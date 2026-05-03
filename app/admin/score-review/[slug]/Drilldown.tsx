"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Tier = "SOFT" | "CONTESTED" | "FORTRESS";

type Axis =
  | "capital"
  | "technical"
  | "network"
  | "switching"
  | "data_moat"
  | "regulatory"
  | "distribution";

type ReportSummary = {
  slug: string;
  name: string;
  tagline: string;
  tier: Tier;
  wedge_score: number;
  wedge_thesis: string;
  take: string;
  take_sub: string;
  review_status: "pending" | "verified";
};

type MoatScore = {
  rubric_version: number;
  capital: number;
  technical: number;
  network: number;
  switching: number;
  data_moat: number;
  regulatory: number;
  distribution: number | null;
  aggregate: number;
};

type AxisJudgment = {
  score: number;
  confidence: "low" | "medium" | "high";
  rationale: string;
  evidence: string[];
};

type ScoreJudgment = {
  axes: Partial<Record<Exclude<Axis, "distribution">, AxisJudgment>>;
};

type DistributionBreakdown = {
  sub_signals: Array<{
    name: string;
    raw_value: unknown;
    weight: number;
    score: number;
  }>;
  total_weighted: number;
  total_weight: number;
} | null;

type Props = {
  report: ReportSummary;
  moat: MoatScore;
  distribution: DistributionBreakdown;
  scoreJudgment: ScoreJudgment | null;
};

const AXES: Axis[] = [
  "capital",
  "technical",
  "network",
  "switching",
  "data_moat",
  "regulatory",
  "distribution",
];

const LLM_AXES = AXES.filter((axis) => axis !== "distribution") as Array<
  Exclude<Axis, "distribution">
>;

export function ScoreReviewDrilldown({
  report,
  moat,
  distribution,
  scoreJudgment,
}: Props) {
  const [busy, setBusy] = useState<null | "recompute" | "distribution" | "review">(
    null,
  );
  const [message, setMessage] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState(report.review_status);
  const [, startTransition] = useTransition();
  const router = useRouter();

  async function recomputeOne() {
    setBusy("recompute");
    setMessage(null);
    try {
      const res = await fetch("/api/admin/score-review/recompute", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: report.slug }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) setMessage(json.error ?? `recompute failed (${res.status})`);
      else startTransition(() => router.refresh());
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "recompute failed");
    } finally {
      setBusy(null);
    }
  }

  async function refreshDistribution() {
    setBusy("distribution");
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/reports/${report.slug}/distribution`, {
        method: "POST",
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setMessage(json.message ?? `distribution refresh failed (${res.status})`);
      } else {
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "distribution refresh failed");
    } finally {
      setBusy(null);
    }
  }

  async function setReview(status: "pending" | "verified") {
    setBusy("review");
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/reports/${report.slug}/moat-review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) setMessage(json.message ?? `review failed (${res.status})`);
      else {
        setReviewStatus(status);
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "review failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="bru bg-paper px-5 py-4 mb-5">
        <div className="flex items-baseline justify-between gap-3 mb-1 flex-wrap">
          <h1 className="font-display text-[24px] font-bold tracking-[-0.02em] m-0">
            {report.name}
          </h1>
          <div className="flex items-baseline gap-3 font-mono text-[11px] tracking-[0.1em] uppercase">
            <span
              className={`border-2 border-ink px-1.5 py-0.5 ${
                reviewStatus === "verified"
                  ? "bg-success text-ink"
                  : "bg-purple text-paper"
              }`}
            >
              {reviewStatus}
            </span>
            <span className="opacity-60">tier</span>
            <span className="font-bold">{report.tier}</span>
            <span className="opacity-60">wedge</span>
            <span className="font-bold">{report.wedge_score}/100</span>
            <span className="opacity-60">moat agg</span>
            <span className="font-bold">{moat.aggregate.toFixed(1)}/10</span>
          </div>
        </div>
        <p className="text-sm opacity-75 m-0 mb-2">{report.tagline}</p>
        <p className="font-display text-[15px] m-0 [text-wrap:pretty]">
          <span className="font-mono text-[10.5px] tracking-[0.15em] uppercase opacity-60 mr-2">
            wedge thesis
          </span>
          {report.wedge_thesis}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={recomputeOne}
          disabled={busy !== null}
          className="font-mono text-[11px] tracking-[0.1em] uppercase font-bold bg-ink text-accent px-3 py-2 border-2 border-ink cursor-pointer disabled:opacity-50"
        >
          {busy === "recompute" ? "recomputing..." : "recompute / rescore"}
        </button>
        <button
          onClick={refreshDistribution}
          disabled={busy !== null}
          className="font-mono text-[11px] tracking-[0.1em] uppercase font-bold bg-paper px-3 py-2 border-2 border-ink text-ink cursor-pointer disabled:opacity-50"
        >
          {busy === "distribution" ? "refreshing..." : "refresh distribution"}
        </button>
        {reviewStatus === "pending" ? (
          <button
            onClick={() => setReview("verified")}
            disabled={busy !== null}
            className="font-mono text-[11px] tracking-[0.1em] uppercase font-bold bg-success px-3 py-2 border-2 border-ink cursor-pointer disabled:opacity-50"
          >
            {busy === "review" ? "saving..." : "mark verified"}
          </button>
        ) : (
          <button
            onClick={() => setReview("pending")}
            disabled={busy !== null}
            className="font-mono text-[11px] tracking-[0.1em] uppercase font-bold bg-paper px-3 py-2 border-2 border-ink cursor-pointer disabled:opacity-50"
          >
            {busy === "review" ? "saving..." : "mark pending"}
          </button>
        )}
        <a
          href={`/r/${report.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-mono text-[11px] tracking-[0.1em] uppercase font-bold bg-paper px-3 py-2 border-2 border-ink no-underline text-ink hover:bg-bg"
        >
          view report
        </a>
        {message ? (
          <span className="font-mono text-[11px] opacity-80 self-center">
            {message}
          </span>
        ) : null}
      </div>

      <ScoreJudgmentPanel judgment={scoreJudgment} moat={moat} />
      <DistributionPanel distribution={distribution} score={moat.distribution} />

      <div className="bru bg-paper px-4 py-3 mb-7">
        <h2 className="font-display text-lg lowercase m-0 mb-2">
          corpus taxonomy lives elsewhere.
        </h2>
        <p className="text-[12px] text-muted m-0">
          Capability and descriptor fixes belong in similarity gaps and
          unknowns. This page is only for reviewing the public moat judgment.
        </p>
      </div>
    </>
  );
}

function ScoreJudgmentPanel({
  judgment,
  moat,
}: {
  judgment: ScoreJudgment | null;
  moat: MoatScore;
}) {
  return (
    <div className="bru bg-paper px-4 py-3 mb-5">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 className="font-display text-lg lowercase m-0">
          LLM score judgment.
        </h2>
        <span className="font-mono text-[10px] tracking-[0.12em] uppercase opacity-55">
          v{moat.rubric_version}
        </span>
      </div>
      {!judgment ? (
        <p className="font-mono text-[12px] opacity-65 m-0">
          No stored LLM judgment on this row. Recompute to rescore with the
          current scorer.
        </p>
      ) : (
        <div className="grid gap-2">
          {LLM_AXES.map((axis) => {
            const j = judgment.axes[axis];
            return (
              <div key={axis} className="border-2 border-ink/30 bg-bg px-3 py-2">
                <div className="flex flex-wrap items-baseline justify-between gap-2 mb-1">
                  <div className="font-mono text-[11px] uppercase tracking-[0.12em] font-bold">
                    {axis.replace("_", " ")}
                  </div>
                  <div className="font-mono text-[11px] uppercase tracking-[0.1em]">
                    <span className="opacity-55">score </span>
                    <span className="font-bold">{moat[axis].toFixed(1)}</span>
                    {j ? (
                      <>
                        <span className="opacity-55"> · confidence </span>
                        <span className="font-bold">{j.confidence}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                {j ? (
                  <>
                    <p className="text-[13px] m-0 mb-1">{j.rationale}</p>
                    <ul className="m-0 pl-4 text-[12px] opacity-75">
                      {j.evidence.map((e, i) => (
                        <li key={`${axis}-${i}`}>{e}</li>
                      ))}
                    </ul>
                  </>
                ) : (
                  <p className="font-mono text-[12px] opacity-55 m-0">
                    No stored evidence for this axis.
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DistributionPanel({
  distribution,
  score,
}: {
  distribution: DistributionBreakdown;
  score: number | null;
}) {
  return (
    <div className="bru bg-paper px-4 py-3 mb-5">
      <div className="flex items-baseline justify-between gap-3 mb-2">
        <h2 className="font-display text-lg lowercase m-0">distribution.</h2>
        <span className="font-mono text-[10px] tracking-[0.12em] uppercase opacity-55">
          score {score === null ? "-" : score.toFixed(1)}
        </span>
      </div>
      {!distribution ? (
        <p className="font-mono text-[12px] opacity-65 m-0">
          SERP collection failed or has not run yet. The aggregate skips this
          axis when distribution is null.
        </p>
      ) : (
        <table className="w-full font-mono text-[11px]">
          <thead>
            <tr className="border-b border-ink/30">
              <th className="text-left py-1 opacity-60 font-normal">signal</th>
              <th className="text-left py-1 opacity-60 font-normal">raw</th>
              <th className="text-right py-1 opacity-60 font-normal">weight</th>
              <th className="text-right py-1 opacity-60 font-normal">score</th>
            </tr>
          </thead>
          <tbody>
            {distribution.sub_signals.map((s) => (
              <tr key={s.name} className="border-b border-ink/15">
                <td className="py-1">{s.name}</td>
                <td className="py-1 opacity-80">{String(s.raw_value)}</td>
                <td className="py-1 text-right">{s.weight}</td>
                <td className="py-1 text-right">{s.score.toFixed(1)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
