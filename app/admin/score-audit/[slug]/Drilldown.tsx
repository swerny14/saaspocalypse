"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  AuditResults,
  FixForms,
  type CapabilityOption,
  type Suggestion,
} from "@/app/admin/moat-anomalies/AnomalyTriage";

type Tier = "SOFT" | "CONTESTED" | "FORTRESS";

type ReportSummary = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  domain: string;
  tier: Tier;
  wedge_score: number;
  wedge_thesis: string;
  take: string;
  take_sub: string;
  review_status: "pending" | "verified";
  audit_summary: string | null;
  audit_suggestions: Suggestion[] | null;
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

type CapexHit = {
  surface: string;
  surface_index?: number;
  pattern: string;
  matched_text: string;
};

type Breakdown = {
  capital: {
    capex_hits: CapexHit[];
    fortress_thesis_match: { pattern: string; matched_text: string } | null;
    path: string;
    numeric_total: number | string;
  };
  technical: {
    nightmare_count: number;
    hard_count: number;
    medium_count: number;
    easy_count: number;
  };
  network: {
    capability_hits: CapabilityHit[];
    raw_count: number;
  };
  switching: {
    capability_hits: CapabilityHit[];
    raw_count: number;
  };
  data_moat: {
    capability_hits: CapabilityHit[];
    raw_count: number;
  };
  regulatory: {
    capability_hits: CapabilityHit[];
    raw_count: number;
  };
  distribution: {
    sub_signals: Array<{
      name: string;
      raw_value: unknown;
      weight: number;
      score: number;
    }>;
    total_weighted: number;
    total_weight: number;
  } | null;
};

type PatternRow = {
  id: string;
  axis: string;
  kind: string;
  pattern: string;
  status: string;
  evidence: string | null;
  added_by: string | null;
  added_at: string;
};

type WeightRow = {
  key: string;
  value: number;
  description: string | null;
};

type CapabilityHit = {
  slug: string;
  tags: string[];
  evidence_field?: string;
  evidence_pattern?: string;
  evidence_text?: string;
};

type Props = {
  report: ReportSummary;
  moat: MoatScore;
  breakdown: Breakdown;
  patterns: PatternRow[];
  weights: WeightRow[];
  capabilities: CapabilityOption[];
};

const AXES = [
  "capital",
  "technical",
  "network",
  "switching",
  "data_moat",
  "regulatory",
  "distribution",
] as const;

