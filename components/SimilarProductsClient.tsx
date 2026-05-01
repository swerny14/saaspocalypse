"use client";

import { useEffect, useState } from "react";
import type { SimilarReport } from "@/lib/db/neighbors";
import { SimilarProductsRail } from "./SimilarProducts/SimilarProductsRail";

type Props = {
  sourceSlug: string;
};

type SimilarResponse =
  | { ok: true; similar: SimilarReport[] }
  | { ok: false; reason: string };

export function SimilarProductsClient({ sourceSlug }: Props) {
  const [similar, setSimilar] = useState<SimilarReport[] | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch(`/api/reports/${encodeURIComponent(sourceSlug)}/similar`);
        if (!res.ok) return;
        const data = (await res.json()) as SimilarResponse;
        if (!cancelled && data.ok) setSimilar(data.similar);
      } catch {
        if (!cancelled) setSimilar([]);
      }
    }

    setSimilar(null);
    void load();

    return () => {
      cancelled = true;
    };
  }, [sourceSlug]);

  if (!similar || similar.length === 0) return null;

  return <SimilarProductsRail sourceSlug={sourceSlug} similar={similar} />;
}
