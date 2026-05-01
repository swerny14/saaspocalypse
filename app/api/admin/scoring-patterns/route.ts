import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import {
  insertScoringPattern,
  setPatternStatus,
  logScoringAudit,
  type ScoringAxis,
  type PatternKind,
} from "@/lib/db/scoring_config";
import { invalidateScoringConfigCache } from "@/lib/normalization/scoring_loader";

const PostBody = z.object({
  axis: z.enum([
    "capital",
    "technical",
    "network",
    "switching",
    "data_moat",
    "regulatory",
    "distribution",
  ]),
  kind: z.enum([
    "capex",
    "capex_exclude",
    "fortress_thesis",
    "distribution_authoritative_domain",
  ]),
  pattern: z.string().min(1).max(400),
  evidence: z.string().max(400).optional(),
  weight: z.number().optional(),
});

const PatchBody = z.object({
  id: z.string().uuid(),
  status: z.enum(["active", "disabled"]),
});

/**
 * Add a new scoring pattern. Validates the regex eagerly so a malformed
 * pattern can't reach the loader. Domain entries skip the regex check.
 */
export async function POST(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = PostBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid input: " + parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  const { axis, kind, pattern, evidence, weight } = parsed.data;

  if (kind !== "distribution_authoritative_domain") {
    try {
      new RegExp(pattern, "i");
    } catch (e) {
      return NextResponse.json(
        { error: `invalid regex: ${e instanceof Error ? e.message : String(e)}` },
        { status: 400 },
      );
    }
  }

  try {
    const row = await insertScoringPattern({
      axis: axis as ScoringAxis,
      kind: kind as PatternKind,
      pattern,
      evidence: evidence ?? null,
      weight: weight ?? 1,
      added_by: "admin",
    });
    invalidateScoringConfigCache();
    await logScoringAudit({
      actor: "admin",
      scope: "pattern",
      change_kind: "add",
      axis: row.axis,
      ref_id: row.id,
      after_value: { kind: row.kind, pattern: row.pattern },
      reason: evidence ?? null,
    });
    return NextResponse.json({ ok: true, id: row.id });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "insert failed" },
      { status: 500 },
    );
  }
}

/**
 * Toggle a pattern's status (active ↔ disabled).
 */
export async function PATCH(req: Request) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "not authorized" }, { status: 403 });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = PatchBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid input" }, { status: 400 });
  }
  const { id, status } = parsed.data;
  try {
    await setPatternStatus(id, status);
    invalidateScoringConfigCache();
    await logScoringAudit({
      actor: "admin",
      scope: "pattern",
      change_kind: status === "disabled" ? "disable" : "update",
      ref_id: id,
      after_value: { status },
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "update failed" },
      { status: 500 },
    );
  }
}
