"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

export type CanonicalComponent = {
  slug: string;
  display_name: string;
  category: string;
};

export type TriageRow = {
  id: string;
  raw_term: string;
  normalized_term: string;
  occurrences: number;
  last_seen_at: string;
  report_id: string | null;
  /** LLM curation suggestion (admin batch) — may be null if not run yet. */
  llm_action: "alias" | "promote" | "ignore" | null;
  llm_target_slug: string | null;
  llm_category: string | null;
  llm_commoditization: number | null;
  llm_note: string | null;
};

type Props = {
  rows: TriageRow[];
  canonical: CanonicalComponent[];
};

const CATEGORIES = [
  "hosting",
  "framework",
  "ui",
  "cms",
  "db",
  "payments",
  "auth",
  "cdn",
  "analytics",
  "email",
  "support",
  "crm",
  "ml",
  "search",
  "queue",
  "monitoring",
  "devtools",
  "integrations",
  "infra",
] as const;

type RowMode = "idle" | "promoting";

export function Triage({ rows, canonical }: Props) {
  const grouped = useMemo(() => {
    const out: Record<string, CanonicalComponent[]> = {};
    for (const c of canonical) {
      (out[c.category] ??= []).push(c);
    }
    return out;
  }, [canonical]);

  return (
    <div className="flex flex-col gap-3">
      {rows.map((row) => (
        <UnknownRowCard
          key={row.id}
          row={row}
          grouped={grouped}
        />
      ))}
    </div>
  );
}

