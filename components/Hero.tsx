import Link from "next/link";
import { HEADLINES } from "@/lib/content";
import { RansomHeadline } from "./RansomHeadline";
import { Scanner } from "./Scanner";

export function Hero() {
  const headline = HEADLINES[0];

  return (
    <section className="overflow-hidden pt-8 sm:pt-20 pb-[60px]">
      <div className="container">
        <div className="grid gap-5 max-w-[1000px]">
          <div className="select-none text-right font-mono text-[11px] uppercase tracking-[0.15em] opacity-60">
            est. 2026 · indie hackers welcome
          </div>
          <div className="select-none flex items-center gap-2 px-3 py-1.5 border-2 border-ink bg-paper font-mono text-xs font-medium">
            <span className="w-2 h-2 bg-success rounded-full shrink-0" />
            service is live · 12,483 SaaS ruined today
          </div>

          <RansomHeadline text={headline.top} />

          <p className="font-mono text-base sm:text-xl max-w-[620px] leading-normal m-0 text-[#2a2a2a]">
            {headline.sub}
          </p>
        </div>

        <div id="scanner" className="mt-6 sm:mt-9 scroll-mt-24">
          <Scanner />
        </div>

        <div className="select-none mt-3.5 font-mono text-xs opacity-[0.65] flex flex-col sm:flex-row sm:flex-wrap gap-1 sm:gap-5">
          <span>✦ no signup</span>
          <span>✦ no credit card</span>
          <span>✦ we don&apos;t have a database (yet)</span>
          <span>✦ press ↵ to judge</span>
        </div>

        <p className="mt-3 pt-2.5 border-t border-ink/10 max-w-[560px] font-mono italic text-[11px] leading-[1.55] opacity-55">
          By submitting, you agree to our{" "}
          <Link href="/terms" className="underline hover:opacity-100">
            Terms
          </Link>{" "}
          &{" "}
          <Link href="/privacy" className="underline hover:opacity-100">
            Privacy Policy
          </Link>
          . Reports are public — don&apos;t submit confidential pages.
        </p>
      </div>
    </section>
  );
}
