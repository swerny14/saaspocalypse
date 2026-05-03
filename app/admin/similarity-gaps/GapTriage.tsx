"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import type { DescriptorSuggestion } from "@/lib/normalization/descriptor_suggestion_llm";
import type { Tier } from "@/lib/scanner/schema";

const CATEGORIES = [
  "collab",
  "content",
  "commerce",
  "comm",
  "ai",
  "infra",
  "data",
  "workflow",
  "identity",
] as const;

export type CapabilityCatalogEntry = {
  slug: string;
  display_name: string;
  category: string;
  is_descriptor: boolean;
};

export type GapTriageRow = {
  id: string;
  text_similarity: number;
  engine_score: number;
  /** Mirrors `similarity_gaps.llm_action` — discriminator we don't actually
   *  branch on (`llm_payload` already carries the typed shape via Zod-
   *  validated discriminated union). Wide string type avoids a needless
   *  cast at the page boundary. */
  llm_action: string | null;
  llm_payload: DescriptorSuggestion | null;
  llm_note: string | null;
  llm_suggested_at: string | null;
  a: GapSide;
  b: GapSide;
};

type GapSide = {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  tier: Tier;
  score: number;
  capability_slugs: string[];
};

export function DetectButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  function run() {
    setError(null);
    setResult(null);
    start(async () => {
      try {
        const res = await fetch("/api/admin/similarity-gaps/detect", {
          method: "POST",
        });
        const json = await res.json();
        if (!json.ok) {
          setError(json.message ?? "detection failed");
          return;
        }
        setResult(`${json.detected} detected · ${json.inserted} new`);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={run}
        disabled={pending}
        className="bru border-[2px] bg-accent px-3 py-1.5 font-mono text-[11px] font-bold tracking-[0.1em] uppercase disabled:opacity-50"
      >
        {pending ? "scanning…" : "↻ detect new gaps"}
      </button>
      {result && (
        <span className="font-mono text-[10px] tracking-[0.05em] opacity-70">
          {result}
        </span>
      )}
      {error && (
        <span className="font-mono text-[10px] tracking-[0.05em] text-danger">
          {error}
        </span>
      )}
    </div>
  );
}

export function GapTriage({
  rows,
  catalog,
}: {
  rows: GapTriageRow[];
  catalog: CapabilityCatalogEntry[];
}) {
  return (
    <div className="flex flex-col gap-3">
      {rows.map((r) => (
        <GapRow key={r.id} row={r} catalog={catalog} />
      ))}
    </div>
  );
}

function GapRow({
  row,
  catalog,
}: {
  row: GapTriageRow;
  catalog: CapabilityCatalogEntry[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPromote, setShowPromote] = useState(false);

  async function suggest() {
    setBusy("suggesting");
    setError(null);
    try {
      const res = await fetch(`/api/admin/similarity-gaps/${row.id}/suggest`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.message ?? "suggestion failed");
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function applyBody(body: unknown, label: string) {
    setBusy(label);
    setError(null);
    try {
      const res = await fetch(`/api/admin/similarity-gaps/${row.id}/apply`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.message ?? "apply failed");
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  async function dismiss() {
    setBusy("dismissing");
    setError(null);
    try {
      const res = await fetch(`/api/admin/similarity-gaps/${row.id}/dismiss`, {
        method: "POST",
      });
      const json = await res.json();
      if (!json.ok) {
        setError(json.message ?? "dismiss failed");
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  }

  const suggestion = row.llm_payload;
  const hasSuggestion = !!suggestion;

  return (
    <div className="bru border-[2.5px] bg-paper px-5 py-4">
      <div className="flex items-baseline justify-between gap-3 mb-3 flex-wrap">
        <div className="font-mono text-[11px] tracking-[0.08em]">
          <span className="opacity-60">text </span>
          <span className="font-bold">{row.text_similarity.toFixed(2)}</span>
          <span className="opacity-40 mx-2">·</span>
          <span className="opacity-60">engine </span>
          <span className="font-bold">{row.engine_score.toFixed(2)}</span>
        </div>
        <div className="flex items-center gap-2">
          {!hasSuggestion && (
            <button
              onClick={suggest}
              disabled={busy !== null}
              className="bru border-[2px] bg-purple text-bg px-3 py-1 font-mono text-[10px] font-bold tracking-[0.1em] uppercase disabled:opacity-50"
            >
              {busy === "suggesting" ? "thinking…" : "✦ suggest"}
            </button>
          )}
          <button
            onClick={dismiss}
            disabled={busy !== null}
            className="bru border-[2px] bg-paper px-3 py-1 font-mono text-[10px] font-bold tracking-[0.1em] uppercase disabled:opacity-50"
          >
            {busy === "dismissing" ? "…" : "dismiss"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
        <PairSide side={row.a} />
        <PairSide side={row.b} />
      </div>

      {hasSuggestion && (
        <SuggestionBlock
          suggestion={suggestion}
          catalog={catalog}
          busy={busy}
          showPromote={showPromote}
          onShowPromote={() => setShowPromote(true)}
          onApply={(body, label) => applyBody(body, label)}
        />
      )}

      {error && (
        <div className="mt-2 font-mono text-[10px] text-danger">{error}</div>
      )}
    </div>
  );
}

function PairSide({ side }: { side: GapSide }) {
  return (
    <div className="border-[1.5px] border-dashed border-ink p-3">
      <div className="flex items-baseline justify-between gap-2 mb-1">
        <a
          href={`/r/${side.slug}`}
          target="_blank"
          rel="noreferrer"
          className="font-display font-bold text-[15px] underline decoration-dotted"
        >
          {side.slug}
        </a>
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase opacity-60">
          {side.tier} · {side.score}
        </span>
      </div>
      <div className="font-display text-[12px] opacity-75 mb-2 leading-[1.35] [text-wrap:pretty]">
        {side.tagline}
      </div>
      <div className="font-mono text-[10px] opacity-65 [overflow-wrap:anywhere]">
        {side.capability_slugs.length > 0
          ? side.capability_slugs.join(", ")
          : "(no capabilities)"}
      </div>
    </div>
  );
}

function SuggestionBlock({
  suggestion,
  catalog,
  busy,
  showPromote,
  onShowPromote,
  onApply,
}: {
  suggestion: DescriptorSuggestion;
  catalog: CapabilityCatalogEntry[];
  busy: string | null;
  showPromote: boolean;
  onShowPromote: () => void;
  onApply: (body: unknown, label: string) => void;
}) {
  return (
    <div className="border-l-[3px] border-purple pl-3 py-1 bg-purple/5">
      <div className="font-mono text-[10px] tracking-[0.12em] uppercase opacity-65 mb-1">
        ✦ suggestion · {suggestion.kind}
      </div>
      <div className="font-display text-[12.5px] mb-2 leading-[1.4] [text-wrap:pretty]">
        {suggestion.reasoning}
      </div>

      {suggestion.kind === "add_pattern" && (
        <AddPatternSuggestion
          suggestion={suggestion}
          busy={busy}
          onApply={onApply}
        />
      )}
      {suggestion.kind === "new_capability" && (
        <NewCapabilitySuggestion
          suggestion={suggestion}
          catalog={catalog}
          busy={busy}
          showPromote={showPromote}
          onShowPromote={onShowPromote}
          onApply={onApply}
        />
      )}
      {suggestion.kind === "no_action" && (
        <div className="font-mono text-[10px] opacity-60">
          (no taxonomy change recommended — dismiss to remove from queue)
        </div>
      )}
    </div>
  );
}

function AddPatternSuggestion({
  suggestion,
  busy,
  onApply,
}: {
  suggestion: Extract<DescriptorSuggestion, { kind: "add_pattern" }>;
  busy: string | null;
  onApply: (body: unknown, label: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="font-mono text-[11px]">
        add{" "}
        <code className="bg-bg px-1.5 py-0.5 border border-ink">
          &quot;{suggestion.pattern}&quot;
        </code>{" "}
        to <strong>{suggestion.capability_slug}</strong>
      </span>
      <button
        onClick={() =>
          onApply(
            {
              kind: "add_pattern",
              capability_slug: suggestion.capability_slug,
              pattern: suggestion.pattern,
            },
            "applying",
          )
        }
        disabled={busy !== null}
        className="bru border-[2px] bg-accent px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] uppercase disabled:opacity-50"
      >
        {busy === "applying" ? "…" : "apply →"}
      </button>
    </div>
  );
}

function NewCapabilitySuggestion({
  suggestion,
  catalog,
  busy,
  showPromote,
  onShowPromote,
  onApply,
}: {
  suggestion: Extract<DescriptorSuggestion, { kind: "new_capability" }>;
  catalog: CapabilityCatalogEntry[];
  busy: string | null;
  showPromote: boolean;
  onShowPromote: () => void;
  onApply: (body: unknown, label: string) => void;
}) {
  const [slug, setSlug] = useState(suggestion.slug);
  const [displayName, setDisplayName] = useState(suggestion.display_name);
  const [category, setCategory] = useState<string>(suggestion.category);
  const [patterns, setPatterns] = useState(suggestion.match_patterns.join("\n"));

  const slugConflict = catalog.some((c) => c.slug === slug);

  if (!showPromote) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-mono text-[11px]">
          new descriptor: <strong>{suggestion.slug}</strong> ({suggestion.match_patterns.length} patterns)
        </span>
        <button
          onClick={onShowPromote}
          className="bru border-[2px] bg-sticky px-2.5 py-1 font-mono text-[10px] font-bold tracking-[0.1em] uppercase"
        >
          review →
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 mt-1">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase opacity-65">slug</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            className={`bru border-[2px] bg-bg px-2 py-1 font-mono text-[12px] ${
              slugConflict ? "text-danger" : ""
            }`}
          />
          {slugConflict && (
            <span className="font-mono text-[10px] text-danger">slug already exists</span>
          )}
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-mono text-[10px] tracking-[0.1em] uppercase opacity-65">display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="bru border-[2px] bg-bg px-2 py-1 font-display text-[13px]"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase opacity-65">category</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="bru border-[2px] bg-bg px-2 py-1 font-mono text-[12px]"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase opacity-65">
          patterns (one per line)
        </span>
        <textarea
          value={patterns}
          onChange={(e) => setPatterns(e.target.value)}
          rows={5}
          className="bru border-[2px] bg-bg px-2 py-1 font-mono text-[11px]"
        />
      </label>
      <button
        onClick={() => {
          const matchPatterns = patterns
            .split("\n")
            .map((p) => p.trim())
            .filter(Boolean);
          onApply(
            {
              kind: "new_capability",
              slug,
              display_name: displayName,
              category,
              match_patterns: matchPatterns,
              is_descriptor: true,
            },
            "applying",
          );
        }}
        disabled={busy !== null || slugConflict || !slug || !displayName}
        className="bru border-[2px] bg-accent px-3 py-1.5 font-mono text-[10px] font-bold tracking-[0.1em] uppercase disabled:opacity-50 self-start"
      >
        {busy === "applying" ? "applying…" : "+ create descriptor"}
      </button>
    </div>
  );
}
