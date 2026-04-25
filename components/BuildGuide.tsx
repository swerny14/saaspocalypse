"use client";

import { useState } from "react";
import type { StoredBuildGuide } from "@/lib/db/build_guides";
import type { StoredReport } from "@/lib/db/reports";

type Props = { report: StoredReport; guide: StoredBuildGuide };

export function BuildGuide({ report, guide }: Props) {
  return (
    <div className="bg-paper border-[2.5px] border-ink shadow-[5px_5px_0_0_#0a0a0a]">
      {/* HEADER */}
      <div className="px-11 pt-9 pb-6 border-b-[2.5px] border-ink">
        <div className="font-mono text-xs font-bold tracking-[0.15em] uppercase text-muted mb-2">
          your build guide for
        </div>
        <h1 className="font-display font-bold text-[40px] leading-none tracking-[-0.03em] m-0">
          {report.name}
        </h1>
        <div className="font-mono text-sm mt-2 opacity-70">▸ {report.tagline}</div>
      </div>

      {/* OVERVIEW */}
      <section className="px-11 py-8 border-b-[2.5px] border-ink">
        <h2 className="font-display text-[22px] font-bold m-0 mb-4 tracking-[-0.02em]">
          overview.
        </h2>
        <div className="text-[15px] leading-[1.6] whitespace-pre-wrap">
          {guide.overview}
        </div>
      </section>

      {/* PREREQUISITES */}
      <section className="px-11 py-8 border-b-[2.5px] border-ink bg-bg">
        <h2 className="font-display text-[22px] font-bold m-0 mb-4 tracking-[-0.02em]">
          prerequisites.
        </h2>
        <ul className="list-none p-0 m-0 grid gap-2 font-mono text-sm">
          {guide.prerequisites.map((p, i) => (
            <li key={i} className="flex gap-3 items-start">
              <span className="bg-ink text-accent w-5 h-5 grid place-items-center text-xs font-bold shrink-0 mt-0.5">
                ✓
              </span>
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* STEPS */}
      <section className="px-11 py-8 border-b-[2.5px] border-ink">
        <div className="flex justify-between items-baseline mb-6 flex-wrap gap-3">
          <h2 className="font-display text-[22px] font-bold m-0 tracking-[-0.02em]">
            the build.
          </h2>
          <div className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-60">
            {guide.steps.length} steps
          </div>
        </div>
        <div className="grid gap-6">
          {guide.steps.map((step) => (
            <Step key={step.n} step={step} />
          ))}
        </div>
      </section>

      {/* STACK SPECIFICS */}
      <section className="px-11 py-8 border-b-[2.5px] border-ink bg-bg">
        <h2 className="font-display text-[22px] font-bold m-0 mb-4 tracking-[-0.02em]">
          stack specifics.
        </h2>
        <div className="grid gap-4">
          <div>
            <div className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase opacity-60 mb-2">
              libraries
            </div>
            <div className="grid gap-2">
              {guide.stack_specifics.libraries.map((lib, i) => (
                <div
                  key={i}
                  className="flex gap-3 items-baseline font-mono text-[13px] border-l-2 border-ink pl-3"
                >
                  <span className="font-bold">{lib.name}</span>
                  {lib.version && (
                    <span className="opacity-60">{lib.version}</span>
                  )}
                  <span className="opacity-80">— {lib.purpose}</span>
                </div>
              ))}
            </div>
          </div>
          {guide.stack_specifics.references.length > 0 && (
            <div>
              <div className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase opacity-60 mb-2">
                references
              </div>
              <div className="grid gap-2">
                {guide.stack_specifics.references.map((ref, i) => (
                  <div
                    key={i}
                    className="font-mono text-[13px] border-l-2 border-ink pl-3"
                  >
                    <span className="font-bold">{ref.label}</span>
                    <span className="opacity-80"> — {ref.why}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* PITFALLS */}
      <section className="px-11 py-8">
        <h2 className="font-display text-[22px] font-bold m-0 mb-4 tracking-[-0.02em]">
          pitfalls.
        </h2>
        <div className="grid gap-3">
          {guide.pitfalls.map((p, i) => (
            <div
              key={i}
              className="border-2 border-ink bg-bg p-4"
            >
              <div className="font-display font-bold text-base mb-1">
                ▸ {p.title}
              </div>
              <div className="text-sm leading-[1.5] opacity-85">{p.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <div className="px-[22px] py-2.5 font-mono text-[10px] tracking-[0.1em] uppercase text-muted bg-bg border-t-[2.5px] border-ink flex justify-between gap-4 flex-wrap">
        <span>▸ this guide is yours forever — bookmark the URL</span>
        <span>guide v1 · saaspocalypse.biz</span>
      </div>
    </div>
  );
}

function Step({ step }: { step: StoredBuildGuide["steps"][number] }) {
  return (
    <article className="border-2 border-ink bg-paper">
      <header className="px-5 py-3 border-b-2 border-ink flex justify-between items-baseline gap-3 flex-wrap">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[13px] font-bold text-muted">
            {String(step.n).padStart(2, "0")}
          </span>
          <h3 className="font-display text-lg font-semibold m-0 tracking-[-0.01em]">
            {step.title}
          </h3>
        </div>
        <span className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-60">
          {step.est_time}
        </span>
      </header>
      <div className="px-5 py-4 text-[15px] leading-[1.6] whitespace-pre-wrap">
        {step.body}
      </div>
      {step.llm_prompts.length > 0 && (
        <div className="px-5 pb-5 grid gap-3">
          {step.llm_prompts.map((prompt, i) => (
            <PromptBlock key={i} prompt={prompt} />
          ))}
        </div>
      )}
    </article>
  );
}

function PromptBlock({
  prompt,
}: {
  prompt: StoredBuildGuide["steps"][number]["llm_prompts"][number];
}) {
  const [copied, setCopied] = useState(false);
  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked — silently ignore
    }
  };
  return (
    <div className="border-[1.5px] border-ink bg-bg">
      <div className="px-4 py-2 border-b-[1.5px] border-ink flex justify-between items-center gap-3 bg-accent">
        <span className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase">
          ⎘ prompt · {prompt.label}
        </span>
        <button
          onClick={onCopy}
          className="font-mono text-[11px] font-bold tracking-[0.1em] uppercase bg-ink text-accent px-2 py-1 cursor-pointer border-none"
        >
          {copied ? "copied ✓" : "copy"}
        </button>
      </div>
      <pre className="px-4 py-3 m-0 font-mono text-[12.5px] leading-[1.5] whitespace-pre-wrap break-words">
        {prompt.prompt}
      </pre>
    </div>
  );
}
