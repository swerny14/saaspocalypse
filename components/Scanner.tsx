"use client";

import { useEffect, useRef, useState } from "react";
import {
  EXAMPLE_VERDICTS,
  PRESET_URLS,
  SCAN_STEPS,
  type Verdict,
} from "@/lib/content";

type Phase = "idle" | "scanning" | "done";

export function Scanner() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [url, setUrl] = useState("notion-ish.com");
  const [verdictIdx, setVerdictIdx] = useState(0);
  const [step, setStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase !== "scanning") return;
    let i = 0;
    setStep(0);
    const id = setInterval(() => {
      i += 1;
      setStep(i);
      if (i >= SCAN_STEPS.length) {
        clearInterval(id);
        setTimeout(() => setPhase("done"), 300);
      }
    }, 450);
    return () => clearInterval(id);
  }, [phase]);

  const start = (u?: string, idx?: number) => {
    if (u !== undefined) setUrl(u);
    if (typeof idx === "number") setVerdictIdx(idx);
    setPhase("scanning");
  };
  const reset = () => {
    setPhase("idle");
    setStep(0);
  };

  const verdict = EXAMPLE_VERDICTS[verdictIdx];

  return (
    <div>
      <div className="bru bg-paper flex items-stretch relative">
        <div className="pl-5 pr-[18px] py-[18px] border-r-[2.5px] border-ink font-mono text-base text-muted flex items-center">
          https://
        </div>
        <input
          ref={inputRef}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") start(url, verdictIdx);
          }}
          placeholder="your-next-victim.com"
          aria-label="URL to scan"
          className="flex-1 border-none px-5 py-[18px] font-mono text-xl bg-transparent min-w-0 outline-none"
        />
        <button
          onClick={() => (phase === "done" ? reset() : start(url, verdictIdx))}
          aria-live="polite"
          className="bg-accent border-none border-l-[2.5px] border-ink px-7 font-display font-bold text-lg cursor-pointer tracking-[-0.01em]"
        >
          {phase === "scanning"
            ? "scanning…"
            : phase === "done"
              ? "scan again"
              : "judge it →"}
        </button>
      </div>

      <div className="mt-3 flex gap-2 items-center flex-wrap font-mono text-[13px]">
        <span className="opacity-60">or try:</span>
        {PRESET_URLS.map((p) => (
          <button
            key={p.label}
            onClick={() => {
              setUrl(p.label);
              setVerdictIdx(p.idx);
              start(p.label, p.idx);
            }}
            className="bru-xs bg-paper px-2.5 py-1 font-mono text-xs cursor-pointer"
          >
            {p.label}
          </button>
        ))}
      </div>

      {phase !== "idle" && (
        <div className="bru mt-[18px] bg-paper overflow-hidden">
          {phase === "scanning" ? (
            <ScanningPanel step={step} url={url} />
          ) : (
            <VerdictPanel verdict={verdict} />
          )}
        </div>
      )}
    </div>
  );
}

