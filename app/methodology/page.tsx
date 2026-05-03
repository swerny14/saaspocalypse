import type { Metadata } from "next";
import Link from "next/link";
import { Footer } from "@/components/Footer";
import { RUBRIC_VERSION } from "@/lib/normalization/moat";

export const metadata: Metadata = {
  title: "SaaS moat scoring methodology - saaspocalypse",
  description:
    "How saaspocalypse scores SaaS moat depth and wedge opportunity: LLM axis judgment, measured stack signals, and deterministic SERP distribution.",
  robots: { index: true, follow: true },
};

const REPORT_PATH_RE = /^\/r\/[a-z0-9][a-z0-9-]{0,128}$/;
const COMPARE_PATH_RE = /^\/compare\/[a-z0-9][a-z0-9-]{0,128}-vs-[a-z0-9][a-z0-9-]{0,128}$/;

function parseBackTarget(raw: string | string[] | undefined): {
  href: string;
  label: string;
} {
  const candidate = typeof raw === "string" ? raw : "";
  if (candidate && REPORT_PATH_RE.test(candidate)) {
    return { href: candidate, label: "<- back to report" };
  }
  if (candidate && COMPARE_PATH_RE.test(candidate)) {
    return { href: candidate, label: "<- back to comparison" };
  }
  return { href: "/", label: "<- back home" };
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
          rubric version v{RUBRIC_VERSION} - last updated 2026-05-02
        </p>

        <div className="prose-content mt-10 space-y-6 text-[17px] leading-relaxed">
          <p>
            Tier (SOFT / CONTESTED / FORTRESS) tells you how attackable the
            incumbent is. SOFT means the walls are thin. CONTESTED means the
            fight is real but not absurd. FORTRESS means you are not cloning
            head-on; you are looking for a narrow crack.
          </p>
          <p>
            The score under each tier is a weighted aggregate of seven moat
            axes, each 0-10. Higher = thicker walls. Lower = wedgeable. The
            evidence layer is deterministic where it should be: homepage
            fetch, stack detection, cost parsing, and a Serper SERP call for
            distribution. The six fuzzy moat axes use LLM judgment against
            those receipts. Normalized capabilities still power similarity and
            compare pages, but they are not part of the public score.
          </p>

          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] mt-12 mb-4">
            the seven axes.
          </h2>

          <Axis
            name="Capital"
            blurb="What the incumbent had to invest to build the thing. Audits, licensing, banking relationships, training infrastructure - capex you cannot shortcut around."
            how="LLM-scored from the verdict, cost lines, challenges, and detected evidence. Real non-software investment pushes this up; normal SaaS hosting spend does not."
          />
          <Axis
            name="Technical"
            blurb="Depth of the incumbent's underlying engineering. The R&D you cannot recreate by gluing OSS libraries together."
            how="LLM-scored from the challenge list, stack, and product evidence. Realtime/collab depth, security-sensitive systems, AI/data pipelines, hard integrations, and research-grade work push it up; ordinary CRUD does not."
          />
          <Axis
            name="Network"
            blurb="Users compound users: the product gets more valuable as more people use it."
            how="LLM-scored from the verdict, challenges, pricing, and site evidence. High scores need real marketplace liquidity, UGC, social graph, partner/app ecosystem, viral loop, or multi-sided dynamics."
          />
          <Axis
            name="Switching"
            blurb="How sticky customer data and workflow state are once they are in."
            how="LLM-scored from evidence of trapped customer state, migration pain, approval chains, workflow lock-in, and deep integrations. Exportable CSV-and-leave products stay low."
          />
          <Axis
            name="Data"
            blurb="Proprietary data that accumulates with use, and would be expensive or impossible for a wedge entrant to recreate."
            how="LLM-scored from evidence of proprietary corpus, behavioral flywheel, training data, fraud/risk models, or accumulated non-exportable datasets. Generic analytics and off-the-shelf APIs do not count."
          />
          <Axis
            name="Regulatory"
            blurb="Real licenses, audits, or regulatory exposure that legally bars indie hackers from operating."
            how="LLM-scored from the verdict and evidence. High scores need HIPAA, FINRA, KYC/AML, money transmission, clinical/EHR data, payment obligations, or comparable regulated duties. SOC 2 alone deliberately stays low."
          />
          <Axis
            name="Distribution"
            blurb="How firmly the incumbent owns the SERP and brand-recognition surface for its own name."
            how="Deterministic weighted aggregate from a single Serper SERP call: sitelinks, compressed organic results, authoritative third-party domains, Knowledge Graph presence, top organic owned, and own-domain count in top 10. Returns null when the SERP call fails entirely."
          />

          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] mt-12 mb-4">
            the aggregate.
          </h2>
          <p>
            <strong>Weighted root-mean-square across the seven axes.</strong>{" "}
            Equal weights by default. RMS is intentional: real moats are often
            specialist. Stripe can be fortress-grade because of capital,
            technical, regulatory, and distribution walls even if network,
            switching, and data are not all maxed out.
          </p>
          <p>
            The distribution axis can return null when the SERP call fails. In
            that case the aggregate skips it from both numerator and
            denominator and computes over the six axes we could score.
          </p>

          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] mt-12 mb-4">
            what we do not score.
          </h2>
          <p>
            <strong>Brand is not directly modeled.</strong> The closest proxy
            is in the distribution axis: Knowledge Graph, sitelinks, owned SERP
            results, and authoritative third-party coverage. Emotional
            resonance, founder following, and design taste are real, but we do
            not pretend to measure them precisely from a homepage scan.
          </p>
          <p>
            <strong>Capability of the team behind the product is not
            modeled.</strong> A brilliant engineering org can hold a moat the
            structural axes do not see.
          </p>

          <h2 className="font-display text-3xl font-bold tracking-[-0.02em] mt-12 mb-4">
            why this hybrid.
          </h2>
          <p>
            The point of the score is to be honest. Pure regex math is
            repeatable, but moat depth is semantic: "users can export and
            leave" should lower switching cost, while "years of fraud model
            data" should raise data moat. The LLM makes that judgment; the
            deterministic layer supplies measured facts and computes the final
            aggregate.
          </p>
          <p>
            Tool detection, normalization, distribution scoring, aggregation,
            comparison, and similarity stay deterministic. The six judgment
            axes are LLM-scored because that is the more honest rubric for the
            question users are actually asking: where are the walls thin?
          </p>

          <p className="mt-12 font-mono text-xs opacity-60">
            Source-of-truth: <code>lib/normalization/moat_llm.ts</code> /{" "}
            <code>lib/normalization/moat.ts</code> /{" "}
            <code>lib/scanner/distribution.ts</code> /{" "}
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
          0-10
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
