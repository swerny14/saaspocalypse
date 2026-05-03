"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  slug: string;
  reviewStatus: "pending" | "verified";
  hasMoat: boolean;
};

export function ScoreTableActions({ slug, reviewStatus, hasMoat }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const disabled = busy || isPending || !hasMoat;

  async function setReview(status: "pending" | "verified") {
    setBusy(true);
    try {
      const res = await fetch(`/api/admin/reports/${slug}/moat-review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error(await res.text());
      startTransition(() => router.refresh());
    } finally {
      setBusy(false);
    }
  }

  if (reviewStatus === "verified") {
    return (
      <button
        type="button"
        onClick={() => setReview("pending")}
        disabled={disabled}
        className="border border-success bg-paper-alt px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-success hover:bg-bg disabled:cursor-not-allowed disabled:opacity-45"
      >
        {busy ? "saving..." : "verified"}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setReview("verified")}
      disabled={disabled}
      className="border border-ink bg-accent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.08em] text-ink hover:bg-success disabled:cursor-not-allowed disabled:opacity-45"
    >
      {busy ? "saving..." : "verify"}
    </button>
  );
}