function UnknownRowCard({
  row,
  grouped,
}: {
  row: TriageRow;
  grouped: Record<string, CanonicalComponent[]>;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<RowMode>("idle");
  const [submittingAction, setSubmittingAction] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [aliasTarget, setAliasTarget] = useState<string>(
    row.llm_action === "alias" && row.llm_target_slug ? row.llm_target_slug : "",
  );

  // Default-suggested promote fields, derived from the raw term — but
  // overridden by LLM suggestion fields when present so "Use suggestion"
  // and the open promote form land at the same starting point.
  const suggested = useMemo(() => deriveSuggested(row.raw_term), [row.raw_term]);
  const llmCategory =
    row.llm_action === "promote" && row.llm_category &&
    (CATEGORIES as readonly string[]).includes(row.llm_category)
      ? (row.llm_category as (typeof CATEGORIES)[number])
      : null;
  const llmLevel =
    row.llm_action === "promote" && row.llm_commoditization !== null
      ? row.llm_commoditization
      : null;
  const [promote, setPromote] = useState({
    slug: suggested.slug,
    display_name: suggested.display_name,
    category: llmCategory ?? ("infra" as (typeof CATEGORIES)[number]),
    commoditization_level: llmLevel ?? 4,
    extra_aliases: "",
  });
  const submitting = submittingAction !== null;

  function applySuggestion() {
    if (!row.llm_action) return;
    if (row.llm_action === "alias" && row.llm_target_slug) {
      submit({ action: "alias", target_slug: row.llm_target_slug }, "alias");
      return;
    }
    if (row.llm_action === "ignore") {
      submit({ action: "ignore" }, "ignore");
      return;
    }
    if (row.llm_action === "promote") {
      // Prime the promote form (in case user wants to tweak first) and open it.
      if (llmCategory) {
        setPromote((p) => ({
          ...p,
          category: llmCategory,
          commoditization_level: llmLevel ?? p.commoditization_level,
        }));
      }
      setMode("promoting");
    }
  }

  async function submit(body: Record<string, unknown>, action: string) {
    setSubmittingAction(action);
    setErrorMessage(null);
    try {
      const res = await fetch(`/api/admin/unknowns/${row.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const text = await res.text().catch(() => "");
        setErrorMessage(text.slice(0, 200) || `Resolve failed (${res.status})`);
        setSubmittingAction(null);
        return;
      }
      router.refresh();
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "network error");
      setSubmittingAction(null);
    }
  }

  return (
    <div className="bru bg-paper p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <div className="font-mono text-sm text-ink">{row.raw_term}</div>
          <div className="mt-0.5 text-xs text-muted">
            seen {row.occurrences}× · last {formatRelative(row.last_seen_at)}
            {row.report_id ? ` · in report ${row.report_id.slice(0, 8)}…` : ""}
          </div>
        </div>
        {row.llm_action ? (
          <div className="flex flex-wrap items-center gap-2 rounded border-2 border-purple bg-paper-alt px-2 py-1.5 text-[11px] text-ink">
            <span className="font-display uppercase tracking-[0.15em] text-purple">
              suggestion
            </span>
            <span className="font-mono">{summarizeSuggestion(row)}</span>
            {row.llm_note ? (
              <span className="text-muted">— {row.llm_note}</span>
            ) : null}
            <button
              type="button"
              disabled={submitting}
              onClick={applySuggestion}
              className="bru-sm bg-purple px-2 py-0.5 font-display text-[10px] text-ink disabled:opacity-60"
            >
              Use →
            </button>
          </div>
        ) : null}
      </div>

      {mode === "promoting" ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Field label="Slug">
            <input
              value={promote.slug}
              onChange={(e) => setPromote({ ...promote, slug: e.target.value })}
              className="w-full rounded border-2 border-ink bg-paper-alt px-2 py-1 font-mono text-xs"
            />
          </Field>
          <Field label="Display name">
            <input
              value={promote.display_name}
              onChange={(e) => setPromote({ ...promote, display_name: e.target.value })}
              className="w-full rounded border-2 border-ink bg-paper-alt px-2 py-1 font-mono text-xs"
            />
          </Field>
          <Field label="Category">
            <select
              value={promote.category}
              onChange={(e) =>
                setPromote({
                  ...promote,
                  category: e.target.value as (typeof CATEGORIES)[number],
                })
              }
              className="w-full rounded border-2 border-ink bg-paper-alt px-2 py-1 font-mono text-xs"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Commoditization (0=bespoke … 5=trivial)">
            <select
              value={promote.commoditization_level}
              onChange={(e) =>
                setPromote({
                  ...promote,
                  commoditization_level: Number(e.target.value),
                })
              }
              className="w-full rounded border-2 border-ink bg-paper-alt px-2 py-1 font-mono text-xs"
            >
              {[0, 1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n} — {COMMODITIZATION_LABELS[n]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Extra aliases (comma-separated)" full>
            <input
              value={promote.extra_aliases}
              onChange={(e) => setPromote({ ...promote, extra_aliases: e.target.value })}
              placeholder="alt name, abbr, …"
              className="w-full rounded border-2 border-ink bg-paper-alt px-2 py-1 font-mono text-xs"
            />
          </Field>
          <div className="sm:col-span-2 flex gap-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() =>
                submit(
                  {
                    action: "promote",
                    slug: promote.slug.trim(),
                    display_name: promote.display_name.trim(),
                    category: promote.category,
                    commoditization_level: promote.commoditization_level,
                    extra_aliases: promote.extra_aliases
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  },
                  "promote",
                )
              }
              className="bru-sm bg-success px-3 py-1 font-display text-xs text-ink disabled:opacity-60"
            >
              Add component
            </button>
            <button
              type="button"
              onClick={() => setMode("idle")}
              className="px-3 py-1 font-display text-xs text-muted hover:text-ink"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={aliasTarget}
            onChange={(e) => setAliasTarget(e.target.value)}
            className="min-w-[16rem] rounded border-2 border-ink bg-paper-alt px-2 py-1 font-mono text-xs"
          >
            <option value="">— alias to existing —</option>
            {Object.entries(grouped)
              .sort(([a], [b]) => a.localeCompare(b))
              .map(([cat, items]) => (
                <optgroup key={cat} label={cat}>
                  {items
                    .sort((a, b) => a.display_name.localeCompare(b.display_name))
                    .map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.display_name}
                      </option>
                    ))}
                </optgroup>
              ))}
          </select>
          <button
            type="button"
            disabled={!aliasTarget || submitting}
            onClick={() => submit({ action: "alias", target_slug: aliasTarget }, "alias")}
            className="bru-sm bg-accent px-3 py-1 font-display text-xs text-ink disabled:opacity-40"
          >
            Alias →
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => setMode("promoting")}
            className="bru-sm bg-sticky px-3 py-1 font-display text-xs text-ink disabled:opacity-60"
          >
            Promote to new
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => submit({ action: "ignore" }, "ignore")}
            className="px-3 py-1 font-display text-xs text-muted hover:text-ink disabled:opacity-60"
          >
            Ignore
          </button>
          {submitting ? (
            <span className="text-xs text-muted">…submitting {submittingAction}</span>
          ) : null}
        </div>
      )}
      {errorMessage ? (
        <div className="mt-2 rounded border-2 border-danger bg-paper-alt p-2 text-xs text-ink">
          {errorMessage}
        </div>
      ) : null}
    </div>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-[10px] uppercase tracking-[0.15em] text-muted">{label}</span>
      {children}
    </label>
  );
}

const COMMODITIZATION_LABELS: Record<number, string> = {
  0: "bespoke",
  1: "OSS self-hosted",
  2: "managed, niche",
  3: "commodity utility",
  4: "ubiquitous",
  5: "trivial drop-in",
};

/**
 * Suggest a slug + display name from a raw stack term. Strips parenthetical
 * descriptors ("Vercel Pro (edge + analytics)" → "Vercel Pro"), trims, and
 * kebab-cases for the slug. The user can edit before submit.
 */
function deriveSuggested(raw: string): { slug: string; display_name: string } {
  const cleaned = raw
    .replace(/\([^)]*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();
  const display_name = cleaned;
  const slug = cleaned
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  return { slug, display_name };
}

function summarizeSuggestion(row: TriageRow): string {
  if (row.llm_action === "alias" && row.llm_target_slug) {
    return `alias → ${row.llm_target_slug}`;
  }
  if (row.llm_action === "promote") {
    const cat = row.llm_category ?? "?";
    const lvl = row.llm_commoditization ?? "?";
    return `promote → ${cat} (L${lvl})`;
  }
  if (row.llm_action === "ignore") {
    return "ignore";
  }
  return "";
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const ms = Date.now() - d.getTime();
  const min = Math.round(ms / 60_000);
  if (min < 60) return `${min}m ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.round(hr / 24);
  return `${day}d ago`;
}
