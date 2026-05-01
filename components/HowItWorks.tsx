import { HOW_STEPS } from "@/lib/content";
import { SectionHead } from "./SectionHead";

export function HowItWorks() {
  return (
    <section id="how" className="bg-ink text-bg py-20">
      <div className="container">
        <SectionHead
          eyebrow="the whole bit"
          title="Three steps. One wedge."
          sub="We do the scanning. You do the hard part where the idea becomes a product and your sleep schedule files a complaint."
          dark
        />
        <div className="how-grid">
          {HOW_STEPS.map((s) => (
            <div
              key={s.n}
              className="bg-[#1a1a1a] border-2 border-accent p-7 relative"
            >
              <div className="font-mono text-[13px] text-accent font-bold tracking-[0.1em]">
                STEP {s.n}
              </div>
              <h3 className="font-display text-[26px] sm:text-[32px] font-bold my-3 tracking-[-0.02em] pr-20 sm:pr-24">
                {s.t}
              </h3>
              <p className="font-mono text-[15px] leading-[1.6] m-0 opacity-85">
                {s.b}
              </p>
              <div
                aria-hidden
                className="absolute top-3 right-3 sm:top-4 sm:right-4 font-display text-[38px] sm:text-[52px] font-bold opacity-15 text-accent leading-none pointer-events-none"
              >
                {s.n}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
