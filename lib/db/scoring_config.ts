import { getSupabaseAdmin } from "./supabase";
import { wrapDbError } from "./errors";

/**
 * DAL for the calibration framework (Phase 2.6). Three tables:
 *   - scoring_patterns:  regex/domain rows that drive capital + distribution
 *   - scoring_weights:   numeric knobs (aggregate weights, sub-signal weights,
 *                        path thresholds, difficulty multipliers)
 *   - scoring_audit:     append-only log of every calibration change
 *
 * Read paths use the anon client (admin-only RLS but reads through service-role
 * are fine in admin contexts). Write paths use the admin client. The audit log
 * is append-only — no UPDATE / DELETE helpers.
 */

export type PatternKind =
  | "capex"
  | "fortress_thesis"
  | "capex_exclude"
  | "distribution_authoritative_domain";

export type ScoringAxis =
  | "capital"
  | "technical"
  | "network"
  | "switching"
  | "data_moat"
  | "regulatory"
  | "distribution";

export type ScoringPatternRow = {
  id: string;
  axis: ScoringAxis;
  kind: PatternKind;
  pattern: string;
  weight: number;
  status: "active" | "disabled";
  evidence: string | null;
  added_by: string | null;
  added_at: string;
  updated_at: string;
};

export type ScoringWeightRow = {
  key: string;
  value: number;
  description: string | null;
  updated_at: string;
};

export type ScoringAuditRow = {
  id: string;
  ts: string;
  actor: string | null;
  scope: "pattern" | "weight" | "recompute" | "sweep";
  change_kind: string;
  axis: ScoringAxis | null;
  ref_id: string | null;
  ref_key: string | null;
  before_value: unknown;
  after_value: unknown;
  reason: string | null;
  reports_moved: number | null;
};

/* ──────────────────────────── reads ──────────────────────────── */

export async function getAllScoringPatterns(): Promise<ScoringPatternRow[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("scoring_patterns")
    .select("*")
    .order("axis", { ascending: true })
    .order("kind", { ascending: true })
    .order("pattern", { ascending: true });
  if (error) throw wrapDbError(error, "scoring_patterns getAll");
  return (data ?? []) as ScoringPatternRow[];
}

export async function getActiveScoringPatterns(): Promise<ScoringPatternRow[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("scoring_patterns")
    .select("*")
    .eq("status", "active");
  if (error) throw wrapDbError(error, "scoring_patterns getActive");
  return (data ?? []) as ScoringPatternRow[];
}

export async function getAllScoringWeights(): Promise<ScoringWeightRow[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("scoring_weights")
    .select("*")
    .order("key", { ascending: true });
  if (error) throw wrapDbError(error, "scoring_weights getAll");
  return (data ?? []) as ScoringWeightRow[];
}

export async function getRecentAudit(limit = 50): Promise<ScoringAuditRow[]> {
  const sb = getSupabaseAdmin();
  const { data, error } = await sb
    .from("scoring_audit")
    .select("*")
    .order("ts", { ascending: false })
    .limit(limit);
  if (error) throw wrapDbError(error, "scoring_audit recent");
  return (data ?? []) as ScoringAuditRow[];
}

/* ─────────────────────────── writes ──────────────────────────── */

export type InsertPatternInput = {
  axis: ScoringAxis;
  kind: PatternKind;
  pattern: string;
  weight?: number;
  status?: ScoringPatternRow["status"];
  evidence?: string | null;
  added_by?: string | null;
};

export async function insertScoringPattern(
  input: InsertPatternInput,
): Promise<ScoringPatternRow> {
  const sb = getSupabaseAdmin();
  const row = {
    axis: input.axis,
    kind: input.kind,
    pattern: input.pattern,
    weight: input.weight ?? 1.0,
    status: input.status ?? "active",
    evidence: input.evidence ?? null,
    added_by: input.added_by ?? "admin",
  };
  const { data, error } = await sb
    .from("scoring_patterns")
    .insert(row)
    .select("*")
    .single();
  if (error) throw wrapDbError(error, "scoring_patterns insert");
  return data as ScoringPatternRow;
}

export async function setPatternStatus(
  id: string,
  status: "active" | "disabled",
): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb
    .from("scoring_patterns")
    .update({ status })
    .eq("id", id);
  if (error) throw wrapDbError(error, "scoring_patterns setStatus");
}

export async function upsertScoringWeight(
  key: string,
  value: number,
  description?: string | null,
): Promise<void> {
  const sb = getSupabaseAdmin();
  const row: { key: string; value: number; description?: string | null } = {
    key,
    value,
  };
  if (description !== undefined) row.description = description;
  const { error } = await sb
    .from("scoring_weights")
    .upsert(row, { onConflict: "key" });
  if (error) throw wrapDbError(error, "scoring_weights upsert");
}

/* ────────────────────────── audit log ────────────────────────── */

export type AuditInput = {
  actor?: string | null;
  scope: ScoringAuditRow["scope"];
  change_kind: string;
  axis?: ScoringAxis | null;
  ref_id?: string | null;
  ref_key?: string | null;
  before_value?: unknown;
  after_value?: unknown;
  reason?: string | null;
  reports_moved?: number | null;
};

export async function logScoringAudit(input: AuditInput): Promise<void> {
  const sb = getSupabaseAdmin();
  const { error } = await sb.from("scoring_audit").insert({
    actor: input.actor ?? "admin",
    scope: input.scope,
    change_kind: input.change_kind,
    axis: input.axis ?? null,
    ref_id: input.ref_id ?? null,
    ref_key: input.ref_key ?? null,
    before_value: input.before_value ?? null,
    after_value: input.after_value ?? null,
    reason: input.reason ?? null,
    reports_moved: input.reports_moved ?? null,
  });
  if (error) {
    // Audit logging must never block. Log to stderr and move on.
    console.error("[scoring_audit] insert failed:", error);
  }
}
