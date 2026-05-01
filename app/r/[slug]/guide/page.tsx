import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getReportBySlug } from "@/lib/db/reports";
import { getPurchaseByAccessToken } from "@/lib/db/purchases";
import { getBuildGuideByReportId } from "@/lib/db/build_guides";
import { BuildGuide } from "@/components/BuildGuide";
import { GuideStreamingClient } from "./streaming-client";

export const dynamic = "force-dynamic";
// Guides are private — never cache at the edge.
export const revalidate = 0;

export const metadata: Metadata = {
  title: "your wedge guide · saaspocalypse",
  robots: { index: false, follow: false },
  // The access token rides in the URL. Block referrer leakage so the token
  // doesn't reach external links the guide may render.
  referrer: "no-referrer",
};

type Params = Promise<{ slug: string }>;
type Search = Promise<{ t?: string | string[]; checkout?: string | string[] }>;

export default async function GuidePage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Search;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const tokenRaw = sp.t;
  const token = Array.isArray(tokenRaw) ? tokenRaw[0] : tokenRaw;

  if (!token) {
    // No token → redirect back to the report page.
    redirect(`/r/${slug}`);
  }

  const purchase = await getPurchaseByAccessToken(token);
  if (!purchase) {
    return <AccessDenied reason="invalid token" slug={slug} />;
  }
  if (purchase.status !== "paid") {
    return <AccessDenied reason="purchase not paid yet" slug={slug} />;
  }

  const report = await getReportBySlug(slug);
  if (!report) notFound();
  if (report.id !== purchase.report_id) {
    return <AccessDenied reason="token doesn't match this report" slug={slug} />;
  }

  const guide = await getBuildGuideByReportId(report.id);

  return (
    <main className="bg-bg min-h-screen py-10">
      <div className="container">
        {guide ? (
          <BuildGuide report={report} guide={guide} />
        ) : (
          <GuideStreamingClient slug={slug} token={token} report={report} />
        )}
      </div>
    </main>
  );
}

function AccessDenied({ reason, slug }: { reason: string; slug: string }) {
  return (
    <main className="bg-bg min-h-screen py-10">
      <div className="container">
        <div className="bru bg-paper p-8 max-w-[560px]">
          <div className="font-mono text-[11px] font-bold tracking-[0.15em] uppercase text-danger mb-2">
            access denied
          </div>
          <h1 className="font-display font-bold text-[28px] m-0 mb-3 tracking-[-0.02em]">
            That link didn&apos;t check out.
          </h1>
          <p className="text-[15px] leading-[1.6] m-0 mb-4 opacity-80">
            {reason === "purchase not paid yet"
              ? "Your payment hasn't cleared yet. Stripe should email within a minute — if it's been longer, try refreshing."
              : "This magic link is invalid or has been tampered with. If you bought a guide, re-open the original email."}
          </p>
          <a
            href={`/r/${slug}`}
            className="font-mono text-[13px] font-bold uppercase tracking-[0.1em] bg-ink text-accent px-3 py-2 no-underline inline-block"
          >
            ← back to the verdict
          </a>
        </div>
      </div>
    </main>
  );
}
