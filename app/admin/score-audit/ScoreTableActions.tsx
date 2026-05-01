"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  slug: string;
  reviewStatus: "pending" | "verified";
  hasMoat: boolean;
  hasExpectation: boolean;
  flagCount: number;
};

export function ScoreTableActions({
  slug,
  reviewStatus,
  hasMoat,
  hasExpectation,
  flagCount,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState<"check" | "verify" | null>(null);
  const disabled = busy !== null || isPending || !hasMoat;

  async function runCheck() {
    setBusy("check");
    try {
      const res = await fetch(`/api/admin/reports/${slug}/score-expectation`, {
        method: "POST",
      });
      if (!res.ok) throw new Error(await res.text());
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  async function verifyScore() {
    setBusy("verify");
    try {
      const res = await fetch(`/api/admin/reports/${slug}/moat-review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status: "verified" }),
      });
      if (!res.ok) throw new Error(await res.text());
      startTransition(() => router.refresh());
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex justify-end gap-1.5">
      <button
        type="button"
        onClick={runCheck}
        disabled={disabled}
        className="border border-ink bg-paper px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink hover:bg-bg disabled:cursor-not-allowed disabled:opacity-45"
        title="Ask the LLM for qualitative axis bands and store mismatch flags."
      >
        {busy === "check" ? "checking..." : hasExpectation ? "recheck" : "check"}
      </button>
      {hasExpectation && flagCount === 0 && reviewStatus === "pending" ? (
        <button
          type="button"
          onClick={verifyScore}
          disabled={disabled}
          className="border border-ink bg-accent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink hover:bg-success disabled:cursor-not-allowed disabled:opacity-45"
          title="Mark this score verified because the expectation check found no red flags."
        >
          {busy === "verify" ? "saving..." : "verify"}
        </button>
      ) : null}
      {reviewStatus === "verified" ? (
        <span className="border border-success bg-paper-alt px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-success">
          verified
        </span>
      ) : null}
    </div>
  );
}
