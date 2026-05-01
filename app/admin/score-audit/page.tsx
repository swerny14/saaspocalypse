import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/auth";
import { getAllReports } from "@/lib/db/reports";
import { getScoreExpectationMap } from "@/lib/db/score_expectations";
import { getRecentAudit } from "@/lib/db/scoring_config";
import { detectAnomalies } from "@/lib/normalization/moat_anomalies";
import { scoreExpectationHash } from "@/lib/normalization/score_expectation_llm";
import { RecomputeAllButton } from "@/app/admin/moat-anomalies/RecomputeAllButton";
import { ScoreTableActions } from "./ScoreTableActions";

export const dynamic = "force-dynamic";

const AXES = [
  "capital",
  "technical",
  "network",
  "switching",
  "data_moat",
  "regulatory",
  "distribution",
] as const;

type Filter =
  | "all"
  | "suspects"
  | "pending"
  | "verified"
  | "axis-zero"
  | "axis-low"
  | "axis-high"
  | "no-moat";

const FILTERS: { value: Filter; label: string; blurb: string }[] = [
  { value: "all", label: "all", blurb: "every scored report" },
  {
    value: "suspects",
    label: "suspects",
    blurb: "heuristic anomaly: stored wedge tier and moat shape disagree",
  },
  {
    value: "pending",
    label: "pending review",
    blurb: "scored reports not yet marked verified",
  },
  {
    value: "verified",
    label: "verified",
    blurb: "curator-confirmed moat scores",
  },
  {
    value: "axis-zero",
    label: "any axis = 0",
    blurb: "potential coverage gap — reports with at least one axis at exactly 0",
  },
  {
    value: "axis-low",
    label: "weak walls",
    blurb: "aggregate < 4 — wide-open or barely-walled",
  },
  {
    value: "axis-high",
    label: "thick walls",
    blurb: "aggregate ≥ 7 — fortress candidates worth verifying",
  },
  { value: "no-moat", label: "unscored", blurb: "no moat row yet" },
];

type Search = Promise<{ filter?: string; q?: string; axis?: string }>;

