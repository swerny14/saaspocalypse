"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { StoredReport } from "@/lib/db/reports";
import {
  STEP_LABELS,
  STEP_ORDER,
  type ScanEvent,
  type ScanStepId,
} from "@/lib/scanner/events";
import { VerdictReport } from "./VerdictReport";
import { SimilarProductsClient } from "./SimilarProductsClient";

type Phase = "idle" | "scanning" | "done" | "error";

const PRESETS = [
  "calendly.com",
  "notion.com",
  "linear.app",
  "stripe.com",
];

export function Scanner({ priceCents }: { priceCents: number }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [url, setUrl] = useState("");
  const [currentStep, setCurrentStep] = useState<ScanStepId | null>(null);
  const [report, setReport] = useState<StoredReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleEvent = (event: ScanEvent) => {
    if (event.type === "step") {
      setCurrentStep(event.step);
    } else if (event.type === "done") {
      setReport(event.report);
      setCurrentStep("verdict");
      setPhase("done");
    } else if (event.type === "error") {
      setErrorMsg(event.message);
      setPhase("error");
    }
  };

  const startScan = async (targetUrl: string) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setPhase("scanning");
    setCurrentStep(null);
    setReport(null);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setPhase("error");
        setErrorMsg(`Scan request failed (${res.status})`);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let sepIdx = buffer.indexOf("\n\n");
        while (sepIdx !== -1) {
          const frame = buffer.slice(0, sepIdx);
          buffer = buffer.slice(sepIdx + 2);
          const dataLine = frame
            .split("\n")
            .find((line) => line.startsWith("data: "));
          if (dataLine) {
            const json = dataLine.slice("data: ".length);
            try {
              handleEvent(JSON.parse(json) as ScanEvent);
            } catch {
              // ignore malformed frames
            }
          }
          sepIdx = buffer.indexOf("\n\n");
        }
      }
    } catch (e) {
      if (e instanceof Error && e.name === "AbortError") return;
      setPhase("error");
      setErrorMsg(e instanceof Error ? e.message : "Scan failed");
    }
  };

  const reset = () => {
    abortRef.current?.abort();
    setPhase("idle");
    setCurrentStep(null);
    setReport(null);
    setErrorMsg(null);
  };

  const buttonLabel =
    phase === "scanning"
      ? "scanning…"
      : phase === "done" || phase === "error"
        ? "scan again"
        : "judge it →";

  return (
    <div>
      <div className="mx-auto max-w-[780px]">
        <div className="bru bg-paper flex flex-col sm:flex-row sm:items-stretch relative">
          <div className="flex items-stretch flex-1 min-w-0 border-b-[2.5px] sm:border-b-0 border-ink">
            <div className="px-4 sm:pl-5 sm:pr-[18px] py-3.5 sm:py-[18px] border-r-[2.5px] border-ink font-mono text-sm sm:text-base text-muted flex items-center">
              https://
            </div>
            <input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") startScan(url);
              }}
              placeholder="overpriced-saas.com"
              aria-label="URL to scan"
              className="flex-1 border-none px-3 sm:px-5 py-3.5 sm:py-[18px] font-mono text-base sm:text-xl bg-transparent min-w-0 outline-none"
            />
          </div>
          <button
            onClick={() =>
              phase === "done" || phase === "error" ? reset() : startScan(url)
            }
            aria-live="polite"
            disabled={phase === "scanning"}
            className="bg-accent border-none sm:border-l-[2.5px] sm:border-ink px-7 py-3 sm:py-0 font-display font-bold text-lg cursor-pointer tracking-[-0.01em] disabled:cursor-wait"
          >
            {buttonLabel}
          </button>
        </div>

        {phase === "idle" && (
          <div className="mt-3 flex gap-2 items-center flex-wrap font-mono text-[13px]">
            <span className="opacity-60">or try:</span>
            {PRESETS.map((p) => (
              <button
                key={p}
                onClick={() => {
                  setUrl(p);
                  startScan(p);
                }}
                className="bru-xs bg-paper px-2.5 py-1 font-mono text-xs cursor-pointer"
              >
                {p}
              </button>
            ))}
          </div>
        )}

        {phase === "scanning" && <ScanningPanel currentStep={currentStep} />}
        {phase === "error" && (
          <ErrorPanel message={errorMsg ?? "Something broke."} />
        )}
      </div>

      {phase === "done" && report && (
        <div className="mt-[18px] space-y-3 text-left">
          <VerdictReport
            report={report}
            priceCents={priceCents}
            comparisons={<SimilarProductsClient sourceSlug={report.slug} />}
          />
          <div className="font-mono text-xs opacity-70">
            ▸ shareable link:{" "}
            <Link href={`/r/${report.slug}`} className="underline text-ink">
              /r/{report.slug}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function ScanningPanel({ currentStep }: { currentStep: ScanStepId | null }) {
  const activeIdx = currentStep ? STEP_ORDER.indexOf(currentStep) : -1;
  const progressPct = activeIdx < 0 ? 0 : ((activeIdx + 1) / STEP_ORDER.length) * 100;

  return (
    <div className="bru mt-[18px] bg-paper overflow-hidden">
      <div className="px-7 py-6 font-mono">
        <div className="flex justify-between items-center mb-4 text-[13px] font-bold tracking-[0.1em] uppercase">
          <span>scanning your url</span>
          <span className="text-muted">
            {activeIdx < 0 ? 0 : activeIdx + 1}/{STEP_ORDER.length}
          </span>
        </div>
        <div className="grid gap-1.5">
          {STEP_ORDER.map((s, i) => {
            const done = i < activeIdx;
            const active = i === activeIdx;
            return (
              <div
                key={s}
                className={`flex items-center gap-2.5 text-sm font-mono ${
                  done || active ? "opacity-100" : "opacity-25"
                }`}
              >
                <span
                  className={`w-4 h-4 grid place-items-center border-[1.5px] border-ink text-[10px] font-bold shrink-0 ${
                    done ? "bg-success" : active ? "bg-accent" : "bg-[#eee]"
                  }`}
                >
                  {done ? "✓" : active ? "•" : " "}
                </span>
                <span>{STEP_LABELS[s]}</span>
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
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="bru mt-[18px] bg-paper px-7 py-6 font-mono text-sm">
      <div className="font-bold mb-2 text-danger">▸ scan failed</div>
      <div className="opacity-80">{message}</div>
      <div className="opacity-60 mt-3 text-xs">
        Try again, or try a different URL.
      </div>
    </div>
  );
}