export function ScoreAuditDrilldown({
  report,
  moat,
  breakdown,
  patterns,
  weights,
  capabilities,
}: Props) {
  const [openAxis, setOpenAxis] = useState<string | null>("capital");
  const [busy, setBusy] = useState<
    null | "recompute" | "audit" | "moatAudit" | "review" | "distribution"
  >(null);
  const [auditMsg, setAuditMsg] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState(report.review_status);
  const [moatAudit, setMoatAudit] = useState<
    | { kind: "idle" }
    | { kind: "ready"; summary: string; suggestions: Suggestion[] }
    | { kind: "error"; message: string }
  >(
    report.audit_summary !== null
      ? {
          kind: "ready",
          summary: report.audit_summary,
          suggestions: report.audit_suggestions ?? [],
        }
      : { kind: "idle" },
  );
  const [, startTransition] = useTransition();
  const router = useRouter();

  const recomputeOne = async () => {
    setBusy("recompute");
    setAuditMsg(null);
    try {
      const res = await fetch(`/api/admin/score-audit/recompute`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: report.slug }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setAuditMsg(json.error ?? `recompute failed (${res.status})`);
      } else {
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setAuditMsg(e instanceof Error ? e.message : "recompute failed");
    } finally {
      setBusy(null);
    }
  };

  const runAudit = async () => {
    setBusy("audit");
    setAuditMsg(null);
    try {
      const res = await fetch(`/api/admin/score-audit/suggest`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ slug: report.slug }),
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        error?: string;
      };
      if (!res.ok || !json.ok) {
        setAuditMsg(json.error ?? `audit failed (${res.status})`);
      } else {
        setAuditMsg(json.message ?? "audit complete");
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setAuditMsg(e instanceof Error ? e.message : "audit failed");
    } finally {
      setBusy(null);
    }
  };

  const runMoatAudit = async () => {
    setBusy("moatAudit");
    setAuditMsg(null);
    setMoatAudit({ kind: "idle" });
    try {
      const res = await fetch(`/api/admin/reports/${report.slug}/audit`, {
        method: "POST",
      });
      const json = (await res.json()) as {
        ok?: boolean;
        message?: string;
        verdict_summary?: string;
        suggestions?: Suggestion[];
      };
      if (!res.ok || !json.ok) {
        const message = json.message ?? `moat audit failed (${res.status})`;
        setMoatAudit({ kind: "error", message });
        setAuditMsg(message);
      } else {
        setMoatAudit({
          kind: "ready",
          summary: json.verdict_summary ?? "audit complete",
          suggestions: json.suggestions ?? [],
        });
        startTransition(() => router.refresh());
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : "moat audit failed";
      setMoatAudit({ kind: "error", message });
      setAuditMsg(message);
    } finally {
      setBusy(null);
    }
  };

  const setReview = async (status: "pending" | "verified") => {
    setBusy("review");
    setAuditMsg(null);
    try {
      const res = await fetch(`/api/admin/reports/${report.slug}/moat-review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setAuditMsg(json.message ?? `review update failed (${res.status})`);
      } else {
        setReviewStatus(status);
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setAuditMsg(e instanceof Error ? e.message : "review update failed");
    } finally {
      setBusy(null);
    }
  };

  const refreshDistribution = async () => {
    setBusy("distribution");
    setAuditMsg(null);
    try {
      const res = await fetch(`/api/admin/reports/${report.slug}/distribution`, {
        method: "POST",
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setAuditMsg(json.message ?? `distribution refresh failed (${res.status})`);
      } else {
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setAuditMsg(e instanceof Error ? e.message : "distribution refresh failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      {/* Header */}
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
        <p className="text-sm opacity-75 m-0 mb-2">▸ {report.tagline}</p>
        <p className="font-display text-[15px] m-0 [text-wrap:pretty]">
          <span className="font-mono text-[10.5px] tracking-[0.15em] uppercase opacity-60 mr-2">
            wedge thesis
          </span>
          {report.wedge_thesis}
        </p>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={recomputeOne}
          disabled={busy !== null}
          className="font-mono text-[11px] tracking-[0.1em] uppercase font-bold bg-ink text-accent px-3 py-2 border-2 border-ink cursor-pointer disabled:opacity-50"
        >
          {busy === "recompute" ? "recomputing…" : "↻ recompute this report"}
        </button>
        <button
          onClick={runAudit}
          disabled={busy !== null}
          className="font-mono text-[11px] tracking-[0.1em] uppercase font-bold bg-purple text-paper px-3 py-2 border-2 border-ink cursor-pointer disabled:opacity-50"
          title="Runs the scoring-pattern audit and queues suggested capital/distribution patterns as disabled rows for review."
        >
          {busy === "audit" ? "running..." : "suggest capital/dist patterns"}
        </button>
        <button
          onClick={runMoatAudit}
          disabled={busy !== null}
          className="font-mono text-[11px] tracking-[0.1em] uppercase font-bold bg-paper px-3 py-2 border-2 border-purple text-purple cursor-pointer disabled:opacity-50"
          title="Runs the capability moat audit and shows suggestions for you to apply manually."
        >
          {busy === "moatAudit"
            ? "auditing..."
            : report.audit_summary !== null
              ? "re-run capability audit"
              : "AI capability audit"}
        </button>
        <button
          onClick={refreshDistribution}
          disabled={busy !== null}
          className="font-mono text-[11px] tracking-[0.1em] uppercase font-bold bg-paper px-3 py-2 border-2 border-ink text-ink cursor-pointer disabled:opacity-50"
          title="Re-runs the Serper brand SERP call, persists fresh distribution signals, and recomputes this report."
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
          view report ↗
        </a>
        {auditMsg && (
          <span className="font-mono text-[11px] opacity-80 self-center">
            {auditMsg}
          </span>
        )}
      </div>

      {moatAudit.kind === "ready" ? (
        <AuditResults
          summary={moatAudit.summary}
          suggestions={moatAudit.suggestions}
          capabilities={capabilities}
        />
      ) : null}
      {moatAudit.kind === "error" ? (
        <div className="border-2 border-danger bg-paper-alt rounded p-3 text-xs text-danger mb-4">
          {moatAudit.message}
        </div>
      ) : null}

      {/* Axes panels */}
      <div className="grid gap-3 mb-7">
        {AXES.map((axis) => (
          <AxisPanel
            key={axis}
            axis={axis}
            value={moat[axis]}
            isOpen={openAxis === axis}
            onToggle={() => setOpenAxis(openAxis === axis ? null : axis)}
            breakdown={breakdown}
            reportId={report.id}
          />
        ))}
      </div>

      <div id="capability-catalog-fixes" className="bru bg-paper px-4 py-3 mb-7">
        <h2 className="font-display text-lg lowercase m-0 mb-2">
          capability catalog fixes.
        </h2>
        <p className="text-[12px] text-muted mb-3">
          Use this when network, switching, data, or regulatory walls are
          missing because the report prose did not match a moat-bearing
          capability.
        </p>
        <FixForms capabilities={capabilities} />
        <CapabilityRemoval capabilities={capabilities} />
      </div>

      {/* Patterns table */}
      <PatternsAdmin patterns={patterns} reportSlug={report.slug} />

      {/* Weights table */}
      <WeightsAdmin weights={weights} />
    </>
  );
}

function CapabilityRemoval({
  capabilities,
}: {
  capabilities: CapabilityOption[];
}) {
  const [slug, setSlug] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const selected = capabilities.find((c) => c.slug === slug);
  const canDelete = slug && confirm === slug;

  const deleteSelected = async () => {
    if (!canDelete) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/admin/capabilities/${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setMsg(json.message ?? `delete failed (${res.status})`);
      } else {
        setMsg("capability deleted; recompute affected reports to verify movement");
        setSlug("");
        setConfirm("");
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <details className="mt-3 border-t border-dashed border-ink/30 pt-3">
      <summary className="font-mono text-[11px] uppercase tracking-[0.1em] font-bold cursor-pointer">
        remove overfiring capability
      </summary>
      <div className="mt-3 grid gap-2 font-mono text-[12px]">
        <p className="m-0 text-muted">
          Prefer removing a single pattern from the axis evidence above. Delete
          a capability only when the concept itself is wrong or duplicated.
        </p>
        <div className="grid gap-2 sm:grid-cols-[1fr_220px_auto] sm:items-end">
          <label className="grid gap-1">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted">
              capability
            </span>
            <select
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setConfirm("");
              }}
              className="border-2 border-ink bg-paper px-2 py-1"
            >
              <option value="">select capability...</option>
              {capabilities.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.slug} - {c.display_name} ({c.pattern_count} patterns)
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-[10px] uppercase tracking-[0.15em] text-muted">
              type slug to confirm
            </span>
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={!slug}
              placeholder={slug || "select first"}
              className="border-2 border-ink bg-paper px-2 py-1 disabled:opacity-50"
            />
          </label>
          <button
            onClick={deleteSelected}
            disabled={busy || !canDelete}
            className="font-mono text-[11px] uppercase tracking-[0.1em] font-bold bg-danger text-paper px-3 py-1.5 border-2 border-ink cursor-pointer disabled:opacity-50"
          >
            {busy ? "deleting..." : "delete"}
          </button>
        </div>
        {selected ? (
          <div className="text-[11px] opacity-75">
            Tags: {selected.moat_tags.join(", ") || "none"}.
          </div>
        ) : null}
        {msg ? <div className="text-[11px] opacity-80">{msg}</div> : null}
      </div>
    </details>
  );
}

/* ──────────────────────────── axis panel ──────────────────────────── */

function AxisPanel({
  axis,
  value,
  isOpen,
  onToggle,
  breakdown,
  reportId,
}: {
  axis: (typeof AXES)[number];
  value: number | null;
  isOpen: boolean;
  onToggle: () => void;
  breakdown: Breakdown;
  reportId: string;
}) {
  const display = value === null ? "—" : value.toFixed(1);
  const sev = severityClass(value);
  return (
    <div className="border-2 border-ink bg-paper">
      <button
        onClick={onToggle}
        className="w-full px-4 py-2.5 flex items-center justify-between cursor-pointer text-left bg-paper hover:bg-bg border-0"
      >
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] tracking-[0.15em] uppercase font-bold">
            {axis.replace("_", " ")}
          </span>
          <span className={`font-display text-lg font-bold ${sev}`}>
            {display}
            <span className="text-[11px] opacity-50 ml-1">/10</span>
          </span>
        </div>
        <span className="font-mono text-[11px] opacity-60">
          {isOpen ? "− collapse" : "+ what fired?"}
        </span>
      </button>
      {isOpen && (
        <div className="border-t-2 border-ink px-4 py-3.5 bg-bg/50">
          {axis === "capital" && (
            <CapitalDetail capital={breakdown.capital} reportId={reportId} />
          )}
          {axis === "technical" && (
            <TechnicalDetail technical={breakdown.technical} />
          )}
          {(axis === "network" ||
            axis === "switching" ||
            axis === "data_moat" ||
            axis === "regulatory") && (
            <CapabilityAxisDetail axis={axis} bd={breakdown[axis]} />
          )}
          {axis === "distribution" && (
            <DistributionDetail bd={breakdown.distribution} reportId={reportId} />
          )}
        </div>
      )}
    </div>
  );
}

function severityClass(v: number | null): string {
  if (v === null) return "text-ink/40";
  if (v >= 7) return "text-coral";
  if (v >= 4) return "text-ink";
  if (v >= 1) return "text-muted";
  return "text-ink/40";
}

/* ──────────────────────────── capital detail ──────────────────────────── */

function CapitalDetail({
  capital,
}: {
  capital: Breakdown["capital"];
  reportId: string;
}) {
  const grouped = new Map<string, CapexHit[]>();
  for (const h of capital.capex_hits) {
    const key = `${h.surface}${h.surface_index !== undefined ? `[${h.surface_index}]` : ""}`;
    const arr = grouped.get(key) ?? [];
    arr.push(h);
    grouped.set(key, arr);
  }

  return (
    <div className="font-mono text-[12px]">
      <div className="mb-3">
        <span className="opacity-60 mr-2">scoring path:</span>
        <span className="font-bold">{capital.path}</span>
        <span className="opacity-60 mx-2">·</span>
        <span className="opacity-60">est_total:</span>{" "}
        <span className="font-bold">
          {typeof capital.numeric_total === "number"
            ? `$${capital.numeric_total}`
            : capital.numeric_total}
        </span>
      </div>
      {capital.fortress_thesis_match && (
        <div className="mb-3 px-2 py-1.5 border-2 border-dashed border-coral bg-paper">
          <div className="opacity-60 text-[10px] tracking-[0.1em] uppercase mb-0.5">
            fortress-thesis match
          </div>
          <div>
            <span className="bg-coral/30 px-1">
              {capital.fortress_thesis_match.matched_text}
            </span>
            <span className="opacity-50 ml-2">
              (pattern: <code>{capital.fortress_thesis_match.pattern}</code>)
            </span>
          </div>
        </div>
      )}
      <div>
        <div className="opacity-60 text-[10px] tracking-[0.1em] uppercase mb-1">
          capex hits ({capital.capex_hits.length})
        </div>
        {capital.capex_hits.length === 0 ? (
          <div className="opacity-60">
            no capex patterns matched. consider whether the LLM&apos;s prose
            mentions incumbent capex (gpu clusters, training data, regulatory
            audits, etc.) — if so, add a pattern via the patterns surface below.
          </div>
        ) : (
          <ul className="grid gap-1 m-0 p-0 list-none">
            {Array.from(grouped.entries()).map(([key, hits]) => (
              <li key={key} className="flex flex-wrap gap-2 items-baseline">
                <span className="opacity-60 text-[10px] tracking-[0.05em] uppercase">
                  {key}:
                </span>
                {hits.map((h, i) => (
                  <span
                    key={i}
                    className="bg-accent/40 px-1 border border-ink/30"
                    title={`pattern: ${h.pattern}`}
                  >
                    {h.matched_text}
                  </span>
                ))}
              </li>
            ))}
          </ul>
        )}
      </div>
      <TunableFooter
        patterns={["capex", "capex_exclude", "fortress_thesis"]}
        weights={[
          "capital.descriptive_anchor",
          "capital.fortress_thesis_anchor",
          "capital.heavy_capex_anchor",
          "capital.heavy_capex_hits_min",
          "capital.surface_cap",
          "capital.numeric.threshold_*",
          "capital.numeric.tier_*",
          "aggregate.capital",
        ]}
      />
    </div>
  );
}

/* ──────────────────────────── technical detail ──────────────────────────── */

function TechnicalDetail({ technical }: { technical: Breakdown["technical"] }) {
  return (
    <div className="font-mono text-[12px]">
      <div className="opacity-60 text-[10px] tracking-[0.1em] uppercase mb-1.5">
        per-challenge difficulty distribution
      </div>
      <div className="grid grid-cols-4 gap-2">
        {(["nightmare", "hard", "medium", "easy"] as const).map((d) => (
          <div key={d} className="border-2 border-ink bg-paper px-2 py-1.5">
            <div className="opacity-60 text-[10px] tracking-[0.05em] uppercase">
              {d}
            </div>
            <div className="font-display text-lg font-bold">
              {technical[`${d}_count` as const]}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2 opacity-60 text-[11px]">
        Score = nightmare × <Weight k="technical.nightmare_weight" /> + hard ×{" "}
        <Weight k="technical.hard_weight" /> + medium ×{" "}
        <Weight k="technical.medium_weight" />, clamped 0–10.
      </div>
      <TunableFooter
        weights={[
          "technical.nightmare_weight",
          "technical.hard_weight",
          "technical.medium_weight",
          "aggregate.technical",
        ]}
      />
    </div>
  );
}

function Weight({ k }: { k: string }) {
  return <code className="opacity-80">{k}</code>;
}

/**
 * Per-axis "what's tunable here" footer. Surfaces the calibration paths
 * for an axis so the curator never has to wonder "where do I edit this?"
 */
function TunableFooter({
  patterns,
  weights,
  external,
}: {
  patterns?: string[];
  weights: string[];
  external?: { href: string; label: string };
}) {
  return (
    <div className="mt-3 pt-2 border-t border-dashed border-ink/30 font-mono text-[10.5px] grid gap-2 opacity-80">
      <div className="opacity-65 text-[10px] tracking-[0.1em] uppercase">
        tunable
      </div>
      {patterns && patterns.length > 0 && (
        <div className="grid gap-1">
          <span className="opacity-60">patterns</span>
          <span className="flex flex-wrap gap-1">
            {patterns.map((p) => (
              <code key={p} className="bg-paper px-1 py-0.5 border border-ink/20">
                {p}
              </code>
            ))}
            <span className="opacity-50 self-center">table below</span>
          </span>
        </div>
      )}
      <div className="grid gap-1">
        <span className="opacity-60">weights</span>
        <span className="flex flex-wrap gap-1">
          {weights.map((w) => (
            <code key={w} className="bg-paper px-1 py-0.5 border border-ink/20">
              {w}
            </code>
          ))}
          <span className="opacity-50 self-center">weights table below</span>
        </span>
      </div>
      {external && (
        <div>
          <span className="opacity-60">also: </span>
          <a className="underline" href={external.href}>
            {external.label}
          </a>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────── capability axis detail ─────────────────────── */

function CapabilityAxisDetail({
  axis,
  bd,
}: {
  axis: "network" | "switching" | "data_moat" | "regulatory";
  bd: Breakdown["network"];
}) {
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const removePattern = async (hit: CapabilityHit) => {
    if (!hit.evidence_pattern) return;
    const key = `${hit.slug}:${hit.evidence_pattern}`;
    setBusyKey(key);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/capabilities/${encodeURIComponent(hit.slug)}/patterns`,
        {
          method: "DELETE",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ pattern: hit.evidence_pattern }),
        },
      );
      const json = (await res.json()) as { ok?: boolean; message?: string };
      if (!res.ok || !json.ok) {
        setMsg(json.message ?? `remove failed (${res.status})`);
      } else {
        setMsg("pattern removed; recompute to verify movement");
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "remove failed");
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="font-mono text-[12px]">
      <div className="opacity-60 text-[10px] tracking-[0.1em] uppercase mb-1.5">
        {axis.replace("_", " ")} capability hits ({bd.raw_count})
      </div>
      {bd.capability_hits.length === 0 ? (
        <div className="opacity-60">
          no capabilities with {axis.replace("_", " ")} moat tags fired.
          this axis is pattern-driven through the capability catalog (NOT
          through scoring_patterns) — add or extend a capability at{" "}
          <a className="underline" href="#capability-catalog-fixes">
            capability catalog fixes
          </a>{" "}
          to capture missing moat-bearing signals.
        </div>
      ) : (
        <ul className="grid gap-2 m-0 p-0 list-none">
          {bd.capability_hits.map((h, i) => (
            <li
              key={i}
              className="border border-ink/25 bg-paper px-2 py-2 grid gap-1"
            >
              <div className="flex flex-wrap gap-2 items-center">
                <span className="font-bold">{h.slug}</span>
                {h.tags.map((t) => (
                  <span
                    key={t}
                    className="bg-accent/40 px-1 border border-ink/30 text-[11px]"
                  >
                    {t}
                  </span>
                ))}
                {h.evidence_pattern ? (
                  <button
                    onClick={() => removePattern(h)}
                    disabled={busyKey === `${h.slug}:${h.evidence_pattern}`}
                    className="ml-auto font-mono text-[10px] tracking-[0.1em] uppercase font-bold bg-paper px-2 py-0.5 border border-ink cursor-pointer hover:bg-bg disabled:opacity-50"
                    title="Remove this match pattern from the capability catalog. Then recompute the report to verify score movement."
                  >
                    {busyKey === `${h.slug}:${h.evidence_pattern}`
                      ? "removing..."
                      : "remove pattern"}
                  </button>
                ) : null}
              </div>
              <div className="grid gap-0.5 text-[11px] opacity-80">
                <div>
                  <span className="opacity-60">matched field:</span>{" "}
                  <span className="font-bold">{h.evidence_field ?? "unknown"}</span>
                </div>
                {h.evidence_pattern ? (
                  <div>
                    <span className="opacity-60">pattern:</span>{" "}
                    <code className="bg-bg px-1 border border-ink/20">
                      {h.evidence_pattern}
                    </code>
                  </div>
                ) : null}
                {h.evidence_text ? (
                  <div>
                    <span className="opacity-60">matched text:</span>{" "}
                    <span className="bg-accent/30 px-1 border border-ink/20">
                      {h.evidence_text}
                    </span>
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      {msg ? <div className="mt-2 text-[11px] opacity-80">{msg}</div> : null}
      <TunableFooter
        weights={[`aggregate.${axis}`, "capability.hit_multiplier"]}
        external={{
          href: "#capability-catalog-fixes",
          label: `edit ${axis.replace("_", " ")} capabilities below`,
        }}
      />
    </div>
  );
}

/* ──────────────────────── distribution detail ──────────────────────── */

function DistributionDetail({
  bd,
}: {
  bd: Breakdown["distribution"];
  reportId: string;
}) {
  if (!bd) {
    return (
      <div className="font-mono text-[12px] opacity-60">
        SERP collection failed (or wasn&apos;t run yet). Distribution is
        uncomputable; aggregate skips the axis.
      </div>
    );
  }
  return (
    <div className="font-mono text-[12px]">
      <div className="opacity-60 text-[10px] tracking-[0.1em] uppercase mb-1.5">
        sub-signals (weighted, total {bd.total_weighted.toFixed(1)} /{" "}
        {bd.total_weight})
      </div>
      <table className="w-full text-[11px]">
        <thead>
          <tr className="border-b border-ink/30">
            <th className="text-left py-1 opacity-60 font-normal">signal</th>
            <th className="text-left py-1 opacity-60 font-normal">raw</th>
            <th className="text-right py-1 opacity-60 font-normal">weight</th>
            <th className="text-right py-1 opacity-60 font-normal">score</th>
            <th className="text-right py-1 opacity-60 font-normal">
              contribution
            </th>
          </tr>
        </thead>
        <tbody>
          {bd.sub_signals.map((s) => (
            <tr key={s.name} className="border-b border-ink/15">
              <td className="py-1">{s.name}</td>
              <td className="py-1 opacity-80">{String(s.raw_value)}</td>
              <td className="py-1 text-right">{s.weight}</td>
              <td className="py-1 text-right">{s.score.toFixed(1)}</td>
              <td className="py-1 text-right font-bold">
                {(s.score * s.weight).toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <TunableFooter
        patterns={["distribution_authoritative_domain"]}
        weights={[
          "distribution.sub_weight.has_sitelinks",
          "distribution.sub_weight.compressed_organic",
          "distribution.sub_weight.authoritative_third_party_count",
          "distribution.sub_weight.knowledge_graph_present",
          "distribution.sub_weight.top_organic_owned",
          "distribution.sub_weight.serp_own_domain_count",
          "aggregate.distribution",
        ]}
      />
    </div>
  );
}

/* ──────────────────────── patterns admin ──────────────────────── */

function PatternsAdmin({
  patterns,
}: {
  patterns: PatternRow[];
  reportSlug: string;
}) {
  const [showForm, setShowForm] = useState(false);
  const [axis, setAxis] = useState("capital");
  const [kind, setKind] = useState("capex");
  const [pattern, setPattern] = useState("");
  const [evidence, setEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [filterAxis, setFilterAxis] = useState<string>("all");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [, startTransition] = useTransition();
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/scoring-patterns", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ axis, kind, pattern: pattern.trim(), evidence }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setMsg(json.error ?? `failed (${res.status})`);
      } else {
        setPattern("");
        setEvidence("");
        setShowForm(false);
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  };

  const togglePattern = async (id: string, status: string) => {
    const next = status === "active" ? "disabled" : "active";
    try {
      const res = await fetch("/api/admin/scoring-patterns", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, status: next }),
      });
      if (res.ok) startTransition(() => router.refresh());
    } catch {
      // noop — error surfaces on next page load
    }
  };

  const visible = patterns.filter((p) => {
    if (filterAxis !== "all" && p.axis !== filterAxis) return false;
    if (filterKind !== "all" && p.kind !== filterKind) return false;
    return true;
  });

  return (
    <div className="mb-7">
      <div className="flex items-baseline justify-between gap-3 mb-2 flex-wrap">
        <h2 className="font-display text-lg lowercase m-0">scoring patterns.</h2>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="font-mono text-[11px] tracking-[0.1em] uppercase font-bold bg-accent text-ink px-3 py-1.5 border-2 border-ink cursor-pointer"
        >
          {showForm ? "× cancel" : "+ add pattern"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={submit}
          className="bru bg-paper px-4 py-3 mb-3 grid gap-2.5 font-mono text-[12px]"
        >
          <div className="flex gap-2 flex-wrap">
            <label className="flex flex-col gap-1">
              <span className="opacity-60 text-[10px] tracking-[0.1em] uppercase">
                axis
              </span>
              <select
                value={axis}
                onChange={(e) => setAxis(e.target.value)}
                className="border-2 border-ink bg-paper px-2 py-1"
              >
                {AXES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="opacity-60 text-[10px] tracking-[0.1em] uppercase">
                kind
              </span>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value)}
                className="border-2 border-ink bg-paper px-2 py-1"
              >
                <option value="capex">capex</option>
                <option value="capex_exclude">capex_exclude</option>
                <option value="fortress_thesis">fortress_thesis</option>
                <option value="distribution_authoritative_domain">
                  distribution_authoritative_domain
                </option>
              </select>
            </label>
            <label className="flex flex-col gap-1 flex-1 min-w-[220px]">
              <span className="opacity-60 text-[10px] tracking-[0.1em] uppercase">
                pattern (regex source or domain)
              </span>
              <input
                value={pattern}
                onChange={(e) => setPattern(e.target.value)}
                placeholder="e.g. \\bsemiconductor\\b   or   bloomberg.com"
                className="border-2 border-ink bg-paper px-2 py-1"
                required
              />
            </label>
          </div>
          <label className="flex flex-col gap-1">
            <span className="opacity-60 text-[10px] tracking-[0.1em] uppercase">
              evidence (1-line justification)
            </span>
            <input
              value={evidence}
              onChange={(e) => setEvidence(e.target.value)}
              placeholder="why this pattern: which report, which prose snippet"
              className="border-2 border-ink bg-paper px-2 py-1"
            />
          </label>
          <div className="flex items-center gap-2">
            <button
              type="submit"
              disabled={busy || !pattern.trim()}
              className="font-mono text-[11px] tracking-[0.1em] uppercase font-bold bg-ink text-accent px-3 py-1.5 border-2 border-ink cursor-pointer disabled:opacity-50"
            >
              {busy ? "saving…" : "save pattern"}
            </button>
            {msg && <span className="opacity-80">{msg}</span>}
          </div>
        </form>
      )}

      <div className="flex gap-2 mb-2 flex-wrap font-mono text-[11px]">
        <span className="opacity-60 self-center">filter:</span>
        <select
          value={filterAxis}
          onChange={(e) => setFilterAxis(e.target.value)}
          className="border-2 border-ink bg-paper px-2 py-0.5"
        >
          <option value="all">all axes</option>
          {AXES.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select
          value={filterKind}
          onChange={(e) => setFilterKind(e.target.value)}
          className="border-2 border-ink bg-paper px-2 py-0.5"
        >
          <option value="all">all kinds</option>
          <option value="capex">capex</option>
          <option value="capex_exclude">capex_exclude</option>
          <option value="fortress_thesis">fortress_thesis</option>
          <option value="distribution_authoritative_domain">
            distribution_authoritative_domain
          </option>
        </select>
        <span className="opacity-60 self-center">
          ({visible.length} of {patterns.length})
        </span>
      </div>

      <div className="border-2 border-ink bg-paper max-h-[420px] overflow-auto">
        {visible.length === 0 ? (
          <div className="px-4 py-3 font-mono text-xs opacity-60">
            no patterns match this filter.
          </div>
        ) : (
          visible.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-[80px_140px_1fr_60px_70px] gap-2 px-3 py-1.5 border-b border-ink/15 font-mono text-[11px] items-center"
            >
              <span className="opacity-70">{p.axis}</span>
              <span className="opacity-70">{p.kind}</span>
              <code className="break-all">{p.pattern}</code>
              <span
                className={`text-right ${p.status === "active" ? "text-success" : "opacity-50"}`}
              >
                {p.status}
              </span>
              <button
                onClick={() => togglePattern(p.id, p.status)}
                className="font-mono text-[10px] tracking-[0.1em] uppercase font-bold bg-paper px-2 py-0.5 border border-ink cursor-pointer hover:bg-bg"
              >
                {p.status === "active" ? "disable" : "enable"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/* ──────────────────────── weights admin ──────────────────────── */

function WeightsAdmin({ weights }: { weights: WeightRow[] }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const save = async (key: string) => {
    setBusy(true);
    setMsg(null);
    try {
      const value = Number(draft);
      if (!Number.isFinite(value)) {
        setMsg("value must be a number");
        return;
      }
      const res = await fetch("/api/admin/scoring-weights", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key, value }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) {
        setMsg(json.error ?? `failed (${res.status})`);
      } else {
        setEditing(null);
        startTransition(() => router.refresh());
      }
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <h2 className="font-display text-lg lowercase mb-2">scoring weights.</h2>
      <div className="border-2 border-ink bg-paper max-h-[420px] overflow-auto">
        {weights.map((w) => (
          <div
            key={w.key}
            className="grid grid-cols-[1fr_80px_120px] gap-2 px-3 py-1.5 border-b border-ink/15 font-mono text-[11px] items-center"
          >
            <div className="min-w-0">
              <code className="font-bold">{w.key}</code>
              {w.description && (
                <div className="opacity-60 text-[10.5px] [text-wrap:pretty]">
                  {w.description}
                </div>
              )}
            </div>
            <div className="text-right font-bold">
              {editing === w.key ? (
                <input
                  type="number"
                  step="0.1"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="w-full border-2 border-ink bg-paper px-1 py-0.5 text-right"
                  autoFocus
                />
              ) : (
                w.value
              )}
            </div>
            <div className="text-right">
              {editing === w.key ? (
                <>
                  <button
                    onClick={() => save(w.key)}
                    disabled={busy}
                    className="font-mono text-[10px] tracking-[0.1em] uppercase font-bold bg-ink text-accent px-2 py-0.5 border border-ink cursor-pointer disabled:opacity-50"
                  >
                    save
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="ml-1 font-mono text-[10px] tracking-[0.1em] uppercase bg-paper px-2 py-0.5 border border-ink cursor-pointer"
                  >
                    ×
                  </button>
                </>
              ) : (
                <button
                  onClick={() => {
                    setEditing(w.key);
                    setDraft(String(w.value));
                  }}
                  className="font-mono text-[10px] tracking-[0.1em] uppercase font-bold bg-paper px-2 py-0.5 border border-ink cursor-pointer hover:bg-bg"
                >
                  edit
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      {msg && <div className="mt-2 font-mono text-[11px] opacity-80">{msg}</div>}
    </div>
  );
}
