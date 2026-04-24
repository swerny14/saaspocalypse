import { MARQUEE_ITEMS } from "@/lib/content";

export function Marquee() {
  return (
    <div className="border-y-[2.5px] border-ink bg-ink text-accent py-3.5 overflow-hidden font-display font-semibold text-[22px] tracking-[-0.01em]">
      <div className="marquee-track">
        {[0, 1].map((k) => (
          <span
            key={k}
            className="inline-flex gap-12 pr-12"
            aria-hidden={k === 1}
          >
            {MARQUEE_ITEMS.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-12">
                <span>✦</span>
                <span>{t}</span>
              </span>
            ))}
          </span>
        ))}
      </div>
    </div>
  );
}
