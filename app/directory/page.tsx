import type { Metadata } from "next";
import { getAllReports, type StoredReport } from "@/lib/db/reports";
import {
  TIER_STYLES,
  DIRECTORY_TIERS,
  type DirectoryTier,
} from "@/components/directory/tiers";
import { FilterGroup } from "@/components/directory/FilterGroup";
import { FilterRow } from "@/components/directory/FilterRow";
import { DirectoryCard } from "@/components/directory/DirectoryCard";
import { PageBtn } from "@/components/directory/PageBtn";
import { DirectorySearch } from "@/components/directory/DirectorySearch";
import { ScoreRangeFilter } from "@/components/directory/ScoreRangeFilter";
import { SITE_URL } from "@/lib/seo/meta";

export const revalidate = 3600;

const PAGE_SIZE = 12;

type Sort =
  | "newest"
  | "oldest"
  | "score-desc"
  | "score-asc"
  | "quickest"
  | "popular";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "newest", label: "newest" },
  { value: "oldest", label: "oldest" },
  { value: "score-desc", label: "score ↓" },
  { value: "score-asc", label: "score ↑" },
  { value: "quickest", label: "quickest" },
  { value: "popular", label: "most popular" },
];

type Search = {
  tier?: string;
  q?: string;
  sort?: string;
  scoreMin?: string;
  scoreMax?: string;
  page?: string;
};

function parseSort(s: string | undefined): Sort {
  if (s && SORT_OPTIONS.some((o) => o.value === s)) return s as Sort;
  return "newest";
}

