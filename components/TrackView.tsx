"use client";

import { useEffect, useRef } from "react";

export function TrackView({ slug }: { slug: string }) {
  const fired = useRef<string | null>(null);
  useEffect(() => {
    if (fired.current === slug) return;
    fired.current = slug;
    fetch(`/api/reports/${slug}/view`, { method: "POST", keepalive: true }).catch(() => {});
  }, [slug]);
  return null;
}
