import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/auth";
import { getOpenGaps } from "@/lib/db/similarity_gaps";
import { getReportsByIds } from "@/lib/db/reports";
import { getAllCapabilities } from "@/lib/db/capabilities";
import { getAllSimilarityCandidates } from "@/lib/db/projections";
import {
  GapTriage,
  DetectButton,
  type GapTriageRow,
  type CapabilityCatalogEntry,
} from "./GapTriage";

export const dynamic = "force-dynamic";

/**
 * Similarity gap triage queue. Server-rendered list, client component
 * handles per-row actions. Sorted by text-similarity desc — the highest-
 * confidence gaps surface first.
 *
 * The detector itself is run on-demand via the "detect new gaps" button
 * (POST /api/admin/similarity-gaps/detect). This page just lists what's
 * already in the queue.
 */
export default async function SimilarityGapsPage() {
  if (!(await isAdmin())) redirect("/admin/login?next=/admin/similarity-gaps");

  const gaps = await getOpenGaps();
  if (gaps.length === 0) {
    const capabilitiesEmpty = await getAllCapabilities();
    return <EmptyState catalogSize={capabilitiesEmpty.length} />;
  }

  const reportIds = Array.from(
    new Set(gaps.flatMap((g) => [g.report_a_id, g.report_b_id])),
  );
  const [reports, capabilities, candidates] = await Promise.all([
    getReportsByIds(reportIds),
    getAllCapabilities(),
    getAllSimilarityCandidates(),
  ]);

  const reportById = new Map(reports.map((r) => [r.id, r]));

  const rows: GapTriageRow[] = gaps
    .map((g) => {
      const a = reportById.get(g.report_a_id);
      const b = reportById.get(g.report_b_id);
      if (!a || !b) return null;
      const candA = candidates.get(a.id);
      const candB = candidates.get(b.id);
      return {
        id: g.id,
        text_similarity: g.text_similarity,
        engine_score: g.engine_score,
        llm_action: g.llm_action,
        llm_payload: g.llm_payload,
        llm_note: g.llm_note,
        llm_suggested_at: g.llm_suggested_at,
        a: {
          id: a.id,
          slug: a.slug,
          name: a.name,
          tagline: a.tagline,
          tier: a.tier,
          score: a.wedge_score,
          capability_slugs: candA ? Array.from(candA.capabilities).sort() : [],
        },
        b: {
          id: b.id,
          slug: b.slug,
          name: b.name,
          tagline: b.tagline,
          tier: b.tier,
          score: b.wedge_score,
          capability_slugs: candB ? Array.from(candB.capabilities).sort() : [],
        },
      };
    })
    .filter((r): r is GapTriageRow => r !== null);

  const catalog: CapabilityCatalogEntry[] = capabilities.map((c) => ({
    slug: c.slug,
    display_name: c.display_name,
    category: c.category,
    is_descriptor: c.is_descriptor,
  }));

  return (
    <div className="max-w-5xl mx-auto">
      <header className="mb-6 flex items-baseline justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display font-bold text-[28px] tracking-[-0.02em] lowercase mb-1">
            similarity gaps.
          </h1>
          <p className="font-mono text-[12px] tracking-[0.05em] opacity-65">
            {rows.length} open · text-similarity ≥ 0.20 · engine-score ≤ 0.10
          </p>
        </div>
        <div className="flex items-center gap-3">
          <DetectButton />
          <a
            href="/admin"
            className="font-mono text-[11px] tracking-[0.1em] uppercase opacity-60 hover:opacity-100"
          >
            ← all surfaces
          </a>
        </div>
      </header>

      <GapTriage rows={rows} catalog={catalog} />
    </div>
  );
}

function EmptyState({ catalogSize }: { catalogSize: number }) {
  return (
    <div className="max-w-2xl mx-auto">
      <header className="mb-6">
        <h1 className="font-display font-bold text-[28px] tracking-[-0.02em] lowercase mb-1">
          similarity gaps.
        </h1>
        <p className="font-mono text-[12px] tracking-[0.05em] opacity-65">
          queue empty · catalog has {catalogSize} capabilities
        </p>
      </header>
      <div className="bru border-[2.5px] bg-paper px-5 py-5">
        <p className="font-display text-[14px] leading-[1.5] mb-4">
          No open gaps. Either every detected gap has been applied/dismissed,
          or detection hasn&apos;t been run on the current corpus. Click below
          to scan for pairs that should be similar but aren&apos;t.
        </p>
        <DetectButton />
      </div>
    </div>
  );
}
