"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type CapabilityOption = {
  slug: string;
  display_name: string;
  category: string;
  pattern_count: number;
  moat_tags: string[];
};

export type Suggestion =
  | {
      kind: "add_pattern";
      capability_slug: string;
      pattern: string;
      evidence: string;
    }
  | {
      kind: "new_capability";
      slug: string;
      display_name: string;
      category: string;
      match_patterns: string[];
      moat_tags: string[];
      evidence: string;
    };

export type FlaggedRow = {
  slug: string;
  name: string;
  tagline: string;
  tier: string;
  score: number;
  moat: {
    aggregate: number;
    capital: number;
    technical: number;
    network: number;
    switching: number;
    data_moat: number;
    regulatory: number;
  };
  /** "verified" rows are hidden by default; toggle reveals them. */
  review_status: "pending" | "verified";
  reviewed_at: string | null;
  /** Persisted LLM audit (null until the row has been audited). Surfaces
   *  inline as a banner below the anomaly summary so the curator can
   *  apply suggestions without clicking through each row. */
  audit_summary: string | null;
  audit_suggestions: Suggestion[] | null;
  audited_at: string | null;
  anomalies: Array<{
    reason: string;
    explanation: string;
    axes: string[];
  }>;
  verdict_excerpt: {
    take: string;
    take_sub: string;
    challenges: Array<{ diff: string; name: string; note: string }>;
    est_cost_lines: Array<{ line: string; cost: string }>;
  };
};

type AuditState =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; verdict_summary: string; suggestions: Suggestion[] }
  | { kind: "error"; message: string };

const AXES = [
  "capital",
  "technical",
  "network",
  "switching",
  "data_moat",
  "regulatory",
] as const;

const AXIS_LABELS: Record<string, string> = {
  capital: "Capital",
  technical: "Technical",
  network: "Network",
  switching: "Switching",
  data_moat: "Data",
  regulatory: "Regulatory",
};

type Queue = "pending" | "verified" | "all";

const BULK_AUDIT_CHUNK_SIZE = 5;

type BulkAuditState =
  | { kind: "idle" }
  | { kind: "running"; total: number; done: number; ok: number; errors: number }
  | { kind: "done"; total: number; ok: number; errors: number; skipped: number }
  | { kind: "error"; message: string };