function parseScore(s: string | undefined, fallback: number): number {
  const n = Number(s);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

/** Best-effort parse of a free-form `time_estimate` ("2 weeks") into hours. */
function timeEstimateToHours(s: string): number {
  const lower = s.toLowerCase();
  const m = lower.match(/(\d+(?:\.\d+)?)\s*(hour|hr|h|day|d|week|wk|w|month|mo|m|year|yr|y)\b/);
  if (!m) return Number.POSITIVE_INFINITY;
  const n = Number(m[1]);
  const unit = m[2];
  if (unit.startsWith("h")) return n;
  if (unit.startsWith("d")) return n * 24;
  if (unit.startsWith("w")) return n * 24 * 7;
  if (unit.startsWith("mo") || unit === "m") return n * 24 * 30;
  if (unit.startsWith("y")) return n * 24 * 365;
  return Number.POSITIVE_INFINITY;
}

function applyFilters(
  reports: StoredReport[],
  filters: { tier: DirectoryTier | null; q: string; min: number; max: number },
): StoredReport[] {
  const q = filters.q.trim().toLowerCase();
  return reports.filter((r) => {
    if (filters.tier && r.tier !== filters.tier) return false;
    if (r.score < filters.min || r.score > filters.max) return false;
    if (q) {
      const haystack = `${r.name} ${r.tagline} ${r.domain}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}

function applySort(reports: StoredReport[], sort: Sort): StoredReport[] {
  const arr = [...reports];
  switch (sort) {
    case "oldest":
      return arr.sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    case "score-desc":
      return arr.sort((a, b) => b.score - a.score);
    case "score-asc":
      return arr.sort((a, b) => a.score - b.score);
    case "quickest":
      return arr.sort(
        (a, b) =>
          timeEstimateToHours(a.time_estimate) -
          timeEstimateToHours(b.time_estimate),
      );
    case "popular":
      return arr.sort((a, b) => b.view_count - a.view_count);
    case "newest":
    default:
      return arr.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }
}

function buildHref(
  base: URLSearchParams,
  patch: Record<string, string | null>,
): string {
  const params = new URLSearchParams(base.toString());
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === "") params.delete(k);
    else params.set(k, v);
  }
  // Always reset page when changing other filters.
  if (!("page" in patch)) params.delete("page");
  const q = params.toString();
  return q ? `/directory?${q}` : "/directory";
}

type Params = Promise<Search>;

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Params;
}): Promise<Metadata> {
  const { tier } = await searchParams;
  const tierSuffix =
    tier && DIRECTORY_TIERS.includes(tier as DirectoryTier)
      ? ` — ${tier} tier`
      : "";

  const title = `Build any SaaS yourself — buildability rankings${tierSuffix} · saaspocalypse`;
  const description =
    "Every SaaS we've scanned, sortable by buildability. Find one before you accidentally spend $144/year on a CRUD app.";

  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}/directory` },
    openGraph: { title, description, url: `${SITE_URL}/directory`, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function DirectoryPage({
  searchParams,
}: {
  searchParams: Params;
}) {
  const sp = await searchParams;
  const all = await getAllReports();

  const tier =
    sp.tier && DIRECTORY_TIERS.includes(sp.tier as DirectoryTier)
      ? (sp.tier as DirectoryTier)
      : null;
  const q = sp.q ?? "";
  const sort = parseSort(sp.sort);
  const min = parseScore(sp.scoreMin, 0);
  const max = parseScore(sp.scoreMax, 100);
  const page = Math.max(1, Number(sp.page) || 1);

  const tierCounts: Record<DirectoryTier, number> = {
    WEEKEND: 0,
    MONTH: 0,
    "DON'T": 0,
  };
  for (const r of all) {
    if (r.tier in tierCounts) tierCounts[r.tier as DirectoryTier] += 1;
  }

  const filtered = applyFilters(all, { tier, q, min, max });
  const sorted = applySort(filtered, sort);
  const total = sorted.length;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const safePage = Math.min(page, pages);
  const startIdx = (safePage - 1) * PAGE_SIZE;
  const pageItems = sorted.slice(startIdx, startIdx + PAGE_SIZE);

  // Build a base URLSearchParams for href construction.
  const baseParams = new URLSearchParams();
  if (tier) baseParams.set("tier", tier);
  if (q) baseParams.set("q", q);
  if (sort !== "newest") baseParams.set("sort", sort);
  if (min !== 0) baseParams.set("scoreMin", String(min));
  if (max !== 100) baseParams.set("scoreMax", String(max));

  const activeFilterCount =
    (tier ? 1 : 0) + (q ? 1 : 0) + (min !== 0 || max !== 100 ? 1 : 0);

  return (
    <main className="bg-bg min-h-screen">
      <div className="container py-9">
        {/* Masthead */}
        <div className="border-b-[2.5px] border-ink pb-6 mb-7">
          <div className="font-mono text-[11px] font-bold tracking-[0.2em] uppercase opacity-60 mb-2.5">
            ▸ the archive · {all.length} scans on file · updated daily
          </div>
          <div className="flex justify-between items-end gap-8 flex-wrap">
            <h1 className="font-display font-bold text-[clamp(56px,8vw,88px)] leading-[0.92] tracking-[-0.045em] m-0">
              Every SaaS we{" "}
              <span className="bg-ink text-accent px-3.5 inline-block rotate-[-1.5deg]">
                scrutinized
              </span>
              ,
              <br />
              now sortable.
            </h1>
            <p className="font-display text-base leading-[1.5] opacity-75 max-w-[360px] m-0">
              Every scan we&apos;ve run, filed by buildability. Find one before
              you accidentally spend $144/year on a CRUD app.
            </p>
          </div>
        </div>

        <DirectorySearch
          initialQuery={q}
          initialSort={sort}
          sortOptions={SORT_OPTIONS}
        />

        {/* Body grid */}
        <div className="grid grid-cols-[240px_1fr] gap-7 items-start max-[900px]:grid-cols-1">
          {/* Sidebar */}
          <aside className="sticky top-5 max-[900px]:static">
            <FilterGroup title="by verdict">
              <div className="flex flex-col gap-2">
                <FilterRow
                  href={buildHref(baseParams, { tier: null })}
                  label="all"
                  count={all.length}
                  active={!tier}
                />
                {DIRECTORY_TIERS.map((t) => {
                  const count = tierCounts[t];
                  const disabled = count === 0;
                  return (
                    <FilterRow
                      key={t}
                      href={buildHref(baseParams, { tier: t })}
                      label={t.toLowerCase()}
                      count={count}
                      active={tier === t}
                      disabled={disabled}
                      swatch={TIER_STYLES[t].bg}
                    />
                  );
                })}
              </div>
            </FilterGroup>

            <FilterGroup title="score range" last>
              <ScoreRangeFilter initialMin={min} initialMax={max} />
            </FilterGroup>

            {activeFilterCount > 0 && (
              <a
                href="/directory"
                className="block w-full mt-[18px] font-mono text-[11px] font-bold tracking-[0.15em] uppercase py-2.5 border-2 border-ink bg-paper text-center no-underline text-ink hover:bg-bg"
              >
                ↻ reset filters
              </a>
            )}
          </aside>

          {/* Results column */}
          <div>
            <div className="flex justify-between items-center mb-[18px] font-mono text-[11px] font-bold tracking-[0.1em] uppercase">
              <span className="opacity-70">
                showing {pageItems.length} of {total}
                {activeFilterCount > 0 && (
                  <>
                    {" "}
                    · {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}{" "}
                    active
                  </>
                )}
              </span>
            </div>

            {pageItems.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-2 gap-4 max-[640px]:grid-cols-1">
                {pageItems.map((r, i) => (
                  <DirectoryCard
                    key={r.id}
                    report={r}
                    scanIndex={startIdx + i + 1}
                  />
                ))}
              </div>
            )}

            {pages > 1 && (
              <div className="flex justify-center gap-1.5 mt-9 font-mono text-xs font-bold">
                <PageBtn
                  href={
                    safePage > 1
                      ? buildHref(baseParams, { page: String(safePage - 1) })
                      : undefined
                  }
                  disabled={safePage === 1}
                >
                  ← prev
                </PageBtn>
                {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                  <PageBtn
                    key={n}
                    href={buildHref(baseParams, { page: n === 1 ? null : String(n) })}
                    active={n === safePage}
                  >
                    {n}
                  </PageBtn>
                ))}
                <PageBtn
                  href={
                    safePage < pages
                      ? buildHref(baseParams, { page: String(safePage + 1) })
                      : undefined
                  }
                  disabled={safePage === pages}
                >
                  next →
                </PageBtn>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="border-[2.5px] border-ink bg-paper p-10 text-center">
      <h2 className="font-display font-bold text-[28px] m-0 tracking-[-0.02em]">
        No scans match. Weird flex.
      </h2>
      <p className="font-display text-[15px] opacity-70 mt-2 mb-5">
        Loosen a filter or try a different search.
      </p>
      <a
        href="/directory"
        className="inline-block font-display font-bold text-sm bg-ink text-accent px-[18px] py-2.5 no-underline"
      >
        ↻ clear filters
      </a>
    </div>
  );
}
