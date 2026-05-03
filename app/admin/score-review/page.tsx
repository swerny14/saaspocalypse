import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/auth";
import { getAllReports } from "@/lib/db/reports";
import { RecomputeAllButton } from "./RecomputeAllButton";
import { ScoreTableActions } from "./ScoreTableActions";

export const dynamic = "force-dynamic";

const AXES = [
  "capital",
  "technical",
  "network",
  "switching",
  "data_moat",
  "regulatory",
  "distribution",
] as const;

type Filter = "all" | "pending" | "verified" | "weak" | "strong" | "unscored";

const FILTERS: { value: Filter; label: string; blurb: string }[] = [
  { value: "all", label: "all", blurb: "every report" },
  { value: "pending", label: "pending", blurb: "scores awaiting review" },
  { value: "verified", label: "verified", blurb: "curator-confirmed scores" },
  { value: "weak", label: "weak walls", blurb: "aggregate < 4" },
  { value: "strong", label: "thick walls", blurb: "aggregate >= 7" },
  { value: "unscored", label: "unscored", blurb: "no moat row yet" },
];

type Search = Promise<{ filter?: string; q?: string; axis?: string }>;

export default async function ScoreReviewPage({
  searchParams,
}: {
  searchParams: Search;
}) {
  if (!(await isAdmin())) redirect("/admin/login?next=/admin/score-review");

  const sp = await searchParams;
  const filter: Filter =
    FILTERS.find((f) => f.value === sp.filter)?.value ?? "all";
  const q = (sp.q ?? "").trim().toLowerCase();
  const axis = AXES.includes(sp.axis as (typeof AXES)[number])
    ? (sp.axis as (typeof AXES)[number])
    : null;

  const reports = await getAllReports(10_000);
  const filtered = reports.filter((r) => {
    if (q) {
      const hay = `${r.slug} ${r.name} ${r.tagline}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filter === "unscored") return !r.moat;
    if (!r.moat) return filter === "all";
    if (filter === "pending") return r.moat.review_status === "pending";
    if (filter === "verified") return r.moat.review_status === "verified";
    if (filter === "weak") return r.moat.aggregate < 4;
    if (filter === "strong") return r.moat.aggregate >= 7;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (axis) {
      const av = a.moat ? (a.moat[axis] as number | null) ?? -1 : -2;
      const bv = b.moat ? (b.moat[axis] as number | null) ?? -1 : -2;
      return av - bv;
    }
    const aa = a.moat?.aggregate ?? -1;
    const bb = b.moat?.aggregate ?? -1;
    return aa - bb;
  });

  const total = reports.length;
  const scored = reports.filter((r) => r.moat).length;

  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-ink lowercase">
          score review.
        </h1>
        <p className="mt-1 text-sm text-muted">
          Review the public moat score, LLM evidence, distribution signal, and
          verification state. Capability taxonomy lives in unknowns and
          similarity gaps. {scored}/{total} scored.
        </p>
        <div className="mt-4">
          <RecomputeAllButton />
        </div>
      </div>

      <details className="mb-5 bru bg-paper px-4 py-2.5 font-mono text-[11px]">
        <summary className="cursor-pointer font-bold tracking-[0.05em]">
          current scoring model
        </summary>
        <div className="mt-3 space-y-2 opacity-80">
          <p>
            Capital, technical, network, switching, data, and regulatory are
            scored by the LLM moat judge. Distribution is deterministic from
            Serper. The server computes aggregate, wedge score, tier, and
            weakest axis.
          </p>
          <p>
            Normalized capabilities and descriptors power compare and
            similarity; they no longer drive the public score.
          </p>
        </div>
      </details>

      <div className="bru bg-paper px-4 py-3 mb-5 flex flex-wrap gap-2 items-center">
        {FILTERS.map((f) => (
          <Link
            key={f.value}
            href={`/admin/score-review?${new URLSearchParams({
              ...(f.value !== "all" ? { filter: f.value } : {}),
              ...(q ? { q } : {}),
              ...(axis ? { axis } : {}),
            }).toString()}`}
            className={`font-mono text-[11px] tracking-[0.1em] uppercase px-2.5 py-1 border-2 border-ink no-underline text-ink ${
              filter === f.value ? "bg-ink text-accent" : "bg-paper hover:bg-bg"
            }`}
            title={f.blurb}
          >
            {f.label}
          </Link>
        ))}
        <span className="font-mono text-[10px] tracking-[0.05em] uppercase opacity-50 ml-2">
          sort:
        </span>
        {AXES.map((a) => (
          <Link
            key={a}
            href={`/admin/score-review?${new URLSearchParams({
              ...(filter !== "all" ? { filter } : {}),
              ...(q ? { q } : {}),
              ...(axis === a ? {} : { axis: a }),
            }).toString()}`}
            className={`font-mono text-[10px] tracking-[0.1em] uppercase px-2 py-[3px] border border-ink no-underline text-ink ${
              axis === a ? "bg-coral text-paper" : "bg-paper hover:bg-bg"
            }`}
          >
            {a.replace("_", " ")}
          </Link>
        ))}
      </div>

      <div className="border-2 border-ink bg-paper">
        <div className="grid grid-cols-[minmax(210px,1fr)_60px_60px_54px_54px_54px_54px_54px_54px_54px_95px] gap-2 px-4 py-2 border-b-2 border-ink font-mono text-[10px] tracking-[0.1em] uppercase opacity-65 bg-bg">
          <span>slug / name</span>
          <span className="text-right">tier</span>
          <span className="text-right">wedge</span>
          <span className="text-right">cap</span>
          <span className="text-right">tech</span>
          <span className="text-right">net</span>
          <span className="text-right">swt</span>
          <span className="text-right">data</span>
          <span className="text-right">reg</span>
          <span className="text-right">dist</span>
          <span className="text-right">review</span>
        </div>
        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center font-mono text-xs opacity-60">
            no reports match this filter.
          </div>
        ) : (
          sorted.map((r) => (
            <div
              key={r.id}
              className="grid grid-cols-[minmax(210px,1fr)_60px_60px_54px_54px_54px_54px_54px_54px_54px_95px] gap-2 px-4 py-2 border-b border-ink/15 text-ink hover:bg-bg font-mono text-[12px] items-center"
            >
              <Link
                href={`/admin/score-review/${r.slug}`}
                className="truncate text-ink no-underline hover:underline"
              >
                <span className="font-bold">{r.slug}</span>
                <span className="opacity-60"> / {r.tagline}</span>
              </Link>
              <span className="text-right opacity-80">{r.tier}</span>
              <span className="text-right font-bold">{r.wedge_score}</span>
              <span className="text-right">{r.moat?.capital.toFixed(1) ?? "-"}</span>
              <span className="text-right">{r.moat?.technical.toFixed(1) ?? "-"}</span>
              <span className="text-right">{r.moat?.network.toFixed(1) ?? "-"}</span>
              <span className="text-right">{r.moat?.switching.toFixed(1) ?? "-"}</span>
              <span className="text-right">{r.moat?.data_moat.toFixed(1) ?? "-"}</span>
              <span className="text-right">{r.moat?.regulatory.toFixed(1) ?? "-"}</span>
              <span className="text-right">
                {r.moat?.distribution === null || !r.moat
                  ? "-"
                  : r.moat.distribution.toFixed(1)}
              </span>
              <ScoreTableActions
                slug={r.slug}
                reviewStatus={r.moat?.review_status ?? "pending"}
                hasMoat={!!r.moat}
              />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
