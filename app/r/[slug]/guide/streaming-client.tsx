"use client";

import { useEffect, useRef, useState } from "react";
import type { StoredBuildGuide } from "@/lib/db/build_guides";
import type { StoredReport } from "@/lib/db/reports";
import { BuildGuide } from "@/components/BuildGuide";
import {
  GUIDE_STEP_LABELS,
  GUIDE_STEP_ORDER,
  type GuideEvent,
  type GuideStepId,
} from "@/lib/build_guide/pipeline";

type Props = {
  slug: string;
  token: string;
  report: StoredReport;
};

export function GuideStreamingClient({ slug, token, report }: Props) {
  const [phase, setPhase] = useState<"loading" | "done" | "error">("loading");
  const [currentStep, setCurrentStep] = useState<GuideStepId | null>(null);
  const [guide, setGuide] = useState<StoredBuildGuide | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        const res = await fetch(
          `/api/guide/${encodeURIComponent(slug)}?t=${encodeURIComponent(token)}`,
        );
        if (!res.ok || !res.body) {
          setPhase("error");
          setErrorMsg("Something broke on our end. Refresh to retry.");
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
            const line = frame.split("\n").find((l) => l.startsWith("data: "));
            if (line) {
              try {
                handleEvent(JSON.parse(line.slice(6)) as GuideEvent);
              } catch {
                // ignore malformed frames
              }
            }
            sepIdx = buffer.indexOf("\n\n");
          }
        }
      } catch {
        setPhase("error");
        setErrorMsg("Something broke on our end. Refresh to retry.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleEvent = (event: GuideEvent) => {
    if (event.type === "step") {
      setCurrentStep(event.step);
    } else if (event.type === "done") {
      // Render immediately from event payload — no reload flash.
      setGuide(event.guide);
      setCurrentStep("persist");
      setPhase("done");
    } else if (event.type === "error") {
      setErrorMsg(event.message);
      setPhase("error");
    }
  };

  if (phase === "done" && guide) {
    return <BuildGuide report={report} guide={guide} />;
  }

  if (phase === "error") {
    return <ErrorPanel message={errorMsg ?? "Something broke on our end."} />;
  }

  return (
    <GeneratingPanel reportName={report.name} currentStep={currentStep} />
  );
}

function GeneratingPanel({
  reportName,
  currentStep,
}: {
  reportName: string;
  currentStep: GuideStepId | null;
}) {
  const activeIdx = currentStep ? GUIDE_STEP_ORDER.indexOf(currentStep) : -1;
  const progressPct =
    activeIdx < 0 ? 0 : ((activeIdx + 1) / GUIDE_STEP_ORDER.length) * 100;

  return (
    <div className="bru bg-paper max-w-[640px] mx-auto overflow-hidden">
      <div className="px-8 py-6 border-b-[2.5px] border-ink">
        <div className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase text-muted mb-2">
          building your guide for
        </div>
        <div className="font-display text-[28px] font-bold tracking-[-0.02em]">
          {reportName}
        </div>
      </div>
      <div className="px-8 py-6 font-mono">
        <div className="grid gap-2">
          {GUIDE_STEP_ORDER.map((s, i) => {
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
                <span>{GUIDE_STEP_LABELS[s]}</span>
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
        <div className="mt-5 h-1.5 bg-[#f0eee9] border-[1.5px] border-ink overflow-hidden relative">
          <div
            className="h-full bg-accent transition-[width] duration-[400ms]"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="mt-4 text-xs opacity-60 leading-[1.5]">
          hang tight — the robot is typing your guide from scratch. a
          minute or two, max. no pre-baked templates here.
        </div>
      </div>
    </div>
  );
}

function ErrorPanel({ message }: { message: string }) {
  return (
    <div className="bru bg-paper p-8 max-w-[560px] mx-auto">
      <div className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase text-danger mb-2">
        wedge guide generation failed
      </div>
      <p className="text-[15px] leading-[1.6] m-0 mb-4 opacity-85">{message}</p>
      <p className="text-xs opacity-60 m-0">
        Your purchase is still valid — refresh this page to retry.
      </p>
    </div>
  );
}
