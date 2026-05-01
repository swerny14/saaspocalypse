import Link from "next/link";
import { HEADLINES } from "@/lib/content";
import { Scanner } from "./Scanner";

export function Hero() {
  const headline = HEADLINES[0];

  return (
    <section className="overflow-hidden px-6 sm:px-12 pt-16 sm:pt-20 pb-[60px]">
      <div className="mx-auto grid max-w-[1100px] justify-items-center gap-7 text-center">
        <div className="select-none inline-flex items-center gap-2.5 rounded-full border-[1.5px] border-ink bg-white px-3.5 py-[7px] font-display text-xs font-semibold tracking-[0.05em] text-ink">
          <span className="h-[7px] w-[7px] rounded-full border-[1.5px] border-ink bg-accent" />
          SaaS wedge scanner
        </div>

        <div className="grid justify-items-center">
          <h1 className="font-display m-0 text-[clamp(62px,9vw,140px)] font-bold leading-[0.98] tracking-[-0.04em] text-ink text-balance">
            Scan any SaaS.
          </h1>
          <h2 className="font-display m-0 mt-[0.25em] max-w-[20ch] text-[clamp(34px,4.4vw,60px)] font-medium leading-[1.1] tracking-[-0.02em] text-[#3a3a3a] text-balance">
            Find the{" "}
            <span className="bg-[linear-gradient(var(--color-accent),var(--color-accent))] bg-[length:100%_0.22em] bg-[position:0_88%] bg-no-repeat pb-[0.04em] text-ink">
              weak spot
            </span>
            .
          </h2>
        </div>

        <p className="font-mono text-base sm:text-xl max-w-[620px] leading-normal m-0 text-[#2a2a2a]">
          {headline.sub}
        </p>

        <div id="scanner" className="w-full max-w-[1000px] scroll-mt-24">
          <Scanner />
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
