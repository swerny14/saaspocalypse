import { getSimilarReports } from "@/lib/db/neighbors";
import { SimilarProductsRail } from "./SimilarProducts/SimilarProductsRail";

type Props = {
  /** Source report id - we exclude it from the candidate pool. */
  sourceId: string;
  /** Source slug - forwarded to each card so it can link to the canonical
   *  `/compare/<a>-vs-<b>` URL (alphabetical ordering enforced in the card). */
  sourceSlug: string;
};

const MIN_CARDS_TO_SHOW = 1;
const MAX_CARDS = 6;

/**
 * Similar scans rail. Server component, rendered into the static HTML of
 * `/r/[slug]` so cards are crawlable and contribute to internal linking.
 *
 * Hides itself when zero candidates clear the similarity threshold. We never
 * pad the rail with random reports - the brand promise is signal, not volume.
 */
export async function SimilarProducts({ sourceId, sourceSlug }: Props) {
  const similar = await getSimilarReports(sourceId, MAX_CARDS);
  if (similar.length < MIN_CARDS_TO_SHOW) return null;

  return <SimilarProductsRail sourceSlug={sourceSlug} similar={similar} />;
}
