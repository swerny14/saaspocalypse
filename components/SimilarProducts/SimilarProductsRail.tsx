import type { SimilarReport } from "@/lib/db/neighbors";
import { SimilarCard } from "./SimilarCard";

type Props = {
  sourceSlug: string;
  similar: SimilarReport[];
};

export function SimilarProductsRail({ sourceSlug, similar }: Props) {
  if (similar.length === 0) return null;

  return (
    <section className="px-5 sm:px-11 py-6 sm:py-8 border-b-[2.5px] border-ink">
      <div className="mb-5 flex items-baseline justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="bg-ink text-accent px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-[0.15em] select-none leading-none">
            compare
          </span>
          <h3 className="font-display text-[22px] sm:text-[26px] font-bold m-0 tracking-[-0.02em]">
            similar scans.
          </h3>
        </div>
        <div className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-60">
          same shape - different moat
        </div>
      </div>
      <div
        className={`grid gap-4 ${
          similar.length === 1
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 [&>*]:max-w-[420px]"
            : similar.length === 2
              ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 [&>*]:max-w-[420px]"
              : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
        }`}
      >
        {similar.map((s) => (
          <SimilarCard
            key={s.report.id}
            sourceSlug={sourceSlug}
            report={s.report}
            shared_capabilities={s.shared_capabilities}
            score_delta={s.score_delta}
            wedge_capability_slugs={s.wedge_capability_slugs}
          />
        ))}
      </div>
    </section>
  );
}
