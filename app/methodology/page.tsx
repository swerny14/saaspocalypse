import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { RUBRIC_VERSION } from "@/lib/normalization/moat";

export const metadata: Metadata = {
  title: "SaaS moat scoring methodology - saaspocalypse",
  description:
    "How saaspocalypse scores SaaS moat depth and wedge opportunity: seven deterministic axes, SERP distribution signals, capability tags, and no LLM-authored score.",
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
          how we score SaaS moats.
        </h1>
        <p className="font-mono text-sm opacity-70 mt-2">
          rubric version v{RUBRIC_VERSION} · last updated 2026-04-30
        </p>

        <div className="prose-content mt-10 space-y-6 text-[17px] leading-relaxed">
          <p>
            Tier (SOFT / CONTESTED / FORTRESS) tells you how attackable the
            incumbent is. SOFT means the engineering bar is low and the wedge
            is in distribution or niche. CONTESTED means the head-on clone is
            real work but doable. FORTRESS means the walls are thick — you
            can&apos;t bulldoze them, so you find a crack.
          </p>
          <p>
            The score under each tier is a weighted aggregate of seven moat
            axes, each 0–10. Higher = thicker walls. Lower = wedgeable. The
            math is deterministic — derived from the per-report normalization
            projection (canonical components, capabilities, attributes) plus a
            single Serper SERP call for distribution signals. No LLM is in the
            scoring loop, on purpose.
          </p>

          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] mt-12 mb-4">
            the seven axes.
          </h2>

          <Axis
            name="Capital"
            blurb="What the incumbent had to invest to build the thing. Audits, licensing, banking relationships, training infrastructure — capex you can't shortcut around."
            how="Derived from capex-flagged cost lines, take prose, wedge thesis, challenge notes, descriptive est_total strings, and numeric monthly cost magnitude. SOC 2 is excluded because it is table-stakes, not a real moat."
          />
          <Axis
            name="Technical"
            blurb="Depth of the incumbent's underlying engineering. The R&D you can't recreate by gluing OSS libraries together."
            how="Derived from the difficulty distribution of the report challenges. Nightmare, hard, and medium challenges add weighted points; easy challenges do not. The LLM does not emit a technical score."
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
            how="Counts capabilities tagged for network effects (multi_sided, ugc, marketplace, viral_loop). 1 capability → 4; 2 → 8; 3+ → 10."
          />
          <Axis
            name="Switching"
            blurb="How sticky customer data and workflow state are once they're in."
            how="Counts capabilities tagged for switching cost (data_storage, workflow_lock_in, integration_hub). Same 4-per-capability curve."
          />
          <Axis
            name="Data"
            blurb="Proprietary data that accumulates with use, and would be expensive or impossible for a wedge entrant to recreate."
            how="Counts capabilities tagged for data moats (proprietary_dataset, training_data, behavioral). Same 4-per-capability curve."
          />
          <Axis
            name="Regulatory"
            blurb="Real licenses, audits, regulatory exposure that legally bars indie hackers from operating."
            how="Counts capabilities tagged for regulatory moats (hipaa, finra, gdpr_critical, licensed). Same 4-per-capability curve. SOC 2 deliberately does NOT count — every B2B SaaS would otherwise score artificially high."
          />
          <Axis
            name="Distribution"
            blurb="How firmly the incumbent owns the SERP and the brand-recognition surface for their own name. The hardest moat for a wedge entrant to chip away at."
            how="Weighted aggregate of six sub-signals from a single Serper SERP call: sitelinks under the top organic result (× 4), compressed organic (Google returns < 10 results, indicating entity-confidence — × 3), authoritative third-party domains in top 10 (Wikipedia / LinkedIn / Crunchbase / TechCrunch / Bloomberg / G2 / etc. — gated on top organic owned, × 3), Knowledge Graph presence (× 2), top organic owned (× 2), own-domain count in top 10 (× 1). Returns null when the SERP call fails entirely."
          />

          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] mt-12 mb-4">
            the aggregate.
          </h2>
          <p>
            <strong>Weighted root-mean-square across the seven axes.</strong>{" "}
            Equal weights — each axis is roughly as important as the others
            when you&apos;re deciding whether a small team can compete. RMS rather than
            arithmetic mean because real moats are often specialist:
            Stripe&apos;s defensibility lives in capital + technical +
            regulatory + distribution, with the other three axes legitimately
            near zero. Averaging that to 5/10 misrepresents how hard it
            actually is to displace. RMS rewards concentration without
            changing anything for products whose strength is spread evenly.
          </p>
          <p>
            Distribution-axis can return null when the SERP call fails — in
            that case the aggregate skips it from both numerator and
            denominator and computes honestly over the six axes we could
            score. We&apos;ll re-tune the cross-axis weights themselves once
            we have enough scored reports to see real clustering.
          </p>

          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] mt-12 mb-4">
            what we don&apos;t score.
          </h2>
          <p>
            <strong>Brand is not directly modeled.</strong> The closest proxy
            is in the distribution axis (Knowledge Graph + authoritative
            third-party coverage), which captures the slice of brand strength
            that&apos;s legible to Google&apos;s index. The rest — emotional
            resonance, founder following, design taste — is harder to put a
            number on without paid data, so we don&apos;t pretend.
          </p>
          <p>
            <strong>Capability of the team behind the product is not
            modeled.</strong> A genuinely brilliant engineering org can hold a
            moat the structural axes don&apos;t see.
          </p>

          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] mt-12 mb-4">
            why deterministic.
          </h2>
          <p>
            The point of the score is to be <em>defensible</em>. Every number
            on a report card can be traced back to a specific component, a
            specific capability tag, a specific cost line, or a specific
            Serper-payload field. If the score is wrong, the input is wrong,
            and the input is fixable. An LLM-authored score has none of those
            properties.
          </p>
          <p>
            The taxonomy itself — which capabilities exist, which moat tags
            they carry, what each component&apos;s commoditization level is —
            is hand-curated and reviewed in code. The admin tools at{" "}
            <code>/admin/unknowns</code> and the score workbench{" "}
            use Claude to <em>suggest</em> additions, but a human decides.
          </p>

          <p className="mt-12 font-mono text-xs opacity-60">
            Source-of-truth: <code>lib/normalization/moat.ts</code> ·{" "}
            <code>lib/scanner/distribution.ts</code> ·{" "}
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

