import { HEADLINES } from "@/lib/content";
import { RansomHeadline } from "./RansomHeadline";
import { Scanner } from "./Scanner";

export function Hero() {
  const headline = HEADLINES[0];

  return (
    <section className="overflow-hidden pt-20 pb-[60px]">
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

          <p className="font-mono text-xl max-w-[620px] leading-normal m-0 text-[#2a2a2a]">
            {headline.sub}
          </p>
        </div>

        <div id="scanner" className="mt-12">
          <Scanner />
        </div>

        <div className="select-none mt-3.5 font-mono text-xs opacity-[0.65] flex gap-5 flex-wrap">
          <span>✦ no signup</span>
          <span>✦ no credit card</span>
          <span>✦ we don&apos;t have a database (yet)</span>
          <span>✦ press ↵ to judge</span>
        </div>
      </div>
    </section>
  );
}
