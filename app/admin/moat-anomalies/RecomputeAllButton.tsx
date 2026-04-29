"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Top-level "Recompute all" button for the moat-anomalies page. Calls the
 * bulk endpoint, then router.refresh() so the anomaly list reflects new
 * scores immediately. Sequential server-side; with ~30 reports it
 * completes in a few seconds.
 */
export function RecomputeAllButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (loading) return;
    setLoading(true);
    setResult(null);
    setError(null);
    try {
      const res = await fetch("/api/admin/reports/recompute-all", { method: "POST" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setError(text.slice(0, 200) || `Recompute failed (${res.status})`);
        return;
      }
      const body = (await res.json()) as { processed: number; failed: number };
      setResult(`recomputed ${body.processed} · ${body.failed} failed`);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="bru-sm bg-accent px-3 py-1.5 font-display text-xs text-ink disabled:opacity-60"
      >
        {loading ? "Recomputing…" : "Recompute all reports →"}
      </button>
      <span className="text-xs text-muted">
        Re-runs projection + moat scoring against current taxonomy.
      </span>
      {result ? (
        <span className="rounded border-2 border-ink bg-paper-alt px-2 py-1 text-xs text-ink">
          {result}
        </span>
      ) : null}
      {error ? (
        <span className="rounded border-2 border-danger bg-paper-alt px-2 py-1 text-xs text-ink">
          {error}
        </span>
      ) : null}
    </div>
  );
}
