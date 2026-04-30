import { getSimilarReports } from "@/lib/db/neighbors";
import { SimilarCard } from "./SimilarProducts/SimilarCard";

type Props = {
  /** Source report id — we exclude it from the candidate pool. */
  sourceId: string;
  /** Source slug — forwarded to each card so it can link to the canonical
   *  `/compare/<a>-vs-<b>` URL (alphabetical ordering enforced in the card). */
  sourceSlug: string;
};

const MIN_CARDS_TO_SHOW = 1;
const MAX_CARDS = 6;

/**
 * "The field" rail — products in the same category as the source, framed as
 * comparisons. Server component, rendered into the static HTML of `/r/[slug]`
 * so cards are crawlable and contribute to internal linking.
 *
 * Hides itself when zero candidates clear the similarity threshold. We never
 * pad the rail with random reports — the brand promise is signal, not volume.
 *
 * Differentiator from generic "you might also like" rails: each card leads
 * with the SCORE DELTA + a WEDGE (capabilities the candidate has that the
 * source doesn't). That answers the question users actually have ("what
 * makes this alternative different from what I'm looking at?") rather than
 * the question they don't ("what looks vaguely similar?").
 */
export async function SimilarProducts({ sourceId, sourceSlug }: Props) {
  const similar = await getSimilarReports(sourceId, MAX_CARDS);
  if (similar.length < MIN_CARDS_TO_SHOW) return null;

  return (
    <section className="mt-10">
      <div className="mb-5 flex items-baseline justify-between gap-4 flex-wrap">
        <h2 className="font-display font-bold text-[28px] tracking-[-0.02em] lowercase">
          the field.
        </h2>
        <p className="font-mono text-[11px] tracking-[0.12em] uppercase opacity-60">
          same shape · different headache
        </p>
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
