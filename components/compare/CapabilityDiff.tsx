import type { CapabilityBucket } from "@/lib/normalization/compare";
import { CAPABILITIES } from "@/lib/normalization/taxonomy";
import { CompareCard, CardHead, TriptychCol, Tag } from "./primitives";

const CAP_LOOKUP = new Map(CAPABILITIES.map((c) => [c.slug, c]));

function capLabel(slug: string): string {
  return CAP_LOOKUP.get(slug)?.display_name.toLowerCase() ?? slug.replace(/-/g, " ");
}

type Props = {
  diff: CapabilityBucket;
  aName: string;
  bName: string;
};

export function CapabilityDiff({ diff, aName, bName }: Props) {
  const empty =
    diff.shared.length === 0 && diff.a_only.length === 0 && diff.b_only.length === 0;
  const sharedCount = diff.shared.length;
  const aCount = diff.a_only.length;
  const bCount = diff.b_only.length;

  return (
    <CompareCard>
      <CardHead title="where they fight, where they don't." badge="overlap">
        <span className="text-muted font-medium tracking-[0.05em] normal-case font-mono text-[11px]">
          features only one ships, plus the small middle they share.
        </span>
      </CardHead>

      {empty ? (
        <p className="font-mono text-[12px] opacity-60 px-6 py-6 m-0">
          Neither product has a capability projection yet.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3">
          <Column
            title={`only ${aName}`}
            count={aCount}
            variant="a"
            slugs={diff.a_only}
            emptyLine={`${aName} is a strict subset of the shared surface.`}
          />
          <Column
            title="shared"
            count={sharedCount}
            variant="shared"
            slugs={diff.shared}
            emptyLine="zero capability overlap."
          />
          <Column
            title={`only ${bName}`}
            count={bCount}
            variant="b"
            slugs={diff.b_only}
            emptyLine={`${bName} is a strict subset of the shared surface.`}
          />
        </div>
      )}
    </CompareCard>
  );
}

/**
 * Tag rendering: uniform outline across every column. No per-column hue
 * and no descriptor distinction — earlier versions tinted descriptors
 * lime, but two similar products usually share their categorical
 * descriptor, which made the shared column read as a green-highlighted
 * block. Descriptor taxonomy is a report-level concern; the compare
 * page is about overlap and divergence, not categorization.
 */
function Column({
  title,
  count,
  variant,
  slugs,
  emptyLine,
}: {
  title: string;
  count: number;
  variant: "a" | "b" | "shared";
  slugs: string[];
  emptyLine: string;
}) {
  return (
    <TriptychCol title={title} count={count} variant={variant} emptyLine={emptyLine}>
      {slugs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {slugs.map((s) => (
            <Tag key={s} variant="outline" side={variant}>
              {capLabel(s)}
            </Tag>
          ))}
        </div>
      )}
    </TriptychCol>
  );
}
