import Link from "next/link";
import { HEADLINES } from "@/lib/content";
import { guidePriceCents } from "@/lib/stripe";
import { Scanner } from "./Scanner";

export function Hero() {
  const headline = HEADLINES[0];
  const priceCents = guidePriceCents();

  return (
    <section className="overflow-hidden px-6 sm:px-12 pt-16 sm:pt-20 pb-[60px]">
      <div className="mx-auto grid max-w-[1100px] justify-items-center gap-7 text-center">
        <div className="eh-pill select-none inline-flex items-center gap-3 rounded-full border-2 border-ink bg-white px-4 py-2 font-display text-[13px] font-semibold tracking-[0.06em] text-ink shadow-[2px_2px_0_0_var(--color-ink)]">
          <span className="h-2 w-2 rounded-full border-[1.5px] border-ink bg-accent" />
          SaaS wedge scanner
        </div>

        <div className="grid justify-items-center">
          <h1 className="eh-h1 font-display m-0 text-[clamp(62px,9vw,140px)] font-bold leading-[0.98] tracking-[-0.04em] text-ink text-balance">
            Scan any SaaS.
          </h1>
          <h2 className="eh-h2 font-display m-0 mt-[0.25em] max-w-[20ch] text-[clamp(34px,4.4vw,60px)] font-medium leading-[1.1] tracking-[-0.02em] text-[#3a3a3a] text-balance">
            Find the{" "}
            <span className="relative inline-block whitespace-nowrap">
              <span className="font-serif italic font-semibold tracking-[-0.01em] text-ink">
                weak spot
              </span>
              <svg
                className="absolute left-[-3%] right-[-3%] bottom-[-0.18em] w-[106%] h-[0.34em] overflow-visible pointer-events-none"
                viewBox="0 0 320 28"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  className="eh-mark-path"
                  d="M6 18 C 60 6, 130 24, 200 12 S 290 16, 314 10"
                />
              </svg>
            </span>
            .
          </h2>
        </div>

        <p className="font-mono text-base sm:text-xl max-w-[620px] leading-normal m-0 text-[#2a2a2a]">
          {headline.sub}
        </p>

        <div id="scanner" className="w-full max-w-[1000px] scroll-mt-24">
          <Scanner priceCents={priceCents} />
        </div>

        <div className="select-none font-mono text-xs opacity-[0.65] flex flex-col sm:flex-row sm:flex-wrap justify-center gap-1 sm:gap-5">
          <span>* no signup</span>
          <span>* no credit card</span>
          <span>* public reports</span>
          <span>* press Enter to find the wedge</span>
        </div>

        <p className="pt-2.5 border-t border-ink/10 max-w-[560px] font-mono italic text-[11px] leading-[1.55] opacity-55">
          By submitting, you agree to our{" "}
          <Link href="/terms" className="underline hover:opacity-100">
            Terms
          </Link>{" "}
          &{" "}
          <Link href="/privacy" className="underline hover:opacity-100">
            Privacy Policy
          </Link>
          . Reports are public - don&apos;t submit confidential pages.
        </p>
      </div>
    </section>
  );
}