function ScanningPanel({ step, url }: { step: number; url: string }) {
  return (
    <div className="px-7 py-6 font-mono">
      <div className="flex justify-between items-center mb-4 text-[13px] font-bold tracking-[0.1em] uppercase">
        <span>scanning {url || "your-next-victim.com"}</span>
        <span className="text-muted">
          {Math.min(step, SCAN_STEPS.length)}/{SCAN_STEPS.length}
        </span>
      </div>
      <div className="grid gap-1.5">
        {SCAN_STEPS.map((s, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div
              key={i}
              className={`flex items-center gap-2.5 text-sm font-mono ${
                done || active ? "opacity-100" : "opacity-25"
              }`}
            >
              <span
                className={`w-4 h-4 grid place-items-center border-[1.5px] border-ink text-[10px] font-bold shrink-0 ${
                  done
                    ? "bg-success"
                    : active
                      ? "bg-accent"
                      : "bg-[#eee]"
                }`}
              >
                {done ? "✓" : active ? "•" : " "}
              </span>
              <span>{s}</span>
              {active && (
                <span className="text-muted">
                  <span className="dot1">.</span>
                  <span className="dot2">.</span>
                  <span className="dot3">.</span>
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-4 h-1.5 bg-[#f0eee9] border-[1.5px] border-ink overflow-hidden relative">
        <div
          className="h-full bg-accent transition-[width] duration-[400ms]"
          style={{
            width: `${Math.min((step / SCAN_STEPS.length) * 100, 100)}%`,
          }}
        />
      </div>
    </div>
  );
}

function VerdictPanel({ verdict }: { verdict: Verdict }) {
  return (
    <div>
      <div className="px-7 py-5 border-b-[2.5px] border-ink flex justify-between items-center font-mono bg-bg flex-wrap gap-2">
        <div className="font-bold text-[13px] tracking-[0.1em] uppercase">
          ▸ verdict for {verdict.name}
        </div>
        <div className="text-xs text-muted">
          generated by a robot · don&apos;t sue us
        </div>
      </div>

      <div className="verdict-main">
        <div className="verdict-main-left p-7">
          <div className="font-mono text-xs font-bold tracking-[0.1em] uppercase text-muted">
            buildable: {verdict.tier}
          </div>
          <div className="flex items-baseline gap-3.5 mt-2">
            <div
              className="font-display font-bold leading-none tracking-[-0.04em] text-[88px]"
              style={{ color: verdict.tierColor }}
            >
              {verdict.score}
            </div>
            <div className="font-display text-[22px] font-medium text-muted">
              / 100
            </div>
          </div>
          <p className="font-display text-xl font-medium leading-[1.3] mt-4 mb-0 tracking-[-0.01em]">
            &ldquo;{verdict.verdict}&rdquo;
          </p>
        </div>

        <div className="grid grid-rows-2 font-mono">
          <div className="p-5 border-b-[2.5px] border-ink">
            <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted">
              Time to clone
            </div>
            <div className="font-display text-4xl font-bold mt-1 tracking-[-0.02em]">
              {verdict.time}
            </div>
          </div>
          <div className="p-5">
            <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted">
              Monthly cost
            </div>
            <div className="font-display text-4xl font-bold mt-1 tracking-[-0.02em]">
              {verdict.cost}
            </div>
          </div>
        </div>
      </div>

      <div className="px-7 py-6 font-mono text-sm bg-paper-alt border-t-[2.5px] border-ink">
        <div className="text-[11px] font-bold tracking-[0.1em] uppercase text-muted mb-3.5">
          ✦ your stack receipt
        </div>
        {verdict.stack.map((s, i) => (
          <div
            key={i}
            className={`flex justify-between py-1.5 ${
              i < verdict.stack.length - 1
                ? "border-b border-dashed border-[#ccc]"
                : ""
            }`}
          >
            <span>
              {String(i + 1).padStart(2, "0")}  {s}
            </span>
            <span className="text-muted">
              {i === 0
                ? "free tier"
                : i === 1
                  ? "vibes"
                  : i === 2
                    ? "$0.00"
                    : "included"}
            </span>
          </div>
        ))}
        <div className="flex justify-between pt-3.5 mt-1.5 border-t-2 border-ink font-bold">
          <span>TOTAL</span>
          <span>{verdict.cost}</span>
        </div>
      </div>

      {verdict.tutorials > 0 && (
        <div className="px-7 py-4 border-t-[2.5px] border-ink bg-accent font-mono text-sm flex justify-between items-center flex-wrap gap-3">
          <span className="font-medium">
            ▸ {verdict.tutorials} tutorials queued for your weekend of
            self-loathing
          </span>
          <button className="bg-ink text-accent border-none px-4 py-2 font-mono font-bold text-[13px] cursor-pointer">
            email me the build guide →
          </button>
        </div>
      )}
    </div>
  );
}