export default async function ScoreAuditPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  if (!(await isAdmin())) redirect("/admin/login?next=/admin/score-audit");

  const sp = await searchParams;
  const filter: Filter = (FILTERS.find((f) => f.value === sp.filter)?.value ??
    "all") as Filter;
  const q = (sp.q ?? "").trim().toLowerCase();
  const axis = AXES.includes(sp.axis as (typeof AXES)[number])
    ? (sp.axis as (typeof AXES)[number])
    : null;

  const [reports, recentAudit] = await Promise.all([
    getAllReports(10_000),
    getRecentAudit(10),
  ]);
  const expectationByReport = await getScoreExpectationMap(
    reports.filter((r) => r.moat).map((r) => r.id),
  );
  const anomalies = detectAnomalies(reports);
  const anomalyBySlug = new Map(anomalies.map((a) => [a.report.slug, a]));

  const filtered = reports.filter((r) => {
    if (q) {
      const hay = `${r.slug} ${r.name} ${r.tagline}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filter === "no-moat") return !r.moat;
    if (!r.moat) return false;
    if (filter === "suspects") return anomalyBySlug.has(r.slug);
    if (filter === "pending") return r.moat.review_status === "pending";
    if (filter === "verified") return r.moat.review_status === "verified";
    if (filter === "axis-zero") {
      return AXES.some((a) => {
        const v = r.moat![a];
        return typeof v === "number" && v === 0;
      });
    }
    if (filter === "axis-low") return r.moat.aggregate < 4;
    if (filter === "axis-high") return r.moat.aggregate >= 7;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (axis) {
      const av = a.moat ? (a.moat[axis] as number | null) ?? -1 : -2;
      const bv = b.moat ? (b.moat[axis] as number | null) ?? -1 : -2;
      return av - bv;
    }
    // Default sort: lowest aggregate first (the calibration suspects come first).
    const aa = a.moat?.aggregate ?? -1;
    const bb = b.moat?.aggregate ?? -1;
    return aa - bb;
  });

  const tot = reports.length;
  const scored = reports.filter((r) => r.moat).length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-ink lowercase">
          score workbench.
        </h1>
        <p className="mt-1 text-sm text-muted">
          Every scored report, sorted by lowest moat aggregate first. Click a
          row to see which capex patterns fired, which capabilities matched,
          which distribution sub-signals contributed — and edit calibration
          without a redeploy. {scored}/{tot} scored.
        </p>
        <div className="mt-4">
          <RecomputeAllButton />
        </div>
      </div>

      {/* Per-axis tunability matrix — what's calibratable where. */}
      <details className="mb-5 bru bg-paper px-4 py-2.5 font-mono text-[11px]">
        <summary className="cursor-pointer font-bold tracking-[0.05em]">
          ▸ what&apos;s tunable per axis
        </summary>
        <div className="mt-3 grid gap-1.5 [&>div]:grid [&>div]:grid-cols-[110px_140px_1fr] [&>div]:gap-2 [&>div]:items-baseline">
          <div className="opacity-65 text-[10px] tracking-[0.1em] uppercase pb-1 border-b border-ink/30">
            <span>axis</span>
            <span>patterns</span>
            <span>weights / cross-link</span>
          </div>
          <div>
            <span className="font-bold">capital</span>
            <span>capex, capex_exclude, fortress_thesis</span>
            <span className="opacity-80">
              path anchors, surface_cap, numeric thresholds + tiers, aggregate.capital
            </span>
          </div>
          <div>
            <span className="font-bold">technical</span>
            <span className="opacity-50">none (pre-categorized)</span>
            <span className="opacity-80">
              per-difficulty multipliers, aggregate.technical
            </span>
          </div>
          <div>
            <span className="font-bold">network / switching / data / regulatory</span>
            <span className="opacity-50">via capability catalog</span>
            <span className="opacity-80">
              capability.hit_multiplier, aggregate.&lt;axis&gt; · patterns at{" "}
              <Link className="underline" href="/admin/score-audit">
                /admin/score-audit
              </Link>
            </span>
          </div>
          <div>
            <span className="font-bold">distribution</span>
            <span>distribution_authoritative_domain</span>
            <span className="opacity-80">
              6 sub-signal weights, aggregate.distribution · curve constants
              still in code
            </span>
          </div>
        </div>
      </details>

      {/* Filter row */}
      <div className="bru bg-paper px-4 py-3 mb-5 flex flex-wrap gap-2 items-center">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/score-audit?${new URLSearchParams({
              ...(f.value !== "all" ? { filter: f.value } : {}),
              ...(q ? { q } : {}),
              ...(axis ? { axis } : {}),
            }).toString()}`}
            className={`font-mono text-[11px] tracking-[0.1em] uppercase px-2.5 py-1 border-2 border-ink no-underline text-ink ${
              filter === f.value
                ? "bg-ink text-accent"
                : "bg-paper hover:bg-bg"
            }`}
            title={f.blurb}
          >
            {f.label}
          </Link>
        ))}
        <span className="font-mono text-[10px] tracking-[0.05em] uppercase opacity-50 ml-2">
          sort by axis:
        </span>
        {AXES.map((a) => (
          <Link
            key={a}
            href={`/admin/score-audit?${new URLSearchParams({
              ...(filter !== "all" ? { filter } : {}),
              ...(q ? { q } : {}),
              ...(axis === a ? {} : { axis: a }),
            }).toString()}`}
            className={`font-mono text-[10px] tracking-[0.1em] uppercase px-2 py-[3px] border border-ink no-underline text-ink ${
              axis === a ? "bg-coral text-paper" : "bg-paper hover:bg-bg"
            }`}
          >
            {a.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="border-2 border-ink bg-paper">
        <div className="grid grid-cols-[minmax(210px,1fr)_60px_60px_54px_54px_54px_54px_54px_54px_54px_150px_150px] gap-2 px-4 py-2 border-b-2 border-ink font-mono text-[10px] tracking-[0.1em] uppercase opacity-65 bg-bg">
          <span>slug · name</span>
          <span className="text-right">tier</span>
          <span className="text-right">wedge</span>
          <span className="text-right">cap</span>
          <span className="text-right">tech</span>
          <span className="text-right">net</span>
          <span className="text-right">swt</span>
          <span className="text-right">data</span>
          <span className="text-right">reg</span>
          <span className="text-right">dist</span>
          <span>llm flags</span>
          <span className="text-right">actions</span>
        </div>
        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center font-mono text-xs opacity-60">
            no reports match this filter.
          </div>
        ) : (
          sorted.map((r) => {
            const expectation = expectationByReport.get(r.id);
            const stale =
              !!expectation &&
              !!r.moat &&
              (expectation.rubric_version !== r.moat.rubric_version ||
                expectation.verdict_hash !== scoreExpectationHash(r));
            const flags = stale ? [] : (expectation?.flags ?? []);
            return (
              <div
                key={r.id}
                className="grid grid-cols-[minmax(210px,1fr)_60px_60px_54px_54px_54px_54px_54px_54px_54px_150px_150px] gap-2 px-4 py-2 border-b border-ink/15 text-ink hover:bg-bg font-mono text-[12px] items-center"
              >
                <Link
                  href={`/admin/score-audit/${r.slug}`}
                  className="truncate text-ink no-underline hover:underline"
                >
                  <span className="font-bold">{r.slug}</span>
                  <span className="opacity-60"> · {r.tagline}</span>
                </Link>
                <span className="text-right opacity-80">{r.tier}</span>
                <span className="text-right font-bold">{r.wedge_score}</span>
                <span className="text-right">{r.moat?.capital.toFixed(1) ?? "—"}</span>
                <span className="text-right">
                  {r.moat?.technical.toFixed(1) ?? "—"}
                </span>
                <span className="text-right">
                  {r.moat?.network.toFixed(1) ?? "—"}
                </span>
                <span className="text-right">
                  {r.moat?.switching.toFixed(1) ?? "—"}
                </span>
                <span className="text-right">
                  {r.moat?.data_moat.toFixed(1) ?? "—"}
                </span>
                <span className="text-right">
                  {r.moat?.regulatory.toFixed(1) ?? "—"}
                </span>
                <span className="text-right">
                  {r.moat?.distribution?.toFixed(1) ?? "—"}
                </span>
                <span className="flex min-w-0 flex-wrap gap-1">
                  {!r.moat ? (
                    <span className="opacity-45">unscored</span>
                  ) : stale ? (
                    <span className="border border-ink bg-sticky px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em]">
                      stale
                    </span>
                  ) : !expectation ? (
                    <span className="opacity-45">not checked</span>
                  ) : flags.length === 0 ? (
                    <span className="border border-success bg-paper-alt px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-success">
                      clean
                    </span>
                  ) : (
                    flags.slice(0, 2).map((f) => (
                      <span
                        key={`${f.axis}-${f.kind}`}
                        className="border border-coral bg-paper px-1.5 py-0.5 text-[10px] uppercase tracking-[0.08em] text-coral"
                        title={f.rationale}
                      >
                        {f.kind} {f.axis.replace("_", " ")}
                      </span>
                    ))
                  )}
                  {flags.length > 2 ? (
                    <span className="opacity-60">+{flags.length - 2}</span>
                  ) : null}
                </span>
                <ScoreTableActions
                  slug={r.slug}
                  reviewStatus={r.moat?.review_status ?? "pending"}
                  hasMoat={!!r.moat}
                  hasExpectation={!!expectation && !stale}
                  flagCount={flags.length}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Recent audit log */}
      {recentAudit.length > 0 && (
        <div className="mt-7">
          <h2 className="font-display text-lg lowercase mb-2">
            recent calibration changes.
          </h2>
          <div className="border-2 border-ink bg-paper">
            {recentAudit.map((row) => (
              <div
                key={row.id}
                className="px-4 py-2 border-b border-ink/15 last:border-b-0 font-mono text-[11px] grid grid-cols-[120px_60px_70px_1fr_80px] gap-3 items-center"
              >
                <span className="opacity-60">
                  {new Date(row.ts).toLocaleString()}
                </span>
                <span className="opacity-80">{row.scope}</span>
                <span className="font-bold">{row.change_kind}</span>
                <span className="opacity-90 truncate">
                  {row.axis ? <span className="opacity-50">{row.axis}: </span> : null}
                  {row.reason ?? row.ref_key ?? "—"}
                </span>
                <span className="text-right opacity-60">
                  {row.reports_moved !== null ? `${row.reports_moved} moved` : "—"}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
