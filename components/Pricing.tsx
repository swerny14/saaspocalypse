import { PRICING_BULLETS } from "@/lib/content";

export function Pricing() {
  return (
    <section className="py-20 bg-accent border-y-[2.5px] border-ink">
      <div className="container">
        <div className="max-w-[720px] mx-auto text-center">
          <div className="font-mono text-[13px] font-bold tracking-[0.15em] uppercase">
            Pricing
          </div>
          <h2 className="font-display font-bold mt-4 mb-2 text-[clamp(48px,7vw,96px)] tracking-[-0.03em] leading-none">
            $0<span className="text-[0.5em] opacity-60">.00</span>
          </h2>
          <div className="font-mono text-lg mb-8">
            forever · per URL · per lifetime · per regret
          </div>
          <div className="bru bg-bg p-8 text-left">
            <ul className="list-none p-0 m-0 grid gap-2.5 font-mono text-base">
              {PRICING_BULLETS.map((l, i) => (
                <li key={i} className="flex gap-3 items-start">
                  <span
                    aria-hidden
                    className="bg-ink text-accent w-5 h-5 grid place-items-center text-[13px] font-bold shrink-0 mt-0.5"
                  >
                    ✓
                  </span>
                  <span>{l}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="mt-6 font-mono text-[13px] opacity-75">
            if we ever charge, you have our permission to clone us. seriously.
          </div>
        </div>
      </div>
    </section>
  );
}