export function AnomalyTriage({
  rows,
  capabilities,
}: {
  rows: FlaggedRow[];
  capabilities: CapabilityOption[];
}) {
  const router = useRouter();
  const [queue, setQueue] = useState<Queue>("pending");
  const [bulk, setBulk] = useState<BulkAuditState>({ kind: "idle" });

  const counts = useMemo(() => {
    let pendingAnomaly = 0;
    let verifiedAnomaly = 0;
    let nonAnomalyPending = 0;
    let nonAnomalyVerified = 0;
    for (const r of rows) {
      const isAnomaly = r.anomalies.length > 0;
      const isVerified = r.review_status === "verified";
      if (isAnomaly && !isVerified) pendingAnomaly += 1;
      else if (isAnomaly && isVerified) verifiedAnomaly += 1;
      else if (!isAnomaly && !isVerified) nonAnomalyPending += 1;
      else nonAnomalyVerified += 1;
    }
    return {
      pendingAnomaly,
      verifiedAnomaly,
      nonAnomalyPending,
      nonAnomalyVerified,
      pendingTotal: pendingAnomaly + nonAnomalyPending,
      verifiedTotal: verifiedAnomaly + nonAnomalyVerified,
      all: rows.length,
    };
  }, [rows]);

  const visible = useMemo(() => {
    return rows.filter((r) => {
      const isVerified = r.review_status === "verified";
      if (queue === "pending") return !isVerified;
      if (queue === "verified") return isVerified;
      return true;
    });
  }, [rows, queue]);

  const unauditedSlugs = useMemo(
    () =>
      visible
        .filter((r) => r.audit_summary === null)
        .map((r) => r.slug),
    [visible],
  );

  async function runBulkAudit(forceAll: boolean) {
    const targets = forceAll
      ? visible.map((r) => r.slug)
      : unauditedSlugs;
    if (targets.length === 0) return;
    setBulk({ kind: "running", total: targets.length, done: 0, ok: 0, errors: 0 });

    let okCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < targets.length; i += BULK_AUDIT_CHUNK_SIZE) {
      const chunk = targets.slice(i, i + BULK_AUDIT_CHUNK_SIZE);
      try {
        const res = await fetch("/api/admin/moat-anomalies/audit-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slugs: chunk }),
        });
        if (!res.ok) {
          errorCount += chunk.length;
        } else {
          const body = (await res.json()) as {
            counts: { ok: number; skipped: number; error: number };
          };
          okCount += body.counts.ok;
          errorCount += body.counts.error;
          skippedCount += body.counts.skipped;
        }
      } catch {
        errorCount += chunk.length;
      }
      setBulk({
        kind: "running",
        total: targets.length,
        done: Math.min(i + chunk.length, targets.length),
        ok: okCount,
        errors: errorCount,
      });
    }

    setBulk({
      kind: "done",
      total: targets.length,
      ok: okCount,
      errors: errorCount,
      skipped: skippedCount,
    });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-1 border-2 border-ink bg-paper-alt p-1 rounded self-start">
        <QueueTab
          active={queue === "pending"}
          onClick={() => setQueue("pending")}
          label="Pending review"
          count={counts.pendingTotal}
          breakdown={`${counts.pendingAnomaly} anomaly · ${counts.nonAnomalyPending} no anomaly`}
        />
        <QueueTab
          active={queue === "verified"}
          onClick={() => setQueue("verified")}
          label="Verified"
          count={counts.verifiedTotal}
          breakdown={`${counts.verifiedAnomaly} anomaly · ${counts.nonAnomalyVerified} no anomaly`}
        />
        <QueueTab
          active={queue === "all"}
          onClick={() => setQueue("all")}
          label="All scored"
          count={counts.all}
          breakdown=""
        />
      </div>

      <BulkAuditBar
        queueLabel={
          queue === "pending"
            ? "pending"
            : queue === "verified"
              ? "verified"
              : "all-scored"
        }
        visibleCount={visible.length}
        unauditedCount={unauditedSlugs.length}
        bulk={bulk}
        onRun={(forceAll) => runBulkAudit(forceAll)}
      />

      {visible.length === 0 ? (
        <div className="bru bg-paper-alt p-6 text-center text-sm text-muted">
          {queue === "pending"
            ? "Pending queue empty — every scored report has been reviewed. Switch to ‘Verified’ to inspect dismissed rows."
            : queue === "verified"
              ? "No verified rows yet. Mark a pending row verified to move it here."
              : "No reports scored yet."}
        </div>
      ) : (
        visible.map((row) => (
          <AnomalyCard key={row.slug} row={row} capabilities={capabilities} />
        ))
      )}
    </div>
  );
}

function BulkAuditBar({
  queueLabel,
  visibleCount,
  unauditedCount,
  bulk,
  onRun,
}: {
  queueLabel: string;
  visibleCount: number;
  unauditedCount: number;
  bulk: BulkAuditState;
  onRun: (forceAll: boolean) => void;
}) {
  if (visibleCount === 0) return null;
  const isRunning = bulk.kind === "running";
  return (
    <div className="bru-sm bg-paper-alt p-3 flex flex-wrap items-center gap-3">
      <div className="text-xs text-muted">
        <span className="font-display uppercase tracking-[0.15em] text-purple text-[10px]">
          bulk audit
        </span>{" "}
        — {unauditedCount} of {visibleCount} {queueLabel} row
        {visibleCount === 1 ? "" : "s"} not yet audited.
      </div>
      <button
        type="button"
        disabled={isRunning || unauditedCount === 0}
        onClick={() => onRun(false)}
        className="bru-sm bg-purple px-3 py-1 font-display text-xs text-ink disabled:opacity-60"
      >
        {isRunning
          ? `Auditing ${bulk.done}/${bulk.total}…`
          : unauditedCount === 0
            ? "All audited"
            : `✦ Audit ${unauditedCount} un-audited`}
      </button>
      {visibleCount > unauditedCount ? (
        <button
          type="button"
          disabled={isRunning}
          onClick={() => onRun(true)}
          className="px-3 py-1 font-display text-xs text-muted hover:text-ink border-2 border-ink/30 rounded disabled:opacity-60"
        >
          ↻ Re-audit all {visibleCount}
        </button>
      ) : null}
      {bulk.kind === "done" ? (
        <span className="font-mono text-[11px] text-ink">
          done · {bulk.ok} ok
          {bulk.errors > 0 ? ` · ${bulk.errors} error${bulk.errors === 1 ? "" : "s"}` : ""}
          {bulk.skipped > 0 ? ` · ${bulk.skipped} skipped` : ""}
        </span>
      ) : null}
      {bulk.kind === "error" ? (
        <span className="font-mono text-[11px] text-danger">{bulk.message}</span>
      ) : null}
    </div>
  );
}

