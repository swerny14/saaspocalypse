"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  unsuggestedCount: number;
  totalCount: number;
};

/**
 * Calls POST /api/admin/unknowns/suggest. The endpoint runs Claude over every
 * open row (capped at 50) and writes the suggestions back to the DB. We then
 * router.refresh() so the page re-renders with the new fields visible.
 *
 * Idempotent server-side, so re-clicking is safe — it overwrites prior
 * suggestions. Useful when the taxonomy has changed materially since the
 * last suggestion run and existing notes are stale.
 */
export function SuggestAllButton({ unsuggestedCount, totalCount }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/unknowns/suggest", { method: "POST" });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setError(text.slice(0, 200) || `Request failed (${res.status})`);
        return;
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "network error");
    } finally {
      setLoading(false);
    }
  }

  const label = unsuggestedCount > 0
    ? `Suggest ${unsuggestedCount} unsuggested →`
    : `Re-suggest all ${totalCount} →`;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="bru-sm bg-purple px-3 py-1.5 font-display text-xs text-ink disabled:opacity-60"
      >
        {loading ? "Asking Claude…" : label}
      </button>
      <span className="text-xs text-muted">
        Batches up to 50 rows in one Claude call. ~$0.03 per run.
      </span>
      {error ? (
        <span className="rounded border-2 border-danger bg-paper-alt px-2 py-1 text-xs text-ink">
          {error}
        </span>
      ) : null}
    </div>
  );
}
