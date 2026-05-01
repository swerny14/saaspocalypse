import type { StoredReport } from "@/lib/db/reports";
import type { ReactNode } from "react";
import type { DetectedStack } from "@/lib/scanner/fingerprint";
import type { Difficulty, Tier } from "@/lib/scanner/schema";
import { DIFFICULTIES } from "@/lib/scanner/schema";
import { guidePriceCents } from "@/lib/stripe";
import { PurchaseCTA } from "./PurchaseCTA";
import { MoatBreakdown } from "./MoatBreakdown";

type Props = { report: StoredReport; comparisons?: ReactNode };

const TIER_BG_CLASS: Record<Tier, string> = {
  SOFT: "bg-tier-weekend-bg",
  CONTESTED: "bg-tier-month-bg",
  FORTRESS: "bg-tier-dont-bg",
};

const TIER_DOT_CLASS: Record<Tier, string> = {
  SOFT: "bg-success",
  CONTESTED: "bg-sticky",
  FORTRESS: "bg-coral",
};

const TIER_SUBLINE: Record<Tier, string> = {
  SOFT: "wide-open walls — wedgeable",
  CONTESTED: "real walls — pick your flank",
  FORTRESS: "thick walls — wedge plays only",
};

const DIFF_BG_CLASS: Record<Difficulty, string> = {
  easy: "bg-accent",
  medium: "bg-sticky",
  hard: "bg-coral",
  nightmare: "bg-purple",
};

function SectionHeading({
  label,
  title,
  meta,
}: {
  label: string;
  title: string;
  meta?: string;
}) {
  return (
    <div className="flex justify-between items-baseline mb-5 gap-3 flex-wrap">
      <div className="flex items-center gap-2.5">
        <span className="bg-ink text-accent px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] select-none leading-none">
          {label}
        </span>
        <h3 className="font-display text-[22px] sm:text-[26px] font-bold m-0 tracking-[-0.02em]">
          {title}
        </h3>
      </div>
      {meta ? (
        <div className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-60">
          {meta}
        </div>
      ) : null}
    </div>
  );
}

function fmtMoney(v: number | string): string {
  if (typeof v === "string") return v;
  if (v === 0) return "$0.00";
  if (v < 100) return `$${v.toFixed(2)}`;
  return `$${v.toLocaleString()}`;
}

function fmtMonthlyTotal(v: number | string): string {
  if (typeof v === "string") return v;
  if (v === 0) return "$0/mo";
  if (v < 100) return `$${v.toFixed(2)}/mo`;
  return `$${v.toLocaleString()}/mo`;
}

/** Deterministic 4-digit header suffix derived from the report UUID. */
function headerIdSuffix(id: string): string {
  const hex = id.replace(/[^0-9a-f]/gi, "").slice(-4).padStart(4, "0");
  return hex.toUpperCase();
}

function headerIdPrefix(domain: string): string {
  return domain.split(".")[0].replace(/[^a-z0-9]/gi, "").toUpperCase() || "SITE";
}

function formatScannedAt(iso: string): string {
  const d = new Date(iso);
  const date = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return `${date} · ${time}`;
}

/** Flatten DetectedStack into displayable pills, preserving category order. */
function detectedPills(d: DetectedStack | null): { label: string; value: string }[] {
  if (!d) return [];
  const pills: { label: string; value: string }[] = [];
  if (d.hosting) pills.push({ label: "hosting", value: d.hosting });
  if (d.framework) pills.push({ label: "framework", value: d.framework });
  if (d.cms) pills.push({ label: "cms", value: d.cms });
  for (const v of d.cdn ?? []) pills.push({ label: "cdn", value: v });
  for (const v of d.payments ?? []) pills.push({ label: "payments", value: v });
  for (const v of d.auth ?? []) pills.push({ label: "auth", value: v });
  for (const v of d.analytics ?? []) pills.push({ label: "analytics", value: v });
  for (const v of d.support ?? []) pills.push({ label: "support", value: v });
  for (const v of d.email ?? []) pills.push({ label: "email", value: v });
  return pills;
}

