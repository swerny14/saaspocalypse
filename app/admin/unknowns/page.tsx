import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin/auth";
import {
  getOpenUnknowns,
  listAllStackComponentSlugs,
} from "@/lib/db/normalization_unknowns";
import { Triage, type CanonicalComponent, type TriageRow } from "./Triage";
import { SuggestAllButton } from "./SuggestAllButton";

export const dynamic = "force-dynamic";

/**
 * Unknowns triage queue. Server-rendered list, client component handles
 * per-row actions. Sorted by occurrences desc — high-noise terms surface
 * first because they're either the most worth aliasing or the most worth
 * ignoring (e.g. recurring DON'T-tier jokes).
 */
export default async function UnknownsAdminPage() {
  if (!(await isAdmin())) redirect("/admin/login?next=/admin/unknowns");

  const [rows, components] = await Promise.all([
    getOpenUnknowns(),
    listAllStackComponentSlugs(),
  ]);

  const canonical: CanonicalComponent[] = components.map((c) => ({
    slug: c.slug,
    display_name: c.display_name,
    category: c.category,
  }));

  const triageRows: TriageRow[] = rows.map((r) => ({
    id: r.id,
    raw_term: r.raw_term,
    normalized_term: r.normalized_term,
    occurrences: r.occurrences,
    last_seen_at: r.last_seen_at,
    report_id: r.report_id,
    llm_action: r.llm_action,
    llm_target_slug: r.llm_target_slug,
    llm_category: r.llm_category,
    llm_commoditization: r.llm_commoditization,
    llm_note: r.llm_note,
  }));

  const unsuggested = rows.filter((r) => r.llm_action === null).length;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="mb-6">
        <h1 className="font-display text-2xl text-ink">Unknowns review</h1>
        <p className="mt-1 text-sm text-muted">
          Terms found in scanned reports that don&apos;t map to any canonical component.
          Resolve each as an alias on an existing component, promote it to a new
          component, or ignore it (jokes, descriptors, one-offs).
        </p>
        <p className="mt-2 text-xs text-muted">
          {rows.length} open · {unsuggested} without an LLM suggestion · After triaging, run{" "}
          <code className="rounded bg-paper-alt px-1 py-0.5">
            pnpm tsx scripts/dump_taxonomy.ts
          </code>{" "}
          to regenerate the TS source and commit the diff.
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="bru bg-paper-alt p-6 text-center text-sm text-muted">
          Queue is empty. Nice.
        </div>
      ) : (
        <>
          <div className="mb-4">
            <SuggestAllButton unsuggestedCount={unsuggested} totalCount={rows.length} />
          </div>
          <Triage rows={triageRows} canonical={canonical} />
        </>
      )}
    </div>
  );
}
