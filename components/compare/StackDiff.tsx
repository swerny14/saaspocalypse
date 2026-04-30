import type { ComponentBucket } from "@/lib/normalization/compare";
import { STACK_COMPONENTS } from "@/lib/normalization/taxonomy";
import { CompareCard, CardHead, TriptychCol, Tag } from "./primitives";

const COMP_LOOKUP = new Map(STACK_COMPONENTS.map((c) => [c.slug, c]));

function compLabel(slug: string): string {
  return COMP_LOOKUP.get(slug)?.display_name ?? slug.replace(/-/g, " ");
}

type Props = {
  /** Full stack diff including commoditized infra. We deliberately render all
   *  of it — earlier versions hid `commoditization_level >= 4` behind a
   *  toggle, but the shared shelf (Postgres / Stripe / Vercel) is still useful
   *  ground-truth context, especially when paired against a side that picked
   *  something exotic. The diff utility still exposes a filtered version
   *  (`stack_diff`) for any future surface that wants the curated subset. */
  diffAll: ComponentBucket;
  aName: string;
  bName: string;
};

export function StackDiff({ diffAll, aName, bName }: Props) {
  const empty =
    diffAll.shared.length === 0 &&
    diffAll.a_only.length === 0 &&
    diffAll.b_only.length === 0;

  return (
    <CompareCard>
      <CardHead title="what they're built on." badge="stack">
        <span className="text-muted font-medium tracking-[0.05em] normal-case font-mono text-[11px]">
          shared infra and the differentiating bits.
        </span>
      </CardHead>

      {empty ? (
        <p className="font-mono text-[12px] opacity-60 px-6 py-6 m-0">
          No stack components detected on either side.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3">
          <Column
            title={`only ${aName}`}
            count={diffAll.a_only.length}
            variant="a"
            slugs={diffAll.a_only}
            firstSolid="solid-coral"
            emptyLine={`${aName} ships nothing exotic the other doesn't.`}
          />
          <Column
            title="shared infra"
            count={diffAll.shared.length}
            variant="shared"
            slugs={diffAll.shared}
            firstSolid="solid-lime"
            emptyLine="no shared dependencies."
          />
          <Column
            title={`only ${bName}`}
            count={diffAll.b_only.length}
            variant="b"
            slugs={diffAll.b_only}
            firstSolid="solid-purple"
            emptyLine={`${bName} ships nothing exotic the other doesn't.`}
          />
        </div>
      )}
    </CompareCard>
  );
}

function Column({
  title,
  count,
  variant,
  slugs,
  firstSolid,
  emptyLine,
}: {
  title: string;
  count: number;
  variant: "a" | "b" | "shared";
  slugs: string[];
  firstSolid: "solid-coral" | "solid-lime" | "solid-purple";
  emptyLine: string;
}) {
  return (
    <TriptychCol title={title} count={count} variant={variant} emptyLine={emptyLine}>
      {slugs.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {slugs.map((s, i) => (
            <Tag key={s} variant={i === 0 ? firstSolid : "outline"}>
              {compLabel(s)}
            </Tag>
          ))}
        </div>
      )}
    </TriptychCol>
  );
}
