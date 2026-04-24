import { TESTIMONIALS } from "@/lib/content";
import { SectionHead } from "./SectionHead";

const CARD_BG = ["bg-accent", "bg-paper", "bg-sticky"] as const;

export function Testimonials() {
  return (
    <section className="py-20">
      <div className="container">
        <SectionHead
          eyebrow="loud fans"
          title="People who exist are saying things."
          sub="These are real quotes from real users if you squint and also accept that 'real' is a social construct."
        />
        <div className="grid gap-[22px] mt-10 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
          {TESTIMONIALS.map((t, i) => (
            <div
              key={i}
              className={`bru ${CARD_BG[i % 3]} p-6`}
              style={{ transform: `rotate(${i % 2 === 0 ? -0.8 : 0.8}deg)` }}
            >
              <div
                aria-label={`${t.stars} out of 5 stars`}
                className="font-display text-sm mb-2.5"
              >
                {"★".repeat(t.stars)}
                {"☆".repeat(5 - t.stars)}
              </div>
              <p className="font-display text-xl leading-[1.3] mt-0 mb-5 font-medium">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="font-mono text-[13px]">
                <div className="font-bold">{t.who}</div>
                <div className="opacity-70">{t.role}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