/**
 * Phase 2.5 narrative arc, top to bottom:
 *   1. Header bar (verdict id + scanned-at)
 *   2. Title block (name + tagline + tier badge)
 *   3. Wedge score hero (giant number, server-derived) + tier sub-line
 *   4. Wedge thesis lede (the LLM's load-bearing sentence)
 *   5. Wedge map (promoted MoatBreakdown — the seven axes + door/watch-out)
 *   6. Editorial color (take + take_sub)
 *   7. Cost of competing (cost breakdown reframed)
 *   8. Build complexity (challenges reframed as "what you're up against")
 *   9. Stack receipt (their position — fingerprinted + inferred)
 *   10. Alternatives ("indies who've already attacked this category")
 *   11. CTA
 *   12. Footer
 */
export function VerdictReport({ report: v, comparisons }: Props) {
  const tierBg = TIER_BG_CLASS[v.tier];
  const tierSubline = TIER_SUBLINE[v.tier];
  const scannedAtDisplay = formatScannedAt(v.scanned_at);
  const idSuffix = headerIdSuffix(v.id);
  const idPrefix = headerIdPrefix(v.domain);

  return (
    <div className="bg-paper border-[2.5px] border-ink shadow-[5px_5px_0_0_#0a0a0a]">
      {/* HEADER BAR */}
      <div className="flex justify-between items-center gap-3 px-4 sm:px-[22px] py-3 sm:py-3.5 bg-bg border-b-[2.5px] border-ink font-mono text-[10px] sm:text-[11px] tracking-[0.05em] flex-wrap">
        <div className="flex gap-3.5 items-center">
          <span className="bg-ink text-accent px-2 py-0.5 font-bold tracking-[0.1em]">
            SAASPOCALYPSE
          </span>
          <span className="opacity-60">
            verdict #{idPrefix}-{idSuffix}
          </span>
        </div>
        <div className="opacity-60">scanned {scannedAtDisplay}</div>
      </div>

      {/* TITLE BLOCK */}
      <div className="px-5 sm:px-11 pt-7 sm:pt-9 pb-7 border-b-[2.5px] border-ink grid grid-cols-[1fr_auto] gap-8 items-center max-[640px]:grid-cols-1 max-[640px]:gap-5">
        <div className="min-w-0">
          <div className="font-mono text-xs font-bold tracking-[0.15em] uppercase text-muted mb-2.5">
            subject of investigation
          </div>
          <h1 className="font-display font-bold text-[36px] sm:text-[52px] leading-none tracking-[-0.03em] m-0 break-words">
            {v.name}
          </h1>
          <div className="font-mono text-sm mt-2.5 opacity-70">▸ {v.tagline}</div>
        </div>

        <div
          className={`inline-flex min-h-[48px] items-center gap-3 justify-self-end whitespace-nowrap border-[2.5px] border-ink px-3.5 py-2 shadow-[4px_4px_0_0_#0a0a0a] rotate-[-1deg] max-[640px]:justify-self-start ${tierBg}`}
        >
          <span className="font-mono text-[10px] font-bold uppercase tracking-[0.16em] opacity-65">
            verdict
          </span>
          <span className={`h-2.5 w-2.5 rounded-full border-2 border-ink ${TIER_DOT_CLASS[v.tier]}`} />
          <span className="font-display text-xl font-bold tracking-[0.04em]">
            {v.tier}
          </span>
        </div>
      </div>

      {/* WEDGE SCORE HERO */}
      <div className="grid grid-cols-[280px_1fr] border-b-[2.5px] border-ink max-[720px]:grid-cols-1">
        <div
          className={`px-5 sm:px-7 py-6 sm:py-8 border-r-[2.5px] border-ink flex flex-col justify-between min-h-[200px] sm:min-h-[260px] gap-4 sm:gap-0 max-[720px]:border-r-0 max-[720px]:border-b-[2.5px] ${tierBg}`}
        >
          <div className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase text-[#333]">
            wedge score
          </div>
          <div className="flex items-baseline gap-2">
            <div className="font-display font-bold text-[100px] sm:text-[140px] leading-[0.85] tracking-[-0.05em] text-ink">
              {v.wedge_score}
            </div>
            <div className="font-display text-[22px] sm:text-[28px] font-medium opacity-50">
              /100
            </div>
          </div>
          <div className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-70">
            tier · <span className="font-bold text-ink">{v.tier.toLowerCase()}</span>
          </div>
        </div>

        <div className="px-5 sm:px-10 py-6 sm:py-8 flex flex-col justify-center">
          <div className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase text-muted mb-3.5">
            wedge thesis
          </div>
          {/* LEDE — the LLM's one-sentence wedge thesis. The headline of
              the report; everything below is supporting evidence. */}
          <p className="font-display text-xl sm:text-2xl font-medium leading-[1.3] tracking-[-0.015em] m-0 text-balance">
            {v.wedge_thesis}
          </p>
          <div className="mt-4 mb-0 flex items-baseline gap-3 text-[13px] font-mono text-muted flex-wrap">
            <span className="font-bold text-ink uppercase tracking-[0.1em] text-[11px]">
              {tierSubline}
            </span>
            <span className="opacity-50">·</span>
            <span>ship in {v.time_estimate}</span>
            <span className="opacity-50">·</span>
            <span>run for {fmtMonthlyTotal(v.est_total)}</span>
          </div>
        </div>
      </div>

      {/* WEDGE MAP — promoted MoatBreakdown. Renders only when projection
          ran for this report (legacy reports without a moat row skip it). */}
      {v.moat ? (
        <MoatBreakdown
          moat={v.moat}
          slug={v.slug}
          weakestAxis={v.weakest_moat_axis}
        />
      ) : null}

      {/* EDITORIAL COLOR — take + take_sub. Sits BELOW the wedge map so the
          map gets to do its job before the prose colors it. */}
      <div className="px-5 sm:px-11 py-6 sm:py-8 border-b-[2.5px] border-ink bg-bg">
        <SectionHeading
          label="take"
          title="the blunt take."
          meta="color around the thesis"
        />
        <p className="font-display text-xl sm:text-2xl font-medium leading-[1.3] tracking-[-0.015em] m-0 text-balance">
          &ldquo;{v.take}&rdquo;
        </p>
        <p className="text-[15px] leading-normal mt-4 mb-0 opacity-80 max-w-[680px]">
          {v.take_sub}
        </p>
      </div>

      {/* COST OF COMPETING */}
      <div className="px-5 sm:px-11 py-6 sm:py-8 border-b-[2.5px] border-ink">
        <div className="flex justify-between items-baseline mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="bg-ink text-accent px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] select-none leading-none">
              cost
            </span>
            <h3 className="font-display text-[22px] sm:text-[26px] font-bold m-0 tracking-[-0.02em]">
              cost of competing.
            </h3>
          </div>
          <div className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-60">
            their price ←→ your run-rate
          </div>
        </div>

        <div className="grid grid-cols-[1fr_40px_1fr] gap-4 items-stretch max-[720px]:grid-cols-1">
          {/* THEIR price */}
          <div className="border-[2.5px] border-ink bg-[#fff5f3]">
            <div className="px-4 py-2.5 border-b-[2.5px] border-ink font-mono text-[11px] font-bold tracking-[0.1em] uppercase flex justify-between">
              <span>what they charge</span>
              <span className="text-coral">●</span>
            </div>
            <div className="px-5 pt-5 pb-6">
              <div className="font-mono text-xs opacity-70 mb-1.5">
                {v.current_cost.label}
              </div>
              <div className="flex items-baseline gap-1.5">
                <div className="font-display text-[36px] sm:text-[44px] font-bold leading-none tracking-[-0.03em] break-words min-w-0">
                  {typeof v.current_cost.price === "number"
                    ? `$${v.current_cost.price}`
                    : v.current_cost.price}
                </div>
                <div className="text-sm opacity-60">/ {v.current_cost.unit}</div>
              </div>
              {v.current_cost.note && (
                <div className="font-mono text-[11px] opacity-60 mt-1.5">
                  ※ {v.current_cost.note}
                </div>
              )}
              <div className="border-t border-dashed border-[#ccc] pt-2.5 mt-4 flex justify-between font-mono text-xs">
                <span className="opacity-60">annual:</span>
                <span className="font-bold">
                  {typeof v.current_cost.annual === "number"
                    ? `$${v.current_cost.annual}`
                    : v.current_cost.annual}
                </span>
              </div>
            </div>
          </div>

          {/* arrow */}
          <div
            aria-hidden
            className="flex items-center justify-center font-display text-[40px] font-bold tracking-[-0.05em] max-[720px]:hidden"
          >
            ↔
          </div>
          <div
            aria-hidden
            className="hidden max-[720px]:flex items-center justify-center font-display text-[32px] font-bold"
          >
            ↕
          </div>

          {/* YOUR run-rate */}
          <div className="border-[2.5px] border-ink bg-[#f0fdf4] shadow-[5px_5px_0_0_#0a0a0a]">
            <div className="px-4 py-2.5 border-b-[2.5px] border-ink font-mono text-[11px] font-bold tracking-[0.1em] uppercase bg-accent flex justify-between">
              <span>what running yours costs</span>
              <span>✦</span>
            </div>
            <div className="px-5 pt-4 pb-5 font-mono text-[13px]">
              {v.est_cost.map((line, i) => (
                <div
                  key={i}
                  className={`flex justify-between gap-3 py-1 ${
                    i < v.est_cost.length - 1
                      ? "border-b border-dashed border-[#ccc]"
                      : ""
                  }`}
                >
                  <span className="opacity-75 min-w-0 break-words">
                    {String(i + 1).padStart(2, "0")} · {line.line}
                  </span>
                  <span className="font-bold whitespace-nowrap">
                    {fmtMoney(line.cost)}
                  </span>
                </div>
              ))}
              <div className="border-t-2 border-ink mt-2 pt-2 flex justify-between font-display text-lg font-bold">
                <span>TOTAL / mo</span>
                <span>{fmtMoney(v.est_total)}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-[18px] px-4 py-2.5 border-2 border-dashed border-ink bg-bg font-mono text-[13px] flex justify-between gap-3 flex-wrap">
          <span className="font-bold tracking-[0.05em]">▸ break-even:</span>
          <span>{v.break_even}</span>
        </div>
      </div>

      {/* WHAT YOU'RE UP AGAINST — the build complexity. Reframed from
          "challenges to clone" to "what you're up against on the build."
          The moat already covered the defensive walls; this section is
          purely the engineering reality of shipping a contender. */}
      <div className="px-5 sm:px-11 py-6 sm:py-8 border-b-[2.5px] border-ink">
        <div className="flex justify-between items-baseline mb-2 gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="bg-ink text-accent px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] select-none leading-none">
              build
            </span>
            <h3 className="font-display text-[22px] sm:text-[26px] font-bold m-0 tracking-[-0.02em]">
              what you&apos;re up against.
            </h3>
          </div>
          <div className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-60">
            est. total: {v.time_estimate}
          </div>
        </div>
        <div className="font-mono text-xs opacity-60 mb-5">
          {v.time_breakdown}
        </div>

        {/* legend */}
        <div className="flex gap-3.5 mb-4 font-mono text-[11px] tracking-[0.1em] uppercase flex-wrap">
          {DIFFICULTIES.map((k) => (
            <div key={k} className="flex gap-1.5 items-center">
              <div
                className={`w-3 h-3 border-[1.5px] border-ink ${DIFF_BG_CLASS[k]}`}
              />
              <span className="opacity-70">{k}</span>
            </div>
          ))}
        </div>

        <div className="grid gap-2">
          {v.challenges.map((c, i) => (
            <div
              key={i}
              className="grid grid-cols-[40px_110px_1fr] gap-3.5 items-center px-3.5 py-2.5 border-2 border-ink bg-paper max-[520px]:grid-cols-[110px_1fr]"
            >
              <div className="font-mono text-[13px] font-bold text-[#999] max-[520px]:hidden">
                {String(i + 1).padStart(2, "0")}
              </div>
              <div
                className={`font-mono text-[11px] tracking-[0.1em] uppercase font-bold px-2 py-1 border-[1.5px] border-ink text-center ${DIFF_BG_CLASS[c.diff]}`}
              >
                {c.diff}
              </div>
              <div className="min-w-0">
                <div className="font-display text-base font-semibold tracking-[-0.005em] break-words">
                  {c.name}
                </div>
                <div className="text-[13px] opacity-70 mt-0.5 break-words">
                  {c.note}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* THEIR POSITION — stack receipt. Their inferred / detected
          infrastructure choices. Inferred tag covers accuracy. */}
      <div className="px-5 sm:px-11 py-6 sm:py-8 border-b-[2.5px] border-ink bg-bg">
        <div className="flex justify-between items-baseline mb-4 gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="bg-ink text-accent px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] select-none leading-none">
              stack
            </span>
            <h3 className="font-display text-[22px] sm:text-[26px] font-bold m-0 tracking-[-0.02em]">
              their position.
            </h3>
          </div>
          <div className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-60">
            inferred + measured stack
          </div>
        </div>

        {/* detected signals — server-fingerprinted */}
        {(() => {
          const pills = detectedPills(v.detected_stack);
          if (pills.length === 0) return null;
          return (
            <div className="mb-[18px]">
              <div className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase opacity-60 mb-2.5 flex items-center gap-2">
                <span>detected signals</span>
                <span className="opacity-50">· measured</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {pills.map((p, i) => (
                  <span
                    key={i}
                    className="font-mono text-xs border-2 border-ink max-w-full break-words flex items-center bg-paper"
                  >
                    <span className="bg-accent text-ink px-2 py-[5px] font-bold tracking-[0.1em] uppercase border-r-[1.5px] border-ink">
                      {p.label}
                    </span>
                    <span className="px-2.5 py-[5px]">{p.value}</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })()}

        {/* stack pills — inferred */}
        <div className="pt-[18px] border-t-[1.5px] border-dashed border-ink">
          <div className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase opacity-60 mb-2.5">
            recommended stack <span className="opacity-50">· inferred</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {v.stack.map((s, i) => (
              <span
                key={i}
                className={`font-mono text-xs px-2.5 py-[5px] border-2 border-ink max-w-full break-words ${
                  i % 2 === 0 ? "bg-paper" : "bg-bg"
                }`}
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ALTERNATIVES — who else has already attacked this category. */}
      <div className="px-5 sm:px-11 py-6 sm:py-8 border-b-[2.5px] border-ink">
        <div className="flex justify-between items-baseline mb-5 gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <span className="bg-ink text-accent px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] select-none leading-none">
              rivals
            </span>
            <h3 className="font-display text-[22px] sm:text-[26px] font-bold m-0 tracking-[-0.02em]">
              who else has tried this.
            </h3>
          </div>
          <div className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-60">
            indies + alternatives
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3.5 max-[640px]:grid-cols-1">
          {v.alternatives.map((alt, i) => (
            <div
              key={i}
              className="border-[2.5px] border-ink bg-paper px-[18px] py-4 min-w-0"
            >
              <div className="font-mono text-[10px] tracking-[0.15em] uppercase opacity-50">
                option {String.fromCharCode(65 + i)}
              </div>
              <div className="font-display text-[20px] sm:text-[22px] font-bold tracking-[-0.01em] mt-1 break-words">
                {alt.name}
              </div>
              <div className="text-sm leading-normal mt-2 opacity-80 break-words">
                {alt.why}
              </div>
            </div>
          ))}
        </div>
      </div>

      {comparisons}

      {/* CTA */}
      <div className="px-5 sm:px-11 py-6 sm:py-7 bg-ink text-bg grid grid-cols-[1fr_auto] gap-5 sm:gap-6 items-center max-[720px]:grid-cols-1">
        <div>
          <div className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase text-accent mb-1">
            ready to wedge in?
          </div>
          <div className="font-display text-[20px] sm:text-[26px] font-bold tracking-[-0.02em] leading-[1.2] sm:leading-[1.15]">
            {v.tier === "SOFT"
              ? "Get the wedge plan. Ship a contender by Sunday."
              : v.tier === "CONTESTED"
                ? "Get the wedge plan. Cancel some plans."
                : "Get the wedge plan. You're not climbing the wall — you're finding the door."}
          </div>
        </div>
        <PurchaseCTA
          slug={v.slug}
          wedgeScore={v.wedge_score}
          priceCents={guidePriceCents()}
        />
      </div>

      {/* FOOTER */}
      <div className="px-4 sm:px-[22px] py-2.5 font-mono text-[10px] tracking-[0.1em] uppercase text-muted bg-bg border-t-[2.5px] border-ink flex justify-between gap-3 flex-wrap">
        <span>▸ generated with love, by a heartless robot</span>
        <span>verdict v2.5 · saaspocalypse.dev</span>
      </div>
    </div>
  );
}