function QueueTab({
  active,
  onClick,
  label,
  count,
  breakdown,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count: number;
  breakdown: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 font-display text-xs rounded ${
        active
          ? "bg-ink text-paper"
          : "bg-paper text-ink hover:bg-bg"
      }`}
    >
      <span className="uppercase tracking-[0.1em]">{label}</span>{" "}
      <span className={active ? "opacity-80" : "opacity-60"}>· {count}</span>
      {breakdown ? (
        <span className={`ml-2 font-mono text-[10px] ${active ? "opacity-70" : "opacity-50"}`}>
          ({breakdown})
        </span>
      ) : null}
    </button>
  );
}

function AnomalyCard({
  row,
  capabilities,
}: {
  row: FlaggedRow;
  capabilities: CapabilityOption[];
}) {
  const router = useRouter();
  const [showVerdict, setShowVerdict] = useState(false);
  const [audit, setAudit] = useState<AuditState>(
    row.audit_summary !== null
      ? {
          kind: "ready",
          verdict_summary: row.audit_summary,
          suggestions: row.audit_suggestions ?? [],
        }
      : { kind: "idle" },
  );
  const [recomputing, setRecomputing] = useState(false);
  const [recomputeMsg, setRecomputeMsg] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [reviewMsg, setReviewMsg] = useState<string | null>(null);

  async function setReview(status: "verified" | "pending") {
    if (reviewing) return;
    setReviewing(true);
    setReviewMsg(null);
    try {
      const res = await fetch(`/api/admin/reports/${row.slug}/moat-review`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setReviewMsg(text.slice(0, 200) || `Review update failed (${res.status})`);
        return;
      }
      router.refresh();
    } catch (e) {
      setReviewMsg(e instanceof Error ? e.message : "network error");
    } finally {
      setReviewing(false);
    }
  }

  async function recomputeOne() {
    if (recomputing) return;
    setRecomputing(true);
    setRecomputeMsg(null);
    try {
      const res = await fetch(`/api/admin/reports/${row.slug}/recompute`, {
        method: "POST",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setRecomputeMsg(text.slice(0, 200) || `Recompute failed (${res.status})`);
        return;
      }
      const body = (await res.json()) as {
        moat: { aggregate: number };
        capability_count: number;
      };
      setRecomputeMsg(
        `recomputed → ${body.moat.aggregate.toFixed(1)}/10 · ${body.capability_count} capabilities`,
      );
      router.refresh();
    } catch (e) {
      setRecomputeMsg(e instanceof Error ? e.message : "network error");
    } finally {
      setRecomputing(false);
    }
  }

  async function runAudit() {
    setAudit({ kind: "loading" });
    try {
      const res = await fetch(`/api/admin/reports/${row.slug}/audit`, {
        method: "POST",
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setAudit({
          kind: "error",
          message: text.slice(0, 200) || `Audit failed (${res.status})`,
        });
        return;
      }
      const body = (await res.json()) as {
        verdict_summary: string;
        suggestions: Suggestion[];
      };
      setAudit({
        kind: "ready",
        verdict_summary: body.verdict_summary,
        suggestions: body.suggestions,
      });
    } catch (e) {
      setAudit({
        kind: "error",
        message: e instanceof Error ? e.message : "network error",
      });
    }
  }

  return (
    <div className="bru bg-paper p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3 mb-2">
        <div className="min-w-0">
          <Link
            href={`/r/${row.slug}`}
            target="_blank"
            className="font-display text-lg text-ink hover:underline"
          >
            {row.name}
          </Link>
          <span className="ml-2 font-mono text-xs text-muted">{row.slug}</span>
          <div className="text-xs text-muted mt-0.5">{row.tagline}</div>
        </div>
        <div className="text-right">
          <div className="font-mono text-xs uppercase tracking-[0.15em] text-muted">
            tier · {row.tier} · score {row.score}
          </div>
          <div className="font-display text-2xl font-bold text-ink leading-none mt-1">
            {row.moat.aggregate.toFixed(1)}
            <span className="text-xs opacity-60"> / 10</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1 mb-3">
        {AXES.map((axis) => (
          <AxisChip key={axis} label={AXIS_LABELS[axis]} value={row.moat[axis]} />
        ))}
      </div>

      {row.anomalies.length > 0 ? (
        <div
          className={`border-2 ${row.review_status === "verified" ? "border-success bg-paper-alt" : "border-purple bg-paper-alt"} rounded p-2 text-[12px] mb-3`}
        >
          {row.review_status === "verified" ? (
            <div className="font-display uppercase tracking-[0.15em] text-success text-[10px] mb-1">
              verified ✓
            </div>
          ) : null}
          {row.anomalies.map((a, i) => (
            <div key={i} className={i === 0 ? "" : "mt-1"}>
              <span className="font-display uppercase tracking-[0.15em] text-purple text-[10px]">
                {a.reason.replace(/_/g, " ")}
              </span>{" "}
              <span className="text-ink">{a.explanation}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="border-2 border-ink/20 bg-paper-alt rounded p-2 text-[12px] mb-3 text-muted">
          <span className="font-display uppercase tracking-[0.15em] text-ink/60 text-[10px]">
            no anomaly
          </span>{" "}
          score aligns with tier on the current heuristics — surfaced here
          for manual review only.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <button
          type="button"
          onClick={() => setShowVerdict((v) => !v)}
          className="px-3 py-1 font-display text-xs text-muted hover:text-ink border-2 border-ink/30 rounded"
        >
          {showVerdict ? "Hide verdict text" : "Show verdict text"}
        </button>
        <button
          type="button"
          onClick={runAudit}
          disabled={audit.kind === "loading"}
          className="bru-sm bg-purple px-3 py-1 font-display text-xs text-ink disabled:opacity-60"
        >
          {audit.kind === "loading"
            ? "Auditing…"
            : row.audit_summary !== null
              ? "↻ Re-audit"
              : "✦ AI audit this report"}
        </button>
        <button
          type="button"
          onClick={recomputeOne}
          disabled={recomputing}
          className="bru-sm bg-coral px-3 py-1 font-display text-xs text-ink disabled:opacity-60"
        >
          {recomputing ? "Recomputing…" : "↻ Recompute this report"}
        </button>
        {row.review_status === "pending" ? (
          <button
            type="button"
            onClick={() => setReview("verified")}
            disabled={reviewing}
            className="bru-sm bg-success px-3 py-1 font-display text-xs text-ink disabled:opacity-60"
          >
            {reviewing ? "Saving…" : "✓ Mark verified"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => setReview("pending")}
            disabled={reviewing}
            className="bru-sm bg-paper-alt px-3 py-1 font-display text-xs text-ink disabled:opacity-60 border-2 border-success"
          >
            {reviewing ? "Saving…" : "↺ Re-flag (verified ✓)"}
          </button>
        )}
        {recomputeMsg ? (
          <span className="font-mono text-[11px] text-ink">{recomputeMsg}</span>
        ) : null}
        {reviewMsg ? (
          <span className="font-mono text-[11px] text-danger">{reviewMsg}</span>
        ) : null}
      </div>

      {showVerdict ? (
        <div className="border-2 border-ink/30 rounded p-3 text-xs text-ink mb-3 space-y-2">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              take
            </div>
            <div>{row.verdict_excerpt.take}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              take_sub
            </div>
            <div>{row.verdict_excerpt.take_sub}</div>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              challenges
            </div>
            <ul className="list-disc list-inside">
              {row.verdict_excerpt.challenges.map((c, i) => (
                <li key={i}>
                  <span className="font-mono text-[10px] uppercase opacity-50">
                    {c.diff}
                  </span>{" "}
                  {c.name}: <span className="opacity-80">{c.note}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted">
              est_cost lines
            </div>
            <ul className="list-disc list-inside">
              {row.verdict_excerpt.est_cost_lines.map((l, i) => (
                <li key={i}>
                  {l.line} · <span className="opacity-70">{l.cost}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {audit.kind === "ready" ? (
        <AuditResults
          summary={audit.verdict_summary}
          suggestions={audit.suggestions}
          capabilities={capabilities}
        />
      ) : null}
      {audit.kind === "error" ? (
        <div className="rounded border-2 border-danger bg-paper-alt p-2 text-xs text-ink mb-3">
          {audit.message}
        </div>
      ) : null}

      <FixForms capabilities={capabilities} />
    </div>
  );
}

function AxisChip({ label, value }: { label: string; value: number }) {
  const tone = value >= 8 ? "bg-success" : value >= 4 ? "bg-sticky" : value === 0 ? "bg-paper-alt" : "bg-bg";
  return (
    <div className={`border-2 border-ink ${tone} px-2 py-1 text-[11px] flex justify-between gap-1`}>
      <span className="font-mono opacity-70">{label}</span>
      <span className="font-display font-bold">{value.toFixed(1)}</span>
    </div>
  );
}

export function AuditResults({
  summary,
  suggestions,
  capabilities,
}: {
  summary: string;
  suggestions: Suggestion[];
  capabilities: CapabilityOption[];
}) {
  const [appliedIndex, setAppliedIndex] = useState<Set<number>>(new Set());
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [errorIndex, setErrorIndex] = useState<{ i: number; msg: string } | null>(null);

  async function applySuggestion(i: number, s: Suggestion) {
    setBusyIndex(i);
    setErrorIndex(null);
    try {
      let res: Response;
      if (s.kind === "add_pattern") {
        res = await fetch(
          `/api/admin/capabilities/${encodeURIComponent(s.capability_slug)}/patterns`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pattern: s.pattern }),
          },
        );
      } else {
        res = await fetch("/api/admin/capabilities", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slug: s.slug,
            display_name: s.display_name,
            category: s.category,
            match_patterns: s.match_patterns,
            moat_tags: s.moat_tags,
          }),
        });
      }
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setErrorIndex({
          i,
          msg: text.slice(0, 200) || `Apply failed (${res.status})`,
        });
        return;
      }
      const next = new Set(appliedIndex);
      next.add(i);
      setAppliedIndex(next);
    } catch (e) {
      setErrorIndex({ i, msg: e instanceof Error ? e.message : "network error" });
    } finally {
      setBusyIndex(null);
    }
  }

  if (suggestions.length === 0) {
    return (
      <div className="border-2 border-purple/40 bg-paper-alt rounded p-3 text-xs text-ink mb-3">
        <div className="font-display uppercase tracking-[0.15em] text-purple text-[10px] mb-1">
          ai audit
        </div>
        <div className="italic mb-2">{summary}</div>
        <div className="text-muted">
          Claude found no missing capabilities — the score may be honest.
        </div>
      </div>
    );
  }

  return (
    <div className="border-2 border-purple/40 bg-paper-alt rounded p-3 text-xs text-ink mb-3 space-y-3">
      <div>
        <div className="font-display uppercase tracking-[0.15em] text-purple text-[10px] mb-1">
          ai audit
        </div>
        <div className="italic">{summary}</div>
      </div>
      {suggestions.map((s, i) => {
        const isApplied = appliedIndex.has(i);
        const cap =
          s.kind === "add_pattern"
            ? capabilities.find((c) => c.slug === s.capability_slug)
            : null;
        const tags = s.kind === "add_pattern" ? (cap?.moat_tags ?? []) : s.moat_tags;
        const affectedAxes = axesFromMoatTags(tags);
        const blocked = hasNegatedEvidence(s);
        return (
          <div
            key={i}
            className={`border-2 ${isApplied ? "border-success bg-paper" : "border-ink/30 bg-paper"} rounded p-2`}
          >
            {s.kind === "add_pattern" ? (
              <div>
                <div className="font-mono text-[11px]">
                  <span className="font-bold uppercase tracking-[0.1em] text-purple">
                    add pattern
                  </span>{" "}
                  → <span className="font-bold">{s.capability_slug}</span>
                  {cap ? (
                    <span className="opacity-50">
                      {" "}
                      ({cap.category} · {cap.moat_tags.join(", ") || "no moat tags"})
                    </span>
                  ) : null}
                </div>
                <AxisImpact axes={affectedAxes} />
                <div className="font-mono text-[12px] mt-1">
                  pattern: <span className="bg-bg px-1 py-0.5 border border-ink/40">{s.pattern}</span>
                </div>
              </div>
            ) : (
              <div>
                <div className="font-mono text-[11px]">
                  <span className="font-bold uppercase tracking-[0.1em] text-purple">
                    new capability
                  </span>{" "}
                  → <span className="font-bold">{s.slug}</span>
                  <span className="opacity-50">
                    {" "}
                    ({s.category} · {s.moat_tags.join(", ") || "no moat tags"})
                  </span>
                </div>
                <AxisImpact axes={affectedAxes} />
                <div className="font-mono text-[11px] mt-1">
                  display: <span className="opacity-80">{s.display_name}</span>
                </div>
                <div className="font-mono text-[11px] mt-1">
                  patterns:{" "}
                  {s.match_patterns.map((p, k) => (
                    <span
                      key={k}
                      className="inline-block bg-bg px-1 py-0.5 border border-ink/40 mr-1 mb-1"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div className="text-[11px] opacity-70 italic mt-1.5">
              evidence: &ldquo;{s.evidence}&rdquo;
            </div>
            {blocked ? (
              <div className="mt-1.5 border border-danger/50 bg-danger/10 px-2 py-1 font-mono text-[11px] text-danger">
                blocked: this evidence reads like absence/weakness, so applying
                it would likely raise the wrong axis.
              </div>
            ) : null}
            <div className="mt-2">
              <button
                type="button"
                disabled={blocked || isApplied || busyIndex === i}
                onClick={() => applySuggestion(i, s)}
                className={`bru-sm px-2 py-0.5 font-display text-[10px] ${isApplied ? "bg-success" : "bg-accent"} text-ink disabled:opacity-60`}
              >
                {blocked ? "Blocked" : isApplied ? "Applied" : busyIndex === i ? "Applying..." : "Apply"}
              </button>
              {errorIndex?.i === i ? (
                <span className="ml-2 text-[11px] text-danger">{errorIndex.msg}</span>
              ) : null}
            </div>
          </div>
        );
      })}
      <div className="text-[11px] text-muted">
        After applying, recompute this report to verify the score movement.
      </div>
    </div>
  );
}

function axesFromMoatTags(tags: string[]): string[] {
  const axes = new Set<string>();
  for (const tag of tags) {
    if (
      tag === "multi_sided" ||
      tag === "ugc" ||
      tag === "marketplace" ||
      tag === "viral_loop"
    ) {
      axes.add("network");
    }
    if (
      tag === "data_storage" ||
      tag === "workflow_lock_in" ||
      tag === "integration_hub"
    ) {
      axes.add("switching");
    }
    if (
      tag === "proprietary_dataset" ||
      tag === "training_data" ||
      tag === "behavioral"
    ) {
      axes.add("data moat");
    }
    if (
      tag === "hipaa" ||
      tag === "finra" ||
      tag === "gdpr_critical" ||
      tag === "licensed"
    ) {
      axes.add("regulatory");
    }
  }
  return Array.from(axes);
}

function hasNegatedEvidence(s: Suggestion): boolean {
  const text =
    s.kind === "add_pattern"
      ? `${s.pattern} ${s.evidence}`
      : `${s.match_patterns.join(" ")} ${s.evidence}`;
  return /\b(no\s+|not\s+|without\s+|lacks?\s+|lacking\s+|lack of\s+|near[- ]zero|zero\s+(network|switching|data|moat|moats)|low\s+(network|switching|data|moat|moats)|users export\b|export .* leave\b)/i.test(
    text,
  );
}

function AxisImpact({ axes }: { axes: string[] }) {
  return (
    <div className="font-mono text-[11px] mt-1 flex flex-wrap gap-1 items-center">
      <span className="opacity-60">affects axis:</span>
      {axes.length === 0 ? (
        <span className="opacity-50">none</span>
      ) : (
        axes.map((axis) => (
          <span key={axis} className="bg-accent/40 border border-ink/30 px-1">
            {axis}
          </span>
        ))
      )}
    </div>
  );
}

const MOAT_TAGS = [
  "multi_sided",
  "ugc",
  "marketplace",
  "viral_loop",
  "data_storage",
  "workflow_lock_in",
  "integration_hub",
  "proprietary_dataset",
  "training_data",
  "behavioral",
  "hipaa",
  "finra",
  "gdpr_critical",
  "licensed",
] as const;

const CATEGORIES = [
  "collab",
  "content",
  "commerce",
  "comm",
  "ai",
  "infra",
  "data",
  "workflow",
  "identity",
] as const;

export function FixForms({ capabilities }: { capabilities: CapabilityOption[] }) {
  const [openForm, setOpenForm] = useState<"none" | "add_pattern" | "new_cap">("none");

  return (
    <div>
      <div className="flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setOpenForm(openForm === "add_pattern" ? "none" : "add_pattern")}
          className="bru-sm bg-accent px-3 py-1 font-display text-xs text-ink"
        >
          + Add pattern to existing capability
        </button>
        <button
          type="button"
          onClick={() => setOpenForm(openForm === "new_cap" ? "none" : "new_cap")}
          className="bru-sm bg-sticky px-3 py-1 font-display text-xs text-ink"
        >
          + New capability
        </button>
      </div>
      {openForm === "add_pattern" ? (
        <AddPatternForm capabilities={capabilities} onClose={() => setOpenForm("none")} />
      ) : null}
      {openForm === "new_cap" ? (
        <NewCapabilityForm onClose={() => setOpenForm("none")} />
      ) : null}
    </div>
  );
}

function AddPatternForm({
  capabilities,
  onClose,
}: {
  capabilities: CapabilityOption[];
  onClose: () => void;
}) {
  const [slug, setSlug] = useState("");
  const [pattern, setPattern] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  const grouped = useMemo(() => {
    const out: Record<string, CapabilityOption[]> = {};
    for (const c of capabilities) {
      (out[c.category] ??= []).push(c);
    }
    return out;
  }, [capabilities]);

  async function submit() {
    if (!slug || !pattern.trim()) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch(
        `/api/admin/capabilities/${encodeURIComponent(slug)}/patterns`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pattern: pattern.trim() }),
        },
      );
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setMsg({ kind: "err", text: text.slice(0, 200) || `Failed (${res.status})` });
        return;
      }
      const body = (await res.json()) as { added: boolean };
      setMsg({
        kind: "ok",
        text: body.added ? "Pattern added." : "Pattern already present (no-op).",
      });
      setPattern("");
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-2 border-ink rounded p-3 bg-paper-alt grid sm:grid-cols-2 gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted">capability</span>
        <select
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          className="rounded border-2 border-ink bg-paper px-2 py-1 font-mono text-xs"
        >
          <option value="">— pick one —</option>
          {Object.entries(grouped)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([cat, items]) => (
              <optgroup key={cat} label={cat}>
                {items
                  .sort((a, b) => a.display_name.localeCompare(b.display_name))
                  .map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.display_name} · {c.pattern_count} patterns
                    </option>
                  ))}
              </optgroup>
            ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted">pattern</span>
        <input
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
          placeholder="e.g. card network"
          className="rounded border-2 border-ink bg-paper px-2 py-1 font-mono text-xs"
        />
      </label>
      <div className="sm:col-span-2 flex items-center gap-2">
        <button
          type="button"
          disabled={busy || !slug || !pattern.trim()}
          onClick={submit}
          className="bru-sm bg-success px-3 py-1 font-display text-xs text-ink disabled:opacity-60"
        >
          {busy ? "Adding…" : "Add pattern"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 font-display text-xs text-muted hover:text-ink"
        >
          Close
        </button>
        {msg ? (
          <span
            className={`text-[11px] ${msg.kind === "ok" ? "text-ink" : "text-danger"}`}
          >
            {msg.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}

function NewCapabilityForm({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState({
    slug: "",
    display_name: "",
    category: "infra" as (typeof CATEGORIES)[number],
    match_patterns: "",
    moat_tags: [] as string[],
  });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);

  function toggleTag(tag: string) {
    setForm((f) => ({
      ...f,
      moat_tags: f.moat_tags.includes(tag)
        ? f.moat_tags.filter((t) => t !== tag)
        : [...f.moat_tags, tag],
    }));
  }

  async function submit() {
    const patterns = form.match_patterns
      .split(/[\n,]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!form.slug || !form.display_name || patterns.length === 0) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/capabilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: form.slug,
          display_name: form.display_name,
          category: form.category,
          match_patterns: patterns,
          moat_tags: form.moat_tags,
        }),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setMsg({ kind: "err", text: text.slice(0, 200) || `Failed (${res.status})` });
        return;
      }
      setMsg({ kind: "ok", text: "Capability created." });
      setForm({
        slug: "",
        display_name: "",
        category: "infra",
        match_patterns: "",
        moat_tags: [],
      });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "network error" });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 border-2 border-ink rounded p-3 bg-paper-alt grid sm:grid-cols-2 gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted">slug</span>
        <input
          value={form.slug}
          onChange={(e) => setForm({ ...form, slug: e.target.value })}
          placeholder="kebab-case"
          className="rounded border-2 border-ink bg-paper px-2 py-1 font-mono text-xs"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted">display name</span>
        <input
          value={form.display_name}
          onChange={(e) => setForm({ ...form, display_name: e.target.value })}
          className="rounded border-2 border-ink bg-paper px-2 py-1 font-mono text-xs"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted">category</span>
        <select
          value={form.category}
          onChange={(e) =>
            setForm({ ...form, category: e.target.value as (typeof CATEGORIES)[number] })
          }
          className="rounded border-2 border-ink bg-paper px-2 py-1 font-mono text-xs"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1 sm:col-span-2">
        <span className="text-[10px] uppercase tracking-[0.15em] text-muted">
          match patterns (one per line, or comma-separated)
        </span>
        <textarea
          value={form.match_patterns}
          onChange={(e) => setForm({ ...form, match_patterns: e.target.value })}
          rows={3}
          placeholder="card network&#10;stablecoin rails&#10;cross-border payments"
          className="rounded border-2 border-ink bg-paper px-2 py-1 font-mono text-xs"
        />
      </label>
      <div className="sm:col-span-2">
        <div className="text-[10px] uppercase tracking-[0.15em] text-muted mb-1">
          moat tags
        </div>
        <div className="flex flex-wrap gap-1">
          {MOAT_TAGS.map((tag) => {
            const on = form.moat_tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-2 py-0.5 font-mono text-[11px] border-2 ${on ? "border-ink bg-accent" : "border-ink/30 bg-paper"}`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
      <div className="sm:col-span-2 flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={submit}
          className="bru-sm bg-success px-3 py-1 font-display text-xs text-ink disabled:opacity-60"
        >
          {busy ? "Creating…" : "Create capability"}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="px-3 py-1 font-display text-xs text-muted hover:text-ink"
        >
          Close
        </button>
        {msg ? (
          <span
            className={`text-[11px] ${msg.kind === "ok" ? "text-ink" : "text-danger"}`}
          >
            {msg.text}
          </span>
        ) : null}
      </div>
    </div>
  );
}
