import type { VerdictReport } from "@/lib/scanner/schema";
import { getSupabaseAnon, getSupabaseAdmin } from "./supabase";
import { toSlug } from "@/lib/domain";

/** DB row: VerdictReport plus server-generated metadata. */
export type StoredReport = VerdictReport & {
  id: string;
  domain: string;
  slug: string;
  scanned_at: string;
  created_at: string;
  updated_at: string;
};

/**
 * SELECT * projection. Column names are already snake_case both in the DB
 * and in our Zod schema, so no key transformation is needed.
 */
const REPORT_COLUMNS = "*";

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
  return (data as StoredReport | null) ?? null;
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
  return (data as StoredReport | null) ?? null;
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

/**
 * Upsert a new report. Admin-only — never call from client code.
 * The `domain` unique constraint means a second insert for the same domain
 * will collide; we intentionally let that throw so the caller can surface
 * the "already exists" case.
 */
export async function insertReport(
  domain: string,
  verdict: VerdictReport,
): Promise<StoredReport> {
  const admin = getSupabaseAdmin();
  const row = {
    domain,
    slug: toSlug(domain),
    ...verdict,
  };
  const { data, error } = await admin
    .from("reports")
    .insert(row)
    .select(REPORT_COLUMNS)
    .single();
  if (error) throw error;
  return data as StoredReport;
}

/** Upsert variant that overwrites on domain conflict — used by the seed script. */
export async function upsertReport(
  domain: string,
  verdict: VerdictReport,
): Promise<StoredReport> {
  const admin = getSupabaseAdmin();
  const row = {
    domain,
    slug: toSlug(domain),
    ...verdict,
  };
  const { data, error } = await admin
    .from("reports")
    .upsert(row, { onConflict: "domain" })
    .select(REPORT_COLUMNS)
    .single();
  if (error) throw error;
  return data as StoredReport;
}
