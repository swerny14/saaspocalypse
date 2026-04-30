import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { RUBRIC_VERSION } from "@/lib/normalization/moat";

export const metadata: Metadata = {
  title: "Methodology — saaspocalypse",
  description:
    "How saaspocalypse scores moat depth: six axes, deterministic math, no LLM. The rubric we use to decide whether an incumbent SaaS product would actually roll over for a clone.",
  robots: { index: true, follow: true },
};

/**
 * `?from=…` lets the moat-section / compare-page link round-trip the user
 * back to where they came from. Whitelisted strictly to defeat any
 * open-redirect or javascript: trickery — we only honor:
 *   - `/r/<kebab-slug>` (per-report page)
 *   - `/compare/<slug-a>-vs-<slug-b>` (head-to-head page)
 */
const REPORT_PATH_RE = /^\/r\/[a-z0-9][a-z0-9-]{0,128}$/;
const COMPARE_PATH_RE = /^\/compare\/[a-z0-9][a-z0-9-]{0,128}-vs-[a-z0-9][a-z0-9-]{0,128}$/;

function parseBackTarget(raw: string | string[] | undefined): {
  href: string;
  label: string;
} {
  const candidate = typeof raw === "string" ? raw : "";
  if (candidate && REPORT_PATH_RE.test(candidate)) {
    return { href: candidate, label: "← back to report" };
  }
  if (candidate && COMPARE_PATH_RE.test(candidate)) {
    return { href: candidate, label: "← back to comparison" };
  }
  return { href: "/", label: "← back home" };
}

