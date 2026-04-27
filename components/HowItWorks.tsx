import { HOW_STEPS } from "@/lib/content";
import { SectionHead } from "./SectionHead";

export function HowItWorks() {
  return (
    <section id="how" className="bg-ink text-bg py-20">
      <div className="container">
        <SectionHead
          eyebrow="The process (lol)"
          title="Three steps. Two are us."
          sub="The third step is you, on the couch, telling yourself you'll start tomorrow. That's fine. We've been there."
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
              <h3 className="font-display text-[26px] sm:text-[32px] font-bold my-3 tracking-[-0.02em] pr-14 sm:pr-0">
                {s.t}
              </h3>
              <p className="font-mono text-[15px] leading-[1.6] m-0 opacity-85">
                {s.b}
              </p>
              <div
                aria-hidden
                className="absolute top-4 right-4 sm:top-5 sm:right-5 font-display text-[44px] sm:text-[64px] font-bold opacity-15 text-accent leading-none"
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
