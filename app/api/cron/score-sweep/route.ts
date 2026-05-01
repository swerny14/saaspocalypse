import { NextResponse } from "next/server";
import { getAllReports } from "@/lib/db/reports";
import { detectAnomalies } from "@/lib/normalization/moat_anomalies";
import { logScoringAudit } from "@/lib/db/scoring_config";
import { logError } from "@/lib/error_log";

export const maxDuration = 60;

/**
 * Weekly score-health sweep. Runs the moat-anomaly detector across the
 * entire corpus and writes a snapshot to scoring_audit so the curator can
 * see drift over time in /admin/score-audit. Cheap (one DB read, in-memory
 * compute, one write) — should fit comfortably inside the cron budget.
 *
 * Bearer-auth gated via CRON_SECRET (matches the social cron pattern).
 * Vercel-Cron requests carry the secret automatically; manual runs need
 * `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    await logError({
      scope: "social",
      reason: "score_sweep_no_secret",
      message: "CRON_SECRET not configured — refusing to run",
    });
    return NextResponse.json({ error: "CRON_SECRET not configured" }, { status: 500 });
  }
  const auth = req.headers.get("authorization") ?? "";
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const reports = await getAllReports(10_000);
    const scored = reports.filter((r) => r.moat);
    const anomalies = detectAnomalies(reports);

    const tierCounts = { SOFT: 0, CONTESTED: 0, FORTRESS: 0 } as Record<
      string,
      number
    >;
    let axisZeroCount = 0;
    const axisZeroByAxis: Record<string, number> = {
      capital: 0,
      technical: 0,
      network: 0,
      switching: 0,
      data_moat: 0,
      regulatory: 0,
      distribution: 0,
    };
    let aggregateSum = 0;
    for (const r of scored) {
      tierCounts[r.tier] = (tierCounts[r.tier] ?? 0) + 1;
      aggregateSum += r.moat?.aggregate ?? 0;
      const axes = [
        "capital",
        "technical",
        "network",
        "switching",
        "data_moat",
        "regulatory",
        "distribution",
      ] as const;
      let hasZero = false;
      for (const a of axes) {
        const v = r.moat ? (r.moat[a] as number | null) : null;
        if (typeof v === "number" && v === 0) {
          axisZeroByAxis[a] += 1;
          hasZero = true;
        }
      }
      if (hasZero) axisZeroCount += 1;
    }

    const snapshot = {
      ts: new Date().toISOString(),
      total_reports: reports.length,
      scored: scored.length,
      tier_counts: tierCounts,
      mean_aggregate:
        scored.length > 0 ? Number((aggregateSum / scored.length).toFixed(2)) : 0,
      axis_zero_count: axisZeroCount,
      axis_zero_by_axis: axisZeroByAxis,
      pending_anomalies: anomalies.filter(
        (a) => a.moat.review_status === "pending",
      ).length,
      verified_anomalies: anomalies.filter(
        (a) => a.moat.review_status === "verified",
      ).length,
    };

    await logScoringAudit({
      actor: "cron",
      scope: "sweep",
      change_kind: "sweep_run",
      after_value: snapshot,
      reason: "weekly score-health snapshot",
    });

    return NextResponse.json({ ok: true, snapshot });
  } catch (e) {
    await logError({
      scope: "social",
      reason: "score_sweep_failed",
      message: e instanceof Error ? e.message : String(e),
    });
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "sweep failed" },
      { status: 500 },
    );
  }
}
