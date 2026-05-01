import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "@/lib/admin/auth";
import {
  upsertScoringWeight,
  logScoringAudit,
  getAllScoringWeights,
} from "@/lib/db/scoring_config";
import { invalidateScoringConfigCache } from "@/lib/normalization/scoring_loader";

const Body = z.object({
  key: z.string().min(1).max(120),
  value: z.number().finite(),
  description: z.string().max(400).optional(),
  reason: z.string().max(400).optional(),
});

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
  const parsed = Body.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues.map((i) => i.message).join("; ") },
      { status: 400 },
    );
  }
  const { key, value, description, reason } = parsed.data;

  try {
    // Capture before-value for the audit row.
    const before = (await getAllScoringWeights()).find((w) => w.key === key);
    await upsertScoringWeight(key, value, description);
    invalidateScoringConfigCache();
    await logScoringAudit({
      actor: "admin",
      scope: "weight",
      change_kind: before ? "update" : "add",
      ref_key: key,
      before_value: before ? { value: before.value } : null,
      after_value: { value },
      reason: reason ?? null,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "upsert failed" },
      { status: 500 },
    );
  }
}