export default async function MethodologyPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string | string[] }>;
}) {
  const sp = await searchParams;
  const back = parseBackTarget(sp.from);
  return (
    <>
      <main className="container py-12 sm:py-16 max-w-3xl">
        <div className="mb-8">
          <Link
            href={back.href}
            className="font-mono text-[11px] tracking-[0.15em] uppercase opacity-60 hover:opacity-100"
          >
            {back.label}
          </Link>
        </div>

        <h1 className="font-display text-[40px] sm:text-[56px] font-bold tracking-[-0.03em] leading-[0.95]">
          how we score moat depth.
        </h1>
        <p className="font-mono text-sm opacity-70 mt-2">
          rubric version v{RUBRIC_VERSION} · last updated 2026-05-02
        </p>

        <div className="prose-content mt-10 space-y-6 text-[17px] leading-relaxed">
          <p>
            Tier (WEEKEND / MONTH / DON&apos;T) tells you how long it&apos;d take
            to <em>build</em> the thing. It doesn&apos;t tell you whether the
            incumbent has anything keeping users from switching to your clone.
            That&apos;s a separate question, and it&apos;s the one moat depth
            answers.
          </p>
          <p>
            We score every report against six axes, each 0–10. The math is
            deterministic — derived from the per-report normalization
            projection (canonical components, capabilities, attributes) and the
            curated taxonomy (commoditization levels, moat tags). No LLM is in
            the scoring loop, on purpose. The aggregate is a weighted average
            of the six.
          </p>

          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] mt-12 mb-4">
            the six axes.
          </h2>

          <Axis
            name="Capital"
            blurb="What the incumbent had to invest to build the thing. Audits, licensing, banking relationships, training infrastructure — capex you can't shortcut your way around."
            how="Derived from the buildability tier (DON'T = 7, MONTH = 4, WEEKEND = 1), plus a boost for capex-flagged est_cost lines (audit, licensing, regulatory, banking, GPUs, training infra, attorneys, interchange — capped at +3), plus a +2 boost when est_total is a non-numeric descriptive string (the LLM gave up trying to put a number on it). SOC 2 is excluded because it's table-stakes, not a real moat."
          />
          <Axis
            name="Technical"
            blurb="Depth of the incumbent's underlying engineering. The R&D you can't recreate by gluing OSS libraries together."
            how="Inverse of the buildability score (lower score = harder problem) at 0.7 weight, plus a boost from `nightmare`/`hard` challenge counts (capped at +4). The buildability score IS our judgment of how hard the incumbent's R&D is, so we use it directly here."
          />
          <p className="font-mono text-[13px] opacity-70 -mt-2">
            <strong className="opacity-100">Note: </strong>
            Capital and Technical deliberately ignore the projection&apos;s
            cost / component data, because that data describes the indie
            hacker&apos;s clone stack, not the incumbent&apos;s actual investment.
            The incumbent&apos;s moat is precisely what you can&apos;t buy off the shelf.
          </p>
          <Axis
            name="Network"
            blurb="Users compound users — the product gets more valuable as more people use it."
            how="Counts how many of the report's matched capabilities carry network-effect tags (multi_sided, ugc, marketplace, viral_loop). 1 capability → 4; 2 → 8; 3+ → 10."
          />
          <Axis
            name="Switching"
            blurb="How sticky customer data and workflow state are once they're in."
            how="Counts capabilities tagged for switching cost (data_storage, workflow_lock_in, integration_hub). Same 4-per-capability curve."
          />
          <Axis
            name="Data"
            blurb="Proprietary data that accumulates with use, and would be expensive or impossible for a clone to recreate."
            how="Counts capabilities tagged for data moats (proprietary_dataset, training_data, behavioral). Same 4-per-capability curve."
          />
          <Axis
            name="Regulatory"
            blurb="Real licenses, audits, regulatory exposure that legally bars indie hackers from operating."
            how="Counts capabilities tagged for regulatory moats (hipaa, finra, gdpr_critical, licensed). Same 4-per-capability curve. Note: SOC 2 deliberately does NOT count — every B2B SaaS would otherwise score artificially high."
          />

          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] mt-12 mb-4">
            the aggregate.
          </h2>
          <p>
            <strong>Weighted root-mean-square across all six axes.</strong>{" "}
            Equal weights — each axis is roughly as important as the others
            when you&apos;re deciding whether to bother attacking an
            incumbent. RMS rather than arithmetic mean because real moats
            are often specialist: Stripe&apos;s defensibility lives in
            capital + technical + regulatory, with the other three axes
            legitimately near zero. Averaging that to 5/10 misrepresents
            how hard it actually is to displace. RMS rewards concentration
            without changing anything for products whose strength is spread
            evenly across the six.
          </p>
          <p>
            We&apos;ll re-tune the weights themselves once we have enough
            scored reports to see real clustering. When we do, the rubric
            version bumps and every report&apos;s score is recomputed from
            scratch.
          </p>

          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] mt-12 mb-4">
            what we don&apos;t score.
          </h2>
          <p>
            <strong>Distribution and brand are not modeled.</strong> They
            matter — sometimes more than any of the six axes — but you cannot
            derive distribution moat from a homepage scan. Putting a number on
            it would weaken the credibility of the rest, so we left it out.
            When you&apos;re looking at a low-aggregate score on a product with
            obvious distribution dominance, that&apos;s the gap to fill in
            yourself.
          </p>
          <p>
            <strong>Capability of the team behind the product is also not
            modeled.</strong> Same reason. A genuinely brilliant engineering
            org can hold a moat that the structural axes don&apos;t see.
          </p>

          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] mt-12 mb-4">
            why deterministic.
          </h2>
          <p>
            The point of the score is to be <em>defensible</em>. Every number
            on a report card can be traced back to a specific component, a
            specific capability tag, or a specific cost line in the projection.
            If the score is wrong, the input data is wrong, and the input data
            is fixable. An LLM-authored score has none of those properties.
          </p>
          <p>
            The taxonomy itself — which capabilities exist, which moat tags
            they carry, what each component&apos;s commoditization level is —
            is hand-curated and reviewed in code. The admin tools at{" "}
            <code>/admin/unknowns</code> use Claude to <em>suggest</em>{" "}
            additions, but a human decides.
          </p>

          <p className="mt-12 font-mono text-xs opacity-60">
            Source-of-truth: <code>lib/normalization/moat.ts</code> ·{" "}
            <code>lib/normalization/taxonomy/</code>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Axis({
  name,
  blurb,
  how,
}: {
  name: string;
  blurb: string;
  how: string;
}) {
  return (
    <div className="border-[2.5px] border-ink bg-paper p-5">
      <div className="flex justify-between items-baseline gap-3 flex-wrap">
        <h3 className="font-display text-2xl font-bold tracking-[-0.02em] m-0">
          {name}
        </h3>
        <div className="font-mono text-[11px] tracking-[0.15em] uppercase opacity-50">
          0–10
        </div>
      </div>
      <p className="text-base mt-2 mb-3">{blurb}</p>
      <p className="font-mono text-[13px] opacity-70 leading-relaxed">
        <strong className="opacity-100">how it&apos;s scored: </strong>
        {how}
      </p>
    </div>
  );
}
