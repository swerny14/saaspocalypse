import { VerdictReportSchema, type VerdictReport } from "@/lib/scanner/schema";
import type { DetectedStack } from "@/lib/scanner/fingerprint";
import { getSupabaseAnon, getSupabaseAdmin } from "./supabase";
import { wrapDbError } from "./errors";
import { toSlug } from "@/lib/domain";
import { logError } from "@/lib/error_log";

/** DB row: VerdictReport plus server-generated metadata. */
export type StoredReport = VerdictReport & {
  id: string;
  domain: string;
  slug: string;
  view_count: number;
  /** Fingerprint output. Null on rows scanned before fingerprinting shipped, or
   * when detection soft-failed during the scan. */
  detected_stack: DetectedStack | null;
  scanned_at: string;
  created_at: string;
  updated_at: string;
};

/**
 * SELECT * projection. Column names are already snake_case both in the DB
 * and in our Zod schema, so no key transformation is needed.
 */
const REPORT_COLUMNS = "*";

/**
 * Defensive parse for rows we just read from the DB. Verifies the
 * cross-field invariants (tier-score bucket alignment, challenges sorted by
 * difficulty) and the structural shape, but tolerates string-length overages
 * for parity with the LLM call sites — callers there already accept a
 * verdict whose strings exceed the schema caps as long as the shape is
 * valid. Returns the row on success, null on structural failure (logged).
 */
const DB_ONLY_FIELDS = new Set([
  "id",
  "domain",
  "slug",
  "view_count",
  "detected_stack",
  "scanned_at",
  "created_at",
  "updated_at",
]);

function safeReadReport(data: unknown, ctx: string): StoredReport | null {
  if (!data || typeof data !== "object") return null;
  const row = data as Record<string, unknown> & { slug?: string };
  // Strip the DB-only metadata before parsing so the verdict schema matches.
  const verdict: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) {
    if (!DB_ONLY_FIELDS.has(k)) verdict[k] = v;
  }
  const parsed = VerdictReportSchema.safeParse(verdict);
  if (parsed.success) return row as unknown as StoredReport;
  // Tolerate string-length overages — they're guidance for the LLM, not
  // gatekeeping for stored data. Reject anything else.
  const onlyOverages =
    parsed.error.issues.length > 0 &&
    parsed.error.issues.every(
      (i) => i.code === "too_big" && "origin" in i && i.origin === "string",
    );
  if (onlyOverages) return row as unknown as StoredReport;
  void logError({
    scope: "scan",
    reason: "stored_report_invalid",
    refSlug: typeof row.slug === "string" ? row.slug : null,
    message: `${ctx}: stored verdict failed defensive Zod parse`,
    detail: {
      issues: parsed.error.issues.map(
        (i) => `${i.path.join(".") || "(root)"}: ${i.message}`,
      ),
    },
  });
  return null;
}

export async function getReportByDomain(domain: string): Promise<StoredReport | null> {
  const sb = getSupabaseAnon();
  if (!sb) return null;
  const { data, error } = await sb
    .from("reports")
    .select(REPORT_COLUMNS)
    .eq("domain", domain)
    .maybeSingle();
  if (error) {
    console.error("[reports] getReportByDomain failed", error);
    return null;
  }
  if (!data) return null;
  return safeReadReport(data, `getReportByDomain(${domain})`);
}

export async function getReportBySlug(slug: string): Promise<StoredReport | null> {
  const sb = getSupabaseAnon();
  if (!sb) return null;
  const { data, error } = await sb
    .from("reports")
    .select(REPORT_COLUMNS)
    .eq("slug", slug)
    .maybeSingle();
  if (error) {
    console.error("[reports] getReportBySlug failed", error);
    return null;
  }
  if (!data) return null;
  return safeReadReport(data, `getReportBySlug(${slug})`);
}

export async function getRecentReports(limit = 6): Promise<StoredReport[]> {
  const sb = getSupabaseAnon();
  if (!sb) return [];
  const { data, error } = await sb
    .from("reports")
    .select(REPORT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[reports] getRecentReports failed", error);
    return [];
  }
  return (data as StoredReport[]) ?? [];
}

export async function getAllReports(limit = 5000): Promise<StoredReport[]> {
  const sb = getSupabaseAnon();
  if (!sb) return [];
  const { data, error } = await sb
    .from("reports")
    .select(REPORT_COLUMNS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[reports] getAllReports failed", error);
    return [];
  }
  return (data as StoredReport[]) ?? [];
}

/**
 * Sitemap-only projection. Pulls just the columns Next's MetadataRoute.Sitemap
 * needs — avoids reading every report's full JSON body (challenges, est_cost,
 * stack, etc.) just to generate URL entries. Use this for any sitemap or
 * canonical-URL enumeration; reach for `getAllReports` only when card content
 * is genuinely required.
 */
export type ReportSitemapEntry = { slug: string; updated_at: string };

export async function getAllReportsForSitemap(
  limit = 50_000,
): Promise<ReportSitemapEntry[]> {
  const sb = getSupabaseAnon();
  if (!sb) return [];
  const { data, error } = await sb
    .from("reports")
    .select("slug,updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[reports] getAllReportsForSitemap failed", error);
    return [];
  }
  return (data as ReportSitemapEntry[]) ?? [];
}

export async function incrementReportViewCount(slug: string): Promise<void> {
  const admin = getSupabaseAdmin();
  const { error } = await admin.rpc("increment_report_view_count", { p_slug: slug });
  if (error) throw wrapDbError(error, "reports incrementViewCount");
}

/**
 * Upsert a new report. Admin-only — never call from client code.
 * The `domain` unique constraint means a second insert for the same domain
 * will collide; we intentionally let that throw so the caller can surface
 * the "already exists" case.
 */
export async function insertReport(
  domain: string,
  verdict: VerdictReport,
  detectedStack: DetectedStack | null,
): Promise<StoredReport> {
  const admin = getSupabaseAdmin();
  const row = {
    domain,
    slug: toSlug(domain),
    detected_stack: detectedStack,
    ...verdict,
  };
  const { data, error } = await admin
    .from("reports")
    .insert(row)
    .select(REPORT_COLUMNS)
    .single();
  if (error) throw wrapDbError(error, "reports insert");
  return data as StoredReport;
}

/** Upsert variant that overwrites on domain conflict — used by the seed script. */
export async function upsertReport(
  domain: string,
  verdict: VerdictReport,
  detectedStack: DetectedStack | null = null,
): Promise<StoredReport> {
  const admin = getSupabaseAdmin();
  const row = {
    domain,
    slug: toSlug(domain),
    detected_stack: detectedStack,
    ...verdict,
  };
  const { data, error } = await admin
    .from("reports")
    .upsert(row, { onConflict: "domain" })
    .select(REPORT_COLUMNS)
    .single();
  if (error) throw wrapDbError(error, "reports upsert");
  return data as StoredReport;
}
