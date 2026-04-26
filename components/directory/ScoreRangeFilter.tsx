"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

type Props = {
  initialMin: number;
  initialMax: number;
};

export function ScoreRangeFilter({ initialMin, initialMax }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [min, setMin] = useState(initialMin);
  const [max, setMax] = useState(initialMax);
  const [, startTransition] = useTransition();

  useEffect(() => {
    setMin(initialMin);
    setMax(initialMax);
  }, [initialMin, initialMax]);

  function commit(nextMin: number, nextMax: number) {
    const params = new URLSearchParams(searchParams.toString());
    const lo = Math.max(0, Math.min(100, nextMin));
    const hi = Math.max(0, Math.min(100, nextMax));
    if (lo === 0) params.delete("scoreMin");
    else params.set("scoreMin", String(lo));
    if (hi === 100) params.delete("scoreMax");
    else params.set("scoreMax", String(hi));
    params.delete("page");
    startTransition(() => {
      router.replace(`/directory?${params.toString()}`);
    });
  }

  const leftPct = (min / 100) * 100;
  const rightPct = 100 - (max / 100) * 100;

  return (
    <div>
      <div className="relative h-9 border-2 border-ink bg-paper mb-1.5">
        <div
          className="absolute inset-y-0 bg-accent border-l-2 border-r-2 border-ink"
          style={{ left: `${leftPct}%`, right: `${rightPct}%` }}
        />
        <span className="absolute left-2 top-[9px] font-mono text-[11px] font-bold pointer-events-none">
          0
        </span>
        <span className="absolute right-2 top-[9px] font-mono text-[11px] font-bold pointer-events-none">
          100
        </span>
      </div>
      <div className="flex items-center gap-2 font-mono text-[11px]">
        <label className="flex items-center gap-1.5 flex-1">
          <span className="opacity-60">min:</span>
          <input
            type="number"
            min={0}
            max={100}
            value={min}
            aria-label="Minimum score"
            onChange={(e) => setMin(Number(e.target.value))}
            onBlur={() => commit(min, max)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(min, max);
            }}
            className="w-full px-1.5 py-0.5 border-[1.5px] border-ink bg-paper font-mono text-[11px] font-bold outline-none"
          />
        </label>
        <label className="flex items-center gap-1.5 flex-1">
          <span className="opacity-60">max:</span>
          <input
            type="number"
            min={0}
            max={100}
            value={max}
            aria-label="Maximum score"
            onChange={(e) => setMax(Number(e.target.value))}
            onBlur={() => commit(min, max)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit(min, max);
            }}
            className="w-full px-1.5 py-0.5 border-[1.5px] border-ink bg-paper font-mono text-[11px] font-bold outline-none"
          />
        </label>
      </div>
    </div>
  );
}
